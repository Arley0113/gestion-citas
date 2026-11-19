-- ════════════════════════════════════════════════════════════
-- ROL APOYO — políticas RLS para producción
-- Supabase Dashboard → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════
-- El rol APOYO (id 25) y la dependencia "Apoyos" (id 13) ya fueron
-- creados vía API. Este script solo agrega el rol a las políticas
-- RLS que necesita:
--   · profiles   → ver perfiles (para mostrar al aprendiz en sus citas)
--   · appointments → ver/actualizar citas de su dependencia
--   · convocatorias → crear/editar/eliminar los apoyos (links)
--
-- Opcional — revisar las policies actuales de appointments antes de
-- reemplazarlas (deben coincidir con database/schema.sql):
--   SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy WHERE polrelid = 'public.appointments'::regclass;
-- ════════════════════════════════════════════════════════════

-- 1. profiles: el APOYO ve todos los perfiles (como el resto del staff)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.auth_role_name() IN (
      'PSICOLOGIA','ENFERMERIA','TRABAJO_SOCIAL','APOYO',
      'COORDINACION','ADMINISTRADOR','SUPERADMIN'
    )
  );

-- 2. appointments SELECT: APOYO ve las citas de su dependencia y su sede
DROP POLICY IF EXISTS "apts_select" ON public.appointments;
CREATE POLICY "apts_select"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    -- Coordinación y admin: ven todo
    public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN')
    -- Profesional / APOYO: citas de su dependencia y su sede
    OR (
      public.auth_role_name() IN ('PSICOLOGIA','ENFERMERIA','TRABAJO_SOCIAL','APOYO')
      AND dependency_id = (
        SELECT dependency_id FROM public.profiles WHERE id = auth.uid()
      )
      AND (
        sede_id IS NULL
        OR (SELECT sede_id FROM public.profiles WHERE id = auth.uid()) IS NULL
        OR sede_id = (SELECT sede_id FROM public.profiles WHERE id = auth.uid())
      )
    )
    -- Aprendiz: solo sus citas
    OR user_id = auth.uid()
  );

-- 3. appointments UPDATE: APOYO confirma/inicia/completa en su dependencia
DROP POLICY IF EXISTS "apts_update" ON public.appointments;
CREATE POLICY "apts_update"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    -- Coordinación / Admin cancelan cualquier cita
    public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN')
    -- Profesional / APOYO: actualiza citas de su dependencia y su sede
    OR (
      public.auth_role_name() IN ('PSICOLOGIA','ENFERMERIA','TRABAJO_SOCIAL','APOYO')
      AND dependency_id = (
        SELECT dependency_id FROM public.profiles WHERE id = auth.uid()
      )
      AND (
        sede_id IS NULL
        OR (SELECT sede_id FROM public.profiles WHERE id = auth.uid()) IS NULL
        OR sede_id = (SELECT sede_id FROM public.profiles WHERE id = auth.uid())
      )
    )
    -- Aprendiz: solo cancela la suya
    OR (user_id = auth.uid() AND public.auth_role_name() = 'APRENDIZ')
  );

-- 4. convocatorias: el APOYO gestiona los apoyos (links) como el admin
DROP POLICY IF EXISTS "convocatorias_insert_admin" ON public.convocatorias;
CREATE POLICY "convocatorias_insert_admin"
  ON public.convocatorias FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR','APOYO'));

DROP POLICY IF EXISTS "convocatorias_update_admin" ON public.convocatorias;
CREATE POLICY "convocatorias_update_admin"
  ON public.convocatorias FOR UPDATE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR','APOYO'));

DROP POLICY IF EXISTS "convocatorias_delete_admin" ON public.convocatorias;
CREATE POLICY "convocatorias_delete_admin"
  ON public.convocatorias FOR DELETE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR','APOYO'));

-- Listo. Verificación:
--   SELECT id, name FROM public.roles WHERE name = 'APOYO';      -- 1 fila
--   SELECT id, name FROM public.dependencies WHERE name = 'Apoyos'; -- 1 fila
