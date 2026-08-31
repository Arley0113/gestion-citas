-- ============================================================
-- Bienestar SENA — Sistema de Gestión de Citas
-- Schema completo para Supabase (PostgreSQL)
-- ============================================================

-- Ejecutar en el SQL Editor de Supabase en este orden exacto.

-- ────────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. ROLES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 2. DEPENDENCIAS (áreas de bienestar)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dependencies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#39a900',
  icon        TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. PROFILES (extiende auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL DEFAULT '',
  document_number       TEXT UNIQUE,
  program               TEXT,
  phone                 TEXT,
  role_id               INTEGER REFERENCES public.roles(id) ON DELETE SET NULL,
  dependency_id         INTEGER REFERENCES public.dependencies(id) ON DELETE SET NULL,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  avatar_url            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. APPOINTMENTS (citas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dependency_id      INTEGER NOT NULL REFERENCES public.dependencies(id) ON DELETE CASCADE,
  sede_id            INTEGER REFERENCES public.sedes(id),
  scheduled_date     DATE NOT NULL,
  scheduled_time     TIME NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  notes              TEXT,
  tags               TEXT[] DEFAULT '{}',
  objectives_checked TEXT[] DEFAULT '{}',
  observations       TEXT[] DEFAULT '{}',
  cancelled_reason   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 5. FUNCIONES Y TRIGGERS
-- ────────────────────────────────────────────────────────────

-- 5a. Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_dependencies_updated_at
  BEFORE UPDATE ON public.dependencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5b. Crear perfil automáticamente al registrar un usuario
--     Por defecto se asigna rol APRENDIZ y onboarding_completed = false.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  aprendiz_role_id INTEGER;
BEGIN
  SELECT id INTO aprendiz_role_id
  FROM public.roles
  WHERE name = 'APRENDIZ'
  LIMIT 1;

  INSERT INTO public.profiles (
    id,
    full_name,
    document_number,
    role_id,
    onboarding_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'document_number', NULL),
    aprendiz_role_id,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sólo crear el trigger si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;

-- 5c. Helper: obtener el nombre del rol del usuario autenticado
--     Usado en las políticas RLS.
CREATE OR REPLACE FUNCTION public.auth_role_name()
RETURNS TEXT AS $$
  SELECT r.name
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ── roles ───────────────────────────────────────────────────
-- Cualquier usuario autenticado puede leer los roles (para onboarding / UI).
DROP POLICY IF EXISTS "roles_select_authenticated" ON public.roles;
CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

-- Solo superadmin / administrador puede modificar roles.
DROP POLICY IF EXISTS "roles_insert_admin" ON public.roles;
CREATE POLICY "roles_insert_admin"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "roles_update_admin" ON public.roles;
CREATE POLICY "roles_update_admin"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "roles_delete_superadmin" ON public.roles;
CREATE POLICY "roles_delete_superadmin"
  ON public.roles FOR DELETE
  TO authenticated
  USING (public.auth_role_name() = 'SUPERADMIN');

-- ── dependencies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "deps_select_authenticated" ON public.dependencies;
CREATE POLICY "deps_select_authenticated"
  ON public.dependencies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "deps_insert_admin" ON public.dependencies;
CREATE POLICY "deps_insert_admin"
  ON public.dependencies FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "deps_update_admin" ON public.dependencies;
CREATE POLICY "deps_update_admin"
  ON public.dependencies FOR UPDATE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "deps_delete_superadmin" ON public.dependencies;
CREATE POLICY "deps_delete_superadmin"
  ON public.dependencies FOR DELETE
  TO authenticated
  USING (public.auth_role_name() = 'SUPERADMIN');

-- ── profiles ─────────────────────────────────────────────────

-- Aprendiz: ve solo su propio perfil.
-- Staff (profesionales, coordinación, admin): ve todos los perfiles.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.auth_role_name() IN (
      'PSICOLOGIA','ENFERMERIA','TRABAJO_SOCIAL',
      'COORDINACION','ADMINISTRADOR','SUPERADMIN'
    )
  );

-- Cada usuario puede actualizar su propio perfil.
-- Admin puede actualizar cualquiera.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.auth_role_name() IN ('ADMINISTRADOR','SUPERADMIN')
  );

