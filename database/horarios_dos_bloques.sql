-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: horarios de atención en DOS bloques por día (mañana / tarde)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase (proyecto hopjfppngueuhwuakzwf).
-- Es idempotente: se puede correr más de una vez sin daño.
--
-- 1) Reemplaza la función get_dependency_slots para que lea el segundo bloque
--    ({active2, start2, end2}) además del primero ({active, start, end}).
--    Retrocompatible: los horarios guardados antes de esta migración no traen
--    el segundo bloque y se leen como inactivo. Además, la función solo
--    devuelve horas dentro de las ventanas de agendamiento del aprendiz
--    (08:00-11:00 y 14:00-17:00), aunque un horario guardado cubra más.
--
-- 2) (Opcional) Convierte los horarios ya guardados al esquema de dos bloques
--    aprobado: mañana 08:00-11:00 y tarde 14:00-17:00, manteniendo el
--    `active` de cada día. Descomentar el UPDATE al final si se quiere
--    migrar todo el personal de una vez.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dependency_slots(p_dependency_id INTEGER, p_sede_id INTEGER, p_date DATE)
RETURNS TABLE(slot_time TEXT) AS $$
DECLARE
  v_day_key TEXT;
  rec RECORD;
  -- PG no anida arrays (text[][] = text[]): por eso los bloques se guardan en
  -- dos arrays paralelos de inicio/fin y se recorren por índice.
  v_starts TEXT[];
  v_ends   TEXT[];
  v_i      INTEGER;
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

    v_starts := '{}';
    v_ends   := '{}';
    IF rec.day ->> 'start' IS NOT NULL AND rec.day ->> 'end' IS NOT NULL THEN
      v_starts := v_starts || (rec.day ->> 'start');
      v_ends   := v_ends   || (rec.day ->> 'end');
    END IF;
    IF COALESCE((rec.day ->> 'active2')::boolean, false)
       AND rec.day ->> 'start2' IS NOT NULL AND rec.day ->> 'end2' IS NOT NULL THEN
      v_starts := v_starts || (rec.day ->> 'start2');
      v_ends   := v_ends   || (rec.day ->> 'end2');
    END IF;

    FOR v_i IN 1 .. COALESCE(array_length(v_starts, 1), 0) LOOP
      v_start_min := extract(hour from v_starts[v_i]::time)::int * 60 + extract(minute from v_starts[v_i]::time)::int;
      v_end_min   := extract(hour from v_ends[v_i]::time)::int   * 60 + extract(minute from v_ends[v_i]::time)::int;
      v_dur := rec.dur;
      v_cur := v_start_min;
      WHILE v_cur + v_dur <= v_end_min LOOP
        v_out := array_append(v_out, lpad((v_cur/60)::text,2,'0') || ':' || lpad((v_cur%60)::text,2,'0'));
        v_cur := v_cur + v_dur;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN QUERY
    SELECT DISTINCT t.slot
    FROM unnest(v_out) AS t(slot)
    WHERE (t.slot::time >= '08:00' AND t.slot::time < '11:00')
       OR (t.slot::time >= '14:00' AND t.slot::time < '17:00')
    ORDER BY 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_dependency_slots(INTEGER, INTEGER, DATE) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- (OPCIONAL) Migrar los horarios ya guardados al esquema de dos bloques:
-- mañana 08:00-11:00 y tarde 14:00-17:00. Conserva el `active` de cada día
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
            'end2',    '17:00'
          )
        ELSE
          v || jsonb_build_object(
            'active2', false,
            'start2',  '14:00',
            'end2',    '17:00'
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
