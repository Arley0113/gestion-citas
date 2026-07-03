# Bienestar SENA — Gestión de Citas

## Proyecto
Sistema de agendamiento de citas para el área de Bienestar del SENA. Ruta: `F:\gestion-citas`.

## Stack
- **Frontend:** React 19 + Vite + React Router v6
- **Backend/DB:** Supabase (Auth + PostgreSQL) — proyecto `hopjfppngueuhwuakzwf`
- **UI libs:** Recharts, date-fns, Lucide, Sonner
- **Env:** `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

## Roles del sistema (7)
| Rol | Ruta home | Nivel |
|---|---|---|
| APRENDIZ | /dashboard | Básico |
| PSICOLOGIA / ENFERMERIA / TRABAJO_SOCIAL | /professional | Profesional |
| COORDINACION | /coordination | Coordinación |
| ADMINISTRADOR | /admin | Admin (sin system perms) |
| SUPERADMIN | /admin | Total |

## RBAC
- Constantes: `src/shared/rbac/permissions.js` — exporta `P`, `ROLE_PERMISSIONS`, `ROLE_LABELS`, `ALL_ROLES`, `PERMISSION_GROUPS`
- Hook: `src/shared/rbac/usePermissions.js` — `const { can, cannot, hasAny, hasAll, isAprendiz, isProfessional } = usePermissions()`
- Componente: `src/shared/rbac/Permission.jsx` — `<Permission requires={P.X}>...</Permission>`
- 26 permisos en 6 grupos: Citas Acceso, Citas Acciones, Notas clínicas, Usuarios, Reportes, Sistema
- ADMINISTRADOR tiene todos los permisos EXCEPTO `system.config`, `system.audit`, `system.db`

## DEV Preview (bypass auth)
Añadir `?preview=<rol>` a cualquier URL:
- `?preview=aprendiz` → APRENDIZ mock
- `?preview=professional` → PSICOLOGIA mock
- `?preview=coordination` → COORDINACION mock
- `?preview=admin` → ADMINISTRADOR mock
- `?preview=superadmin` → SUPERADMIN mock

**IMPORTANTE:** Navegar a la ruta directa. Ej: `/dashboard?preview=aprendiz`, nunca `/?preview=aprendiz`.

## Modal de citas (AppointmentModal)
La página `/nueva-cita` fue reemplazada por un modal global:
- **Context:** `src/providers/AppointmentModalContext.jsx` — `useAppointmentModal()` → `{ openModal, closeModal, isOpen }`
- **Componente:** `src/features/appointments/components/AppointmentModal.jsx` — wizard 4 pasos
- **Uso:** `const { openModal } = useAppointmentModal(); openModal()` o `openModal("PSICOLOGIA")` para preseleccionar
- El modal se renderiza en `Layout.jsx` y está disponible en todas las páginas autenticadas
- La ruta `/nueva-cita` redirige a `/dashboard` con `<Navigate to="/dashboard" replace />`

## Estructura de carpetas
```
src/
  features/
    admin/pages/        AdminDashboard.jsx, StaffInvitePage.jsx
    appointments/
      api/              appointments.repository.js
      components/       AppointmentCard.jsx, AppointmentForm.jsx, AppointmentModal.jsx
      hooks/            useAppointments.js
      pages/            AprendizDashboard, ProfessionalDashboard,
                        AppointmentDetail, AppointmentConfirmed, AttentionInProgress,
                        AttentionResult, AprendizHistory, AprendicesList,
                        MisCitasPage, MiExpedientePage
    aprendiz/pages/     DocumentosPage.jsx, ConfiguracionPage.jsx
    auth/pages/         Login, Onboarding, RegisterPage, CompleteProfilePage, ProfilePage, NotificationsPage
    dashboard/pages/    CoordinationDashboard
    professional/pages/ ProfessionalAgendaPage, ProfessionalNotesPage,
                        ProfessionalStatsPage, HorariosPage
    reports/pages/      ReportsDashboard
  providers/            AuthProvider.jsx, AppointmentModalContext.jsx
  routes/               AppRoutes.jsx, ProtectedRoute.jsx
  shared/
    components/         Layout.jsx, SenaLogo.jsx, Unauthorized.jsx
    pages/              AyudaPage.jsx
    rbac/               permissions.js, usePermissions.js, Permission.jsx
    styles/             variables.css, global.css, layout.css, buttons.css, appointments.css
  lib/                  supabase.js