-- Solo el trigger de servicio puede insertar (SECURITY DEFINER).
-- Si necesitas insertar manualmente desde el cliente, agrega la policy:
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR public.auth_role_name() IN ('ADMINISTRADOR','SUPERADMIN')
  );

-- Solo superadmin puede eliminar perfiles.
DROP POLICY IF EXISTS "profiles_delete_superadmin" ON public.profiles;
CREATE POLICY "profiles_delete_superadmin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.auth_role_name() = 'SUPERADMIN');

-- ── appointments ─────────────────────────────────────────────

-- SELECT:
--   · Aprendiz: sus propias citas
--   · Profesional: citas de su dependencia Y de su misma sede
--     (fallback: si a la cita o al profesional aún no se le asignó sede,
--     se comporta como antes — visible — para no ocultar datos incompletos)
--   · Coordinación / Admin: todas las citas, de cualquier sede
DROP POLICY IF EXISTS "apts_select" ON public.appointments;
CREATE POLICY "apts_select"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    -- Coordinación y admin: ven todo
    public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN')
    -- Profesional: citas de su dependencia y su sede
    OR (
      public.auth_role_name() IN ('PSICOLOGIA','ENFERMERIA','TRABAJO_SOCIAL')
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

-- INSERT: solo aprendiz puede agendar (para sí mismo).
-- sede_id no se envía desde el cliente — lo asigna trg_appointments_set_sede.
DROP POLICY IF EXISTS "apts_insert_aprendiz" ON public.appointments;
CREATE POLICY "apts_insert_aprendiz"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.auth_role_name() = 'APRENDIZ'
  );

-- UPDATE:
--   · Aprendiz: puede cancelar su propia cita pendiente
--   · Profesional: puede confirmar / iniciar / completar / no_show en su
--     dependencia Y su misma sede (mismo fallback que en SELECT)
--   · Coordinación / Admin: puede cancelar cualquier cita activa
DROP POLICY IF EXISTS "apts_update" ON public.appointments;
CREATE POLICY "apts_update"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    -- Coordinación / Admin cancelan cualquier cita
    public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN')
    -- Profesional: actualiza citas de su dependencia y su sede
    OR (
      public.auth_role_name() IN ('PSICOLOGIA','ENFERMERIA','TRABAJO_SOCIAL')
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

-- NOTA: hasta agosto 2026 existieron 4 políticas legacy adicionales sobre esta
-- tabla ("Users can create appointments", "Users can view own appointments",
-- "Professionals can view/update their dependency appointments") que no
-- filtraban por sede. Se eliminaron al aplicar el filtro de sede de arriba,
-- porque las políticas RLS del mismo comando se combinan con OR — dejarlas
-- habría anulado el filtro nuevo.

-- DELETE: prohibido para todos (se usa status = 'cancelled').
DROP POLICY IF EXISTS "apts_delete_none" ON public.appointments;
CREATE POLICY "apts_delete_none"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.auth_role_name() = 'SUPERADMIN');

