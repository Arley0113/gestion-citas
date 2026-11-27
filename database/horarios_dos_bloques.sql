-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: horarios de atención en DOS bloques por día (mañana / tarde)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase (proyecto hopjfppngueuhwuakzwf).
-- Es idempotente: se puede correr más de una vez sin daño.
--
-- 1) Reemplaza la función get_dependency_slots para que lea el segundo bloque
--    ({active2, start2, end2}) además del primero ({active, start, end}).
--    Retrocompatible: los horarios guardados antes de esta migración no traen
--    el segundo bloque y se leen como inactivo.
--
-- 2) (Opcional) Convierte los horarios ya guardados al esquema de dos bloques
--    aprobado: mañana 08:00-11:00 y tarde 14:00-16:00, manteniendo el
--    `active` de cada día. Descomentar el UPDATE al final si se quiere
--    migrar todo el personal de una vez.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dependency_slots(p_dependency_id INTEGER, p_sede_id INTEGER, p_date DATE)
RETURNS TABLE(slot_time TEXT) AS $$
DECLARE
  v_day_key TEXT;
  rec RECORD;
  v_blocks TEXT[][];
  v_block TEXT[];
  v_start_min INTEGER;
  v_end_min INTEGER;
  v_dur INTEGER;
  v_cur INTEGER;
  v_out TEXT[] := '{}';
BEGIN
  v_day_key := (ARRAY['domingo','lunes','martes','miercoles','jueves','viernes','sabado'])[extract(dow from p_date)::int + 1];

  FOR rec IN
    SELECT ps.schedule -> v_day_key AS day,
           COALESCE(ps.duration_minutes, 30)     AS dur
    FROM public.professional_schedules ps
    JOIN public.profiles p ON p.id = ps.professional_id
    WHERE p.dependency_id = p_dependency_id
      AND (p.sede_id IS NULL OR p_sede_id IS NULL OR p.sede_id = p_sede_id)
  LOOP
    CONTINUE WHEN rec.day IS NULL OR (rec.day ->> 'active')::boolean IS NOT TRUE;

    v_blocks := ARRAY[]::TEXT[][];
    IF rec.day ->> 'start' IS NOT NULL AND rec.day ->> 'end' IS NOT NULL THEN
      v_blocks := array_append(v_blocks, ARRAY[rec.day ->> 'start', rec.day ->> 'end']);
    END IF;
    IF COALESCE((rec.day ->> 'active2')::boolean, false)
       AND rec.day ->> 'start2' IS NOT NULL AND rec.day ->> 'end2' IS NOT NULL THEN
      v_blocks := array_append(v_blocks, ARRAY[rec.day ->> 'start2', rec.day ->> 'end2']);
    END IF;

    FOREACH v_block IN ARRAY v_blocks LOOP
      v_start_min := extract(hour from v_block[1]::time)::int * 60 + extract(minute from v_block[1]::time)::int;
      v_end_min   := extract(hour from v_block[2]::time)::int   * 60 + extract(minute from v_block[2]::time)::int;
      v_dur := rec.dur;
      v_cur := v_start_min;
      WHILE v_cur + v_dur <= v_end_min LOOP
        v_out := array_append(v_out, lpad((v_cur/60)::text,2,'0') || ':' || lpad((v_cur%60)::text,2,'0'));
        v_cur := v_cur + v_dur;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT DISTINCT unnest(v_out) ORDER BY 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_dependency_slots(INTEGER, INTEGER, DATE) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- (OPCIONAL) Migrar los horarios ya guardados al esquema de dos bloques:
-- mañana 08:00-11:00 y tarde 14:00-16:00. Conserva el `active` de cada día
-- (los sábados siguen inactivos). Comentar este bloque si cada profesional
-- debe configurar sus bloques manualmente en "Mis horarios".
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.professional_schedules
SET schedule = (
  SELECT COALESCE(
    jsonb_object_agg(
      k,
      CASE
        WHEN (v ->> 'active')::boolean IS TRUE THEN
          v || jsonb_build_object(
            'start',   '08:00',
            'end',     '11:00',
            'active2', true,
            'start2',  '14:00',
            'end2',    '16:00'
          )
        ELSE
          v || jsonb_build_object(
            'active2', false,
            'start2',  '14:00',
            'end2',    '16:00'
          )
      END
    ),
    '{}'::jsonb
  )
  FROM jsonb_each(schedule) AS entries(k, v)
),
updated_at = now()
WHERE schedule IS NOT NULL
  AND NOT (schedule -> 'lunes' ? 'active2');