database/
  schema.sql            Schema de referencia (ya aplicado a Supabase vía MCP)
supabase/functions/
  invite-staff/         index.ts — Edge Function con service role key
```

## Database — estado actual en Supabase
Schema aplicado vía migración MCP. Tablas activas:
- **roles** — 7 roles seed, con columna `label`
- **dependencies** — 3 dependencias seed (Psicología, Enfermería, Trabajo Social), con `icon`, `active`, `updated_at`
- **profiles** — extiende `auth.users`. Columnas: `full_name`, `document_number`, `document_type`, `ficha_number`, `phone`, `program`, `role_id`, `dependency_id`, `onboarding_completed`, `avatar_url`
- **appointments** — `status` enum incluye `in_progress`. Columnas: `reason`, `notes`, `tags[]`, `objectives_checked[]`, `observations[]`, `cancelled_reason`
- **Vista** `appointments_full` — join completo con perfiles y dependencias
- RLS habilitado en todas las tablas. Función `public.auth_role_name()` usada en políticas.
- Trigger `on_auth_user_created` → crea perfil automático con rol APRENDIZ

Para promover a SUPERADMIN:
```sql
UPDATE public.profiles
SET role_id = (SELECT id FROM public.roles WHERE name = 'SUPERADMIN')
WHERE document_number = '<documento>';
```

## Nav por rol (Layout.jsx)
Sidebar con grupos (`NavGroup`) y badge de notificaciones.

**APRENDIZ (8 items, 4 grupos):**
- PRINCIPAL: Mi espacio `/dashboard`, Mis citas `/mis-citas`
- BIENESTAR: Mi expediente `/mi-expediente`, Documentos `/documentos`
- MI CUENTA: Mi perfil `/perfil`, Notificaciones `/notificaciones` (badge), Configuración `/configuracion`
- SOPORTE: Ayuda `/ayuda`
- Botón verde "Agendar cita" en top → abre `AppointmentModal`

**PROFESIONAL (9 items, 5 grupos):**
- PANEL: Inicio `/professional`, Mi agenda `/professional/agenda`
- GESTIÓN: Aprendices `/aprendices`, Mis notas `/professional/notas`
- ANÁLISIS: Mis estadísticas `/professional/estadisticas`
- MI CUENTA: Mi perfil `/perfil`, Horarios `/professional/horarios`
- SOPORTE: Ayuda `/ayuda`

**COORDINACION:** Dashboard `/coordination`, Reportes `/reportes`
**ADMIN/SUPERADMIN:** Panel admin `/admin`, Reportes `/reportes`, Citas `/coordination`, Aprendices `/aprendices`

Mobile: bottom nav con 4 items por rol + botón "+" circular verde para APRENDIZ.

## Design system
- **Display font:** Sora (weight 800) — `var(--font-display)`
- **Body font:** DM Sans — `var(--font-sans)`
- **Verde SENA:** `#39a900` / `--sena-green`
- **Sidebar:** `#0d1117`
- **Surface:** `#f7f9f7` (`--surface-base`)
- Sin emojis — solo iconos Lucide

## Convenciones de código
- Inline styles (no Tailwind, no CSS modules)
- DEV_ROLE gateado con `import.meta.env.DEV` en todos los archivos (null en producción automáticamente)
- Utilidad compartida: `src/lib/devMode.js` exporta `DEV_ROLE`; cada componente también declara su propio inline por legacy
- Queries Supabase con join: `profiles!user_id(...)`, `professional:profiles!professional_id(...)`
- Normalización para búsqueda: `str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()`
- Sin comentarios de código salvo WHY no obvios