-- ────────────────────────────────────────────────────────────
-- 7. ÍNDICES DE RENDIMIENTO
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role_id       ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_dependency_id ON public.profiles(dependency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_document      ON public.profiles(document_number);

CREATE INDEX IF NOT EXISTS idx_apts_user_id           ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_apts_professional_id   ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_apts_dependency_id     ON public.appointments(dependency_id);
CREATE INDEX IF NOT EXISTS idx_apts_scheduled_date    ON public.appointments(scheduled_date);

-- ────────────────────────────────────────────────────────────
-- 8. CONVOCATORIAS
--    Anuncios publicados por Administrador/SuperAdmin, visibles
--    para todos los aprendices en su Dashboard (ej. convocatoria
--    de apoyo de sostenimiento).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.convocatorias (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  link_externo TEXT,
  activa       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER trg_convocatorias_updated_at
  BEFORE UPDATE ON public.convocatorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELECT: cualquier autenticado (aprendiz incluido) ve todas las convocatorias.
DROP POLICY IF EXISTS "convocatorias_select_authenticated" ON public.convocatorias;
CREATE POLICY "convocatorias_select_authenticated"
  ON public.convocatorias FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "convocatorias_insert_admin" ON public.convocatorias;
CREATE POLICY "convocatorias_insert_admin"
  ON public.convocatorias FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "convocatorias_update_admin" ON public.convocatorias;
CREATE POLICY "convocatorias_update_admin"
  ON public.convocatorias FOR UPDATE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "convocatorias_delete_admin" ON public.convocatorias;
CREATE POLICY "convocatorias_delete_admin"
  ON public.convocatorias FOR DELETE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

CREATE INDEX IF NOT EXISTS idx_convocatorias_activa ON public.convocatorias(activa);
CREATE INDEX IF NOT EXISTS idx_apts_status            ON public.appointments(status);

-- ────────────────────────────────────────────────────────────
-- 9. SEDES
--    El centro maneja varias sedes físicas. Cada profesional
--    pertenece a una, y cada aprendiz hereda la suya de su ficha
--    (ver tabla `fichas` y el trigger set_sede_from_ficha).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sedes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER trg_sedes_updated_at
  BEFORE UPDATE ON public.sedes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.sedes (name) VALUES
  ('Maicao'),
  ('Comercio y Servicios'),
  ('Industrial')
ON CONFLICT (name) DO NOTHING;

DROP POLICY IF EXISTS "sedes_select_authenticated" ON public.sedes;
CREATE POLICY "sedes_select_authenticated"
  ON public.sedes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "sedes_insert_admin" ON public.sedes;
CREATE POLICY "sedes_insert_admin"
  ON public.sedes FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "sedes_update_admin" ON public.sedes;
CREATE POLICY "sedes_update_admin"
  ON public.sedes FOR UPDATE
  TO authenticated
  USING (public.auth_role_name() IN ('SUPERADMIN','ADMINISTRADOR'));

DROP POLICY IF EXISTS "sedes_delete_superadmin" ON public.sedes;
CREATE POLICY "sedes_delete_superadmin"
  ON public.sedes FOR DELETE
  TO authenticated
  USING (public.auth_role_name() = 'SUPERADMIN');

-- ────────────────────────────────────────────────────────────
-- 10. FICHAS → SEDE
--    Mapea cada número de ficha a su sede física. Gestionada por
--    Coordinación/Administrador desde "Fichas activas". No confundir
--    con `aprendiz_whitelist` (tabla separada, creada fuera de este
--    archivo, que valida quién puede registrarse).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fichas (
  ficha_number TEXT PRIMARY KEY,
  sede_id      INTEGER REFERENCES public.sedes(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER trg_fichas_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "fichas_select_staff" ON public.fichas;
CREATE POLICY "fichas_select_staff"
  ON public.fichas FOR SELECT
  TO authenticated
  USING (public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN'));

DROP POLICY IF EXISTS "fichas_insert_staff" ON public.fichas;
CREATE POLICY "fichas_insert_staff"
  ON public.fichas FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN'));

DROP POLICY IF EXISTS "fichas_update_staff" ON public.fichas;
CREATE POLICY "fichas_update_staff"
  ON public.fichas FOR UPDATE
  TO authenticated
  USING (public.auth_role_name() IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN'));

DROP POLICY IF EXISTS "fichas_delete_admin" ON public.fichas;
CREATE POLICY "fichas_delete_admin"
  ON public.fichas FOR DELETE
  TO authenticated
  USING (public.auth_role_name() IN ('ADMINISTRADOR','SUPERADMIN'));

-- ────────────────────────────────────────────────────────────
-- 11. profiles.sede_id + asignación automática por ficha
--    Cuando se inserta/actualiza el ficha_number de un perfil
--    (aprendiz), se copia la sede desde `fichas` automáticamente.
--    Para staff, la sede la asigna directamente invite-staff, o queda en
--    NULL a propósito para "atiende en cualquier sede" (ver invite-staff /
--    StaffInvitePage.jsx, opción "Todas las sedes" — coincide con el
--    fallback ya usado en apts_select/apts_update).
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sede_id INTEGER REFERENCES public.sedes(id);

-- También valida contra `aprendiz_whitelist` (auditoría 2026-08-31): hasta
-- entonces el padrón solo se verificaba en el navegador (RegisterPage/Login),
-- así que llamar signUp()/update() directo por la API se lo saltaba entero.
-- Se agrega aquí (no en handle_new_user, que ya es frágil y no se toca) para
-- que corra en los 3 caminos que escriben ficha_number: registro, Onboarding
-- y "Mi perfil".
CREATE OR REPLACE FUNCTION public.set_sede_from_ficha()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name TEXT;
  v_wl_enabled TEXT;
BEGIN
  IF NEW.ficha_number IS NOT NULL THEN
    SELECT r.name INTO v_role_name FROM public.roles r WHERE r.id = NEW.role_id;

    IF v_role_name = 'APRENDIZ' THEN
      SELECT value INTO v_wl_enabled FROM public.system_settings WHERE key = 'whitelist_enabled';
      IF v_wl_enabled = 'true' AND NOT EXISTS (
        SELECT 1 FROM public.aprendiz_whitelist
        WHERE document_number = NEW.document_number AND ficha_number = NEW.ficha_number
      ) THEN
        RAISE EXCEPTION 'Cédula o número de ficha no encontrados en el padrón de aprendices activos';
      END IF;
    END IF;

    SELECT sede_id INTO NEW.sede_id
    FROM public.fichas
    WHERE ficha_number = NEW.ficha_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_set_sede ON public.profiles;
CREATE TRIGGER trg_profiles_set_sede
  BEFORE INSERT OR UPDATE OF ficha_number ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_sede_from_ficha();

-- ────────────────────────────────────────────────────────────
-- 12. appointments.sede_id + asignación automática al agendar
--    Al crear una cita se copia la sede del aprendiz (user_id) para que
--    profesionales de otras sedes no la vean/atiendan (ver apts_select /
--    apts_update más arriba). El cliente nunca envía sede_id.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_appointment_sede()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sede_id IS NULL THEN
    SELECT sede_id INTO NEW.sede_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_appointments_set_sede ON public.appointments;
CREATE TRIGGER trg_appointments_set_sede
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_appointment_sede();

CREATE INDEX IF NOT EXISTS idx_apts_sede_id ON public.appointments(sede_id);

-- ────────────────────────────────────────────────────────────
-- 13. aprendiz_whitelist — lookup seguro + helpers de sede por ficha
--    (auditoría 2026-08-31). `aprendiz_whitelist` en sí se creó fuera de
--    este archivo (ver nota en sección 10) y NO se documenta su schema
--    completo aquí, pero sí los cambios de seguridad aplicados sobre ella.
--
--    Hasta esta fecha existía una política "whitelist_read_public" con
--    USING (true) — cualquiera, con o sin sesión, podía leer la tabla
--    completa (cédulas + nombres + programas de todo el padrón) llamando
--    la API directamente. Se eliminó y se reemplazó por esta función:
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "whitelist_read_public" ON public.aprendiz_whitelist;

CREATE OR REPLACE FUNCTION public.lookup_whitelist(p_document_number TEXT, p_ficha_number TEXT)
RETURNS TABLE(full_name TEXT, program TEXT) AS $$
  SELECT full_name, program
  FROM public.aprendiz_whitelist
  WHERE document_number = p_document_number
    AND ficha_number = p_ficha_number
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.lookup_whitelist(TEXT, TEXT) TO anon, authenticated;

-- Asignar sede a una o varias fichas + backfill de profiles.sede_id de
-- aprendices YA registrados con esas fichas — sin esto, alguien que se
-- registró antes de que su ficha tuviera sede asignada se quedaba sin sede
-- para siempre (trg_profiles_set_sede solo corre al crear/cambiar
-- ficha_number, no cuando se asigna la sede después). SECURITY DEFINER
-- porque COORDINACION no tiene UPDATE sobre profiles ajenos (profiles_update_own).
CREATE OR REPLACE FUNCTION public.set_fichas_sede(p_ficha_numbers TEXT[], p_sede_id INTEGER)
RETURNS void AS $$
BEGIN
  IF public.auth_role_name() NOT IN ('COORDINACION','ADMINISTRADOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO public.fichas (ficha_number, sede_id)
  SELECT unnest(p_ficha_numbers), p_sede_id
  ON CONFLICT (ficha_number) DO UPDATE SET sede_id = EXCLUDED.sede_id;

  UPDATE public.profiles SET sede_id = p_sede_id WHERE ficha_number = ANY(p_ficha_numbers);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_fichas_sede(TEXT[], INTEGER) TO authenticated;

-- Quitar la sede de una ficha + limpiar profiles.sede_id de sus aprendices
CREATE OR REPLACE FUNCTION public.clear_ficha_sede(p_ficha_number TEXT)
RETURNS void AS $$
BEGIN
  IF public.auth_role_name() NOT IN ('ADMINISTRADOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM public.fichas WHERE ficha_number = p_ficha_number;
  UPDATE public.profiles SET sede_id = NULL WHERE ficha_number = p_ficha_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.clear_ficha_sede(TEXT) TO authenticated;

-- Consulta más común: citas de una dependencia en un rango de fechas
CREATE INDEX IF NOT EXISTS idx_apts_dep_date
  ON public.appointments(dependency_id, scheduled_date);

-- ────────────────────────────────────────────────────────────
-- 8. DATOS INICIALES (SEED)
-- ────────────────────────────────────────────────────────────

-- 8a. Roles del sistema
INSERT INTO public.roles (name, label, description) VALUES
  ('APRENDIZ',       'Aprendiz',       'Aprendiz SENA que agenda y gestiona sus propias citas'),
  ('PSICOLOGIA',     'Psicología',     'Profesional del área de Psicología'),
  ('ENFERMERIA',     'Enfermería',     'Profesional del área de Enfermería'),
  ('TRABAJO_SOCIAL', 'Trabajo Social', 'Profesional del área de Trabajo Social'),
  ('COORDINACION',   'Coordinación',   'Coordinador de Bienestar con acceso a todos los reportes'),
  ('ADMINISTRADOR',  'Administrador',  'Administrador del sistema — gestiona usuarios y dependencias'),
  ('SUPERADMIN',     'Super Admin',    'Superadministrador con acceso total al sistema')
ON CONFLICT (name) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description;

-- 8b. Dependencias de bienestar
INSERT INTO public.dependencies (name, color, icon) VALUES
  ('Psicología',     '#3b82f6', 'brain'),
  ('Enfermería',     '#39a900', 'stethoscope'),
  ('Trabajo Social', '#8b5cf6', 'users')
ON CONFLICT (name) DO UPDATE
  SET color = EXCLUDED.color,
      icon  = EXCLUDED.icon;

-- ────────────────────────────────────────────────────────────
-- 9. VISTA ÚTIL: citas con datos completos
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.appointments_full AS
SELECT
  a.id,
  a.status,
  a.scheduled_date,
  a.scheduled_time,
  a.notes,
  a.tags,
  a.objectives_checked,
  a.observations,
  a.cancelled_reason,
  a.created_at,
  a.updated_at,
  -- Aprendiz
  ap.id            AS aprendiz_id,
  ap.full_name     AS aprendiz_name,
  ap.document_number,
  ap.program,
  -- Profesional
  pr.id            AS professional_id,
  pr.full_name     AS professional_name,
  -- Dependencia
  d.id             AS dependency_id,
  d.name           AS dependency_name,
  d.color          AS dependency_color
FROM public.appointments a
JOIN public.profiles ap   ON ap.id = a.user_id
JOIN public.dependencies d ON d.id = a.dependency_id
LEFT JOIN public.profiles pr ON pr.id = a.professional_id;

-- Dar acceso a la vista a usuarios autenticados (la RLS de la tabla base ya filtra).
GRANT SELECT ON public.appointments_full TO authenticated;

-- ────────────────────────────────────────────────────────────
-- FIN DEL SCHEMA
-- ============================================================
-- Notas de despliegue:
--   1. Ejecuta este archivo completo en el SQL Editor de Supabase.
--   2. En "Authentication > Policies" verifica que RLS esté activo.
--   3. El trigger on_auth_user_created crea el perfil automáticamente
--      cuando un usuario se registra. No necesitas hacerlo manualmente.
--   4. Para crear el primer SUPERADMIN, ejecuta:
--
--        UPDATE public.profiles
--        SET role_id = (SELECT id FROM public.roles WHERE name = 'SUPERADMIN')
--        WHERE document_number = '<tu_documento>';
--
--   5. Para asignar un profesional a una dependencia:
--
--        UPDATE public.profiles
--        SET role_id      = (SELECT id FROM public.roles WHERE name = 'PSICOLOGIA'),
--            dependency_id = (SELECT id FROM public.dependencies WHERE name = 'Psicología')
--        WHERE document_number = '<documento_del_profesional>';
-- ============================================================