## Sistema de invitación de staff
- Tabla `staff_invitations` con `email`, `role_id`, `dependency_id`, `status` (pending/accepted/expired/cancelled), `expires_at`
- Vista `staff_invitations_full` — join con roles y dependencias para el listado del admin
- Edge Function `invite-staff` — llama `auth.admin.inviteUserByEmail()` con service role key
- Trigger `handle_new_user()` — al crear usuario, busca en `staff_invitations` para asignar rol; si no hay invitación → rol APRENDIZ
- APRENDIZ se autoregistra en `/register`; staff recibe email magic link → completa datos en `/completar-perfil`
- Admin invita desde `/admin/invitar` (ruta `StaffInvitePage.jsx`)

## Responsive (Layout.jsx)
Clases globales vía `<style>` tag en Layout:
- `.kpi-grid-4` — 4 cols desktop → 2 cols mobile
- `.main-two-col` — flex-row → flex-column mobile
- `.chart-row`, `.dashboard-grid`, `.stats-grid` — similares
- `.hide-mobile` / `.full-mobile` — show/hide helpers
- `.bottom-nav` — oculto en desktop (≥769px), visible en mobile

## Estado actual (sesión última — producción)
- ✅ Deploy en producción: https://gestion-citas-nu.vercel.app (GitHub → Vercel auto-deploy)
- ✅ Login solo email/contraseña (OAuth removido), olvidé contraseña + ResetPasswordPage
- ✅ Edge Functions deployadas en Supabase:
  - `invite-staff` (v2, ACTIVE) — invitación de staff con service role
  - `notify-appointment` (v5, ACTIVE, verify_jwt: true) — notificaciones email vía Resend API
- ✅ Migración DB: `user_documents.appointment_id` FK → `appointments(id)` ON DELETE SET NULL
- ✅ Migración DB: tabla `system_settings` (key/value) con RLS solo ADMINISTRADOR/SUPERADMIN
- ✅ Todas las páginas conectadas a datos reales de Supabase
- ✅ AuthProvider: timeout de 12s en checkSession() — previene spinner infinito
- ✅ ProfessionalDashboard: realtime subscription via `postgres_changes` por dependency_id
- ✅ ProfessionalDashboard: quick link "Expedientes" → /professional/notas (era /aprendices duplicado)
- ✅ AprendicesList: paginación (PAGE_SIZE=20), query split para evitar límite de joins
- ✅ AprendizDashboard + AppointmentDetail: modal de cancelación con `cancelled_reason`
- ✅ AppointmentDetail: adjuntos de archivos reales (upload/view/delete) en bucket `user-documents`
- ✅ AppointmentDetail: eliminar doc usa modal propio (no window.confirm)
- ✅ useAppointments.js: cancelAppointment acepta `cancelledReason` y lo persiste en DB
- ✅ Admin: 6 páginas funcionales — /admin, /admin/invitar, /admin/dependencias, /admin/actividad, /admin/roles, /admin/configuracion
- ✅ ConfiguracionAdminPage: persiste en DB (tabla system_settings) con upsert por key
- ✅ AdminDashboard: permisos de tarjetas corregidos (USERS_READ, APPOINTMENTS_READ_ALL, REPORTS_EXPORT)
- ✅ CoordinationDashboard: fix hoisting useState period antes de useDashboardData
- ✅ AppRoutes: COORDINACION añadido a /aprendices
- ✅ window.confirm eliminado de todos los archivos (modal propio o inline confirm)
- ✅ Seguridad: vistas security_invoker, search_path fijo en funciones, REVOKE anon en trigger functions
- ✅ Build limpio: ~800ms, 0 errores

## Edge Function — notify-appointment
Soporta Resend API para emails. Requiere secreto `RESEND_API_KEY` en Supabase Dashboard → Edge Functions → Secrets.
Sin el secreto retorna `{ ok: false, reason: "no_api_key" }` sin romper el flujo.

## Pendiente (acciones manuales en Supabase Dashboard)
- Auth → Emails → SMTP Settings: configurar Resend (host: smtp.resend.com, port: 465, user: resend)
- Edge Functions → Secrets: añadir `RESEND_API_KEY` para activar emails reales
- Auth → Attack Protection: activar "Leaked Password Protection"
- AttentionResult: agregar MOCK_APT para preview DEV (actualmente siempre muestra 404 en dev)
