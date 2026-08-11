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
  delete-user/          index.ts — elimina usuario (solo SUPERADMIN)
  invite-staff/         index.ts — crea/actualiza staff con contraseña
  notify-appointment/   index.ts — emails via Resend API (resuelve email por user_id)
  send-reminders/       index.ts — recordatorios 24h (cron, CRON_SECRET/service-role)
```

## Database — estado actual en Supabase
Schema aplicado vía migración MCP. Tablas activas:
- **roles** — 7 roles seed, con columna `label`
- **dependencies** — 3 dependencias seed (Psicología, Enfermería, Trabajo Social), con `icon`, `active`, `updated_at`
- **profiles** — extiende `auth.users`. Columnas: `full_name`, `document_number`, `document_type`, `ficha_number`, `phone`, `program`, `role_id`, `dependency_id`, `onboarding_completed`, `avatar_url`
- **appointments** — `status` enum incluye `in_progress`. Columnas: `reason`, `notes`, `tags[]`, `objectives_checked[]`, `observations[]`, `cancelled_reason`, `started_at` (duración real), `reminder_sent` (recordatorio 24h)
- **profiles** también: `last_mood`, `last_mood_at` (widget de ánimo del aprendiz)
- **programs** — 44 programas SENA seed, RLS (lectura todos, escritura admin) — usado en Onboarding
- **satisfaction_surveys** — encuesta post-cita (`appointment_id`, `user_id`, `rating` 1-5, `comment`), RLS insert/read propio + read staff
- **Vista** `appointments_full` — join completo con perfiles y dependencias
- RLS habilitado en todas las tablas. Función `public.auth_role_name()` usada en políticas.
- **SECURITY DEFINER revisadas (2026-07-16)**: `auth_role_name`, `cancel_own_appointment`, `current_user_role_name`, `delete_aprendiz`, `handle_new_user`, `prevent_role_escalation` — expuestas a anon/authenticated intencionalmente (RPCs con validación interna: `cancel_own_appointment` valida `user_id=auth.uid()`, `delete_aprendiz` restringido a roles admin, etc.). Advisor de Supabase las marca como WARN por convención, no por vulnerabilidad real detectada.
- Trigger `on_auth_user_created` → crea perfil automático con rol APRENDIZ. Desde la migración `skip_onboarding_if_self_registered_complete` (2026-07-14): si el aprendiz se autorregistró en `/register` y ya dio documento+ficha+programa, el perfil se crea con `onboarding_completed=true` de una vez (evita pedirle lo mismo otra vez en `/onboarding`). Solo aplica a autorregistro (no a staff invitado)
- Trigger `check_role_escalation` → bloquea cambios de `role_id` para no-admins (SECURITY)

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

**COORDINACION:** Dashboard `/coordination`, Aprendices `/aprendices`, Reportes `/reportes`, Ayuda `/ayuda`
**ADMIN/SUPERADMIN:** Panel admin `/admin`, Reportes `/reportes`, Citas `/coordination`, Aprendices `/aprendices`, Usuarios `/admin/usuarios`

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

## Sistema de creación de staff
- Tabla `staff_invitations` con `email`, `role_id`, `dependency_id`, `status` (pending/accepted/expired/cancelled), `expires_at`
- Vista `staff_invitations_full` — join con roles y dependencias para el listado del admin
- Edge Function `invite-staff` v4 — usa `auth.admin.createUser()` con `email_confirm: true` + contraseña generada por admin
  - Si el usuario ya existe: actualiza contraseña Y role_id/dependency_id en profile
  - El admin genera una contraseña aleatoria en el form y la comparte directamente con el staff
  - NO envía magic link — flujo sin dependencia de email
- Edge Function `delete-user` v1 — elimina usuario completo (solo SUPERADMIN)
  - Valida JWT del llamante + rol SUPERADMIN antes de ejecutar
  - Previene auto-eliminación y eliminación de otros SUPERADMIN
  - Cancela invitaciones pendientes y llama `auth.admin.deleteUser()`
- Trigger `handle_new_user()` — al crear usuario, busca en `staff_invitations` para asignar rol; si no hay invitación → rol APRENDIZ
- APRENDIZ se autoregistra en `/register`; staff es creado por admin → completa datos en `/completar-perfil`
- Staff nuevo con `onboarding_completed: false` redirigido a `/completar-perfil` desde ruta raíz
- Admin crea staff desde `/admin/invitar` (`StaffInvitePage.jsx`) — generador de contraseña aleatoria con show/hide + copy + regenerar
- SUPERADMIN puede eliminar usuarios desde `/admin/usuarios` (`UsuariosPage.jsx`) — con confirmación modal

## Responsive (Layout.jsx)
Clases globales vía `<style>` tag en Layout:
- `.kpi-grid-4` — 4 cols desktop → 2 cols mobile
- `.main-two-col` — flex-row → flex-column mobile
- `.chart-row`, `.dashboard-grid`, `.stats-grid` — similares
- `.hide-mobile` / `.full-mobile` — show/hide helpers
- `.bottom-nav` — oculto en desktop (≥769px), visible en mobile

## Estado actual (sesión última — producción)
- ✅ Seguridad: trigger `prevent_role_escalation` en DB — impide escalación de privilegios via RLS
- ✅ Seguridad: cabeceras HTTP en vercel.json (X-Frame-Options, CSP, nosniff, Referrer-Policy)
- ✅ Seguridad: console.log/warn envueltos en `import.meta.env.DEV` guards en AuthProvider
- ✅ Seguridad: HTML escape en plantillas de email (notifications.js) — previene XSS
- ✅ Seguridad: ResetPasswordPage limpia hash del historial tras leer recovery token
- ✅ Seguridad: Edge Functions con código fuente en repo (supabase/functions/) — auditables
- ✅ UsuariosPage (`/admin/usuarios`): listado de todos los usuarios con filtros + borrar (solo SUPERADMIN)
- ✅ AprendicesList: profesionales solo ven aprendices con citas en su dependencia
- ✅ Bugs 400 resueltos: FKs appointments → profiles corregidas, `email` removido de joins
- ✅ AttentionInProgress: setea `professional_id` y `status=in_progress` al entrar
- ✅ AttentionResult: incluye `objectives_checked` en query de carga
- ✅ Layout: coordinación tiene navlink a /ayuda, memory leak de badge resuelto
- ✅ ProfilePage: etiqueta de rol dinámica (no hardcodeado "Aprendiz SENA")
- ✅ Deploy en producción: https://gestion-citas-nu.vercel.app (GitHub → Vercel auto-deploy)
- ✅ Login solo email/contraseña (OAuth removido), olvidé contraseña + ResetPasswordPage
- ✅ Edge Functions deployadas en Supabase:
  - `invite-staff` (v3, ACTIVE) — crea usuario con `createUser()` + contraseña + `email_confirm: true`; si ya existe actualiza contraseña
  - `notify-appointment` (v5, ACTIVE, verify_jwt: true) — notificaciones email vía Resend API
- ✅ Migración DB: `user_documents.appointment_id` FK → `appointments(id)` ON DELETE SET NULL
- ✅ Migración DB: tabla `system_settings` (key/value) con RLS solo ADMINISTRADOR/SUPERADMIN
- ✅ Todas las páginas conectadas a datos reales de Supabase
- ✅ AuthProvider: proactive token refresh antes de renderizar (expiresAt < now+30s → refreshSession → signOut si falla)
- ✅ AuthProvider: FAST_FALLBACK de 8s cuando URL hash contiene tokens de auth (invite/recovery links)
- ✅ ProtectedRoute: muestra spinner en vez de redirigir cuando `user && !profile` (evita redirect durante carga del perfil)
- ✅ Navigate fixes: todos los `navigate()` preservan `?preview=<role>` en modo DEV
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

## Sesión actual — mejoras UX + notificaciones
- ✅ AuthProvider reescrito: `onAuthStateChange` como única fuente de verdad (elimina `NavigatorLockAcquireTimeoutError` al refrescar/reloguear). Sin `retryAuthRequest`, sin `refreshSession()` manual
- ✅ AppointmentDetail: encuesta de satisfacción (estrellas + comentario) para aprendiz en citas completadas; `formatTime` con minutos; ubicación dinámica desde `system_settings.appointment_location`; notifica al confirmar
- ✅ AttentionInProgress: cronómetro usa `started_at` real, lo persiste al entrar
- ✅ AttentionResult: duración real calculada `started_at` → `updated_at`
- ✅ MisCitasPage: búsqueda por texto + filtro por dependencia + **Exportar PDF** (vía `window.print`, cero deps)
- ✅ AprendizDashboard: estado de ánimo persiste en `profiles.last_mood`
- ✅ Onboarding: programas cargados desde tabla `programs` (fallback a lista fija)
- ✅ ConfiguracionAdminPage: campo de texto para ubicación de citas
- ✅ notify-appointment (código actualizado): resuelve email desde `auth.users` por `user_id` con service-role — antes las notificaciones al confirmar nunca llegaban (profiles no tiene email)

## Sesión actual — auditoría de bugs + hardening RLS
- ✅ Seguridad DB: `prevent_role_escalation` con `search_path` fijo (`'public','pg_temp'`)
- ✅ RBAC: `USERS_DELETE` añadido a COORDINACION en `permissions.js` (ya lo permitía el RPC `delete_aprendiz`, la matriz no lo reflejaba); `AprendicesList.jsx` usa `can(P.USERS_DELETE)` en vez de lista de roles hardcodeada
- ✅ ReportsDashboard: fix de desfase UTC en gráfico "Citas por mes" (`parseISO` en vez de `new Date` sobre fecha-string)
- ✅ Anti doble-reserva: `CREATE UNIQUE INDEX unique_active_appointment_slot ON appointments (dependency_id, scheduled_date, scheduled_time) WHERE status IN ('pending','confirmed')` + `appointments.repository.js` traduce el error `23505` a "Este horario ya está ocupado"
- ✅ RLS `appointments`: política `apts_update` ya NO incluye rama APRENDIZ (antes permitía UPDATE sin `WITH CHECK`, un aprendiz podía en teoría alterar cualquier columna de su propia cita vía API directa). Cancelación propia ahora solo vía RPC `cancel_own_appointment(p_appointment_id, p_reason)` (SECURITY DEFINER, valida `user_id = auth.uid()` y `status IN ('pending','confirmed')` server-side). `useAppointments.cancelAppointment` y `AppointmentDetail.executeCancel` (rama `!canCancelAny`) migrados al RPC; cancelación por COORDINACION/ADMIN/SUPERADMIN sigue usando `.update()` directo (su rama de `apts_update` no cambió)

## Sesión actual — responsive en páginas de auth
- ✅ RegisterPage: Paso 2 (Nombre/Apellido, Tipo/Documento, Ficha/Programa) truncaba placeholders en móvil (320-375px) por grids fijas de 2 columnas. Clase `.reg-grid-2col` + `@media (max-width: 400px)` apila a 1 columna
- ✅ Onboarding: bug crítico — panel institucional izquierdo de `width: 360` fijo (sin media query) causaba scroll horizontal y formulario inutilizable en móvil. Se oculta con `.onb-sidebar` bajo `@media (max-width: 768px)`; padding de topbar/footer/card reducido bajo 480px
- ✅ Login: revisado en 320-375px, ya era responsive (sin cambios)

## Sesión actual — responsive panel autenticado (causa raíz sistémica)
- ✅ **Causa raíz identificada**: los items dentro de grids compartidos (`.kpi-grid-4`, `.stats-grid`, `.coord-kpi-grid`, `.main-two-col`, `.chart-row`, etc.) no tenían `min-width:0`, así que CSS Grid/Flexbox no los dejaba encoger por debajo del contenido — el desborde quedaba oculto (no scrolleable) por `.app-main{overflow-x:hidden}`. Fix global en `Layout.jsx`: `min-width:0` en items de esos grids + colapso real a 1 columna en móvil para `.main-two-col`/`.chart-row` (antes solo tenían `flex-direction:column`, sin efecto en los que son `display:grid`) + `width:100%` en hijos al apilarse
- ✅ `ProfessionalDashboard.jsx`: tabs (Pendientes/Confirmadas/Completadas) con scroll horizontal en vez de recorte; badge de motivo de consulta con ellipsis real (antes `max-width` en un `span` inline no aplicaba); fix de regla local `.main-two-col` que solo daba `width:100%` al último hijo, no al primero (columna de contenido)
- ✅ `CoordinationDashboard.jsx`: usa sus propias clases (`.coord-main`, `.coord-sidebar-right`, `.coord-kpi-grid`, NO `.coord-kpis` que es CSS muerto) — se agregó `min-width:0` a `.coord-main`/`.coord-sidebar-right`, el eslabón que faltaba para que la tabla "Citas de hoy" (con su propio `overflow-x:auto`) pudiera contraerse correctamente
- ✅ `HorariosPage.jsx`: bug funcional real — el selector de hora de cierre en cada fila de disponibilidad quedaba fuera de pantalla en móvil (staff no podía editarlo). Fix: `flexWrap:"wrap"` en la fila + `minWidth:0` en el contenedor de selects. Resumen de 3 tarjetas ahora usa `.stats-grid` (responsive compartido)
- ✅ Verificado en 320-375px sin overflow horizontal: `/dashboard`, `/professional`, `/coordination`, `/admin`, `/admin/roles`, `/professional/horarios`, `/professional/estadisticas`, `/reportes`
- ⚠️ Pendiente menor (no bloqueante): un porcentaje se corta ligeramente en `/reportes` → "Top 5 programas" (fila 1); `/admin/usuarios` no se pudo probar con datos reales en modo `?preview=`
- **Patrón para futuras páginas**: cualquier grid/flex de 2+ columnas necesita `min-width:0` en sus items directos para poder colapsar en móvil; texto largo en `<span>` necesita `display:inline-block` (o `block`) además de `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` — un `span` inline ignora `max-width`

## Auditoría pre-socialización (2026-08-04)
- ✅ Build limpio (`npm run build`, ~9.6s, 0 errores)
- ✅ Tests: 147/147 pasando (`npm run test`)
- ✅ Producción viva y verificada visualmente: https://gestion-citas-nu.vercel.app/login (sin errores de consola)
- ✅ Edge Functions confirmadas ACTIVE en Supabase: `invite-staff` v4, `notify-appointment` v6, `delete-user` v1, `send-reminders` v1 (el CLAUDE.md decía "deploy bloqueado" — desactualizado, ya estaban desplegadas)
- ✅ Advisors de seguridad: sin hallazgos nuevos, solo los WARN ya revisados (SECURITY DEFINER intencionales) + Leaked Password Protection (ver pendiente abajo)
- ✅ Logs de Auth/API/Edge Functions (24h): sin errores
- ✅ Los 5 dashboards por rol (aprendiz/profesional/coordinación/admin/superadmin) probados vía `?preview=` en local: cargan sin errores de consola
- ✅ Wizard de agendar cita (4 pasos: servicio → fecha → hora → confirmar): probado end-to-end, funciona
- ⚠️ Lint: 54 errores preexistentes, todos cosméticos (variables `Icon`/`Ic` no usadas, regla nueva `react-hooks/set-state-in-effect` en patrones normales de fetch-on-mount, `Date.now()` en datos mock de `IS_DEV`). No afectan build ni funcionalidad — no bloqueante para la socialización
- ⚠️ **pg_cron no está instalado** en el proyecto Supabase → `send-reminders` está deployada pero NO se ejecuta automáticamente (nadie la invoca). No afecta la demo en vivo, pero los recordatorios 24h no están activos en producción

## Auditoría responsive móvil (2026-08-06)
Usuario reportó "muchas inconsistencias" en móvil real. Barrido con Playwright (375px y 320px) en las 33 rutas + modal de citas:
- ✅ **Corregido `/admin/invitar`**: crítico — grid de 2 columnas fijo (`StaffInvitePage.jsx`) sin colapsar en móvil dejaba el campo de contraseña en 56px y el botón "Actualizar" 100px fuera de pantalla. Fix: className `staff-invite-grid` + `@media (max-width:820px){grid-template-columns:1fr !important}`, `minWidth:0` en el input de contraseña, `flexWrap` en la fila del botón Actualizar
- ✅ **Corregido `/reportes`**: "Top 5 programas" recortaba el `%` (columnas de grid en px fijos + `overflow:hidden` ocultando el desborde en vez de mostrarlo). Fix: className `top-programs-row` + media query que reduce columnas a `1fr 30px 24px 32px` bajo 480px, ellipsis en nombre del programa
- ✅ **Corregido `layout.css` — causa raíz probable del "no aparece todo el contenido, ni el menú" reportado**: `.app-main { overflow-x: hidden }` sin `overflow-y` explícito — por la spec de CSS Overflow, cuando un eje no es `visible` y el otro sí, el navegador **fuerza** el otro eje a `auto`, convirtiendo `.app-main` en su propio contenedor de scroll interno en vez de dejar que la página (`html`) haga el scroll normal. Confirmado con Playwright: antes del fix `overflowY` computaba `auto` y el scroll quedaba atrapado en `.app-main`; después del fix (`overflow-x: clip` en vez de `hidden` — `clip` no dispara el forzado de la spec) `overflowY` vuelve a `visible` y `document.scrollingElement` es `HTML` como debe ser. Este patrón puede causar scroll errático/contenido inalcanzable especialmente en Safari iOS aunque no siempre se reproduce igual en Chrome desktop
- Verificado: build limpio, 147/147 tests, sin overflow horizontal en `/admin/invitar`, `/reportes`, `/dashboard`, `/admin` tras los fixes

**Bug funcional del modo `?preview=` — corregido (2026-08-06)**: el problema no era solo dashboard/mis-citas/documentos/configuración — era sistémico. Cualquier componente que revisara `if (!user)` en vez de `if (DEV_ROLE)` antes de llamar a Supabase disparaba queries/escrituras reales con el usuario falso `{id:"dev-user"}`, porque ese objeto es truthy. Auditado el proyecto completo (`grep user.id` en todo `src/`) y corregidos todos los casos encontrados:
- `Layout.jsx` — efecto del badge de notificaciones (afectaba TODAS las páginas de aprendiz, era la causa de los 400 vistos en consola)
- `useAppointments.js` — **`createAppointment` no tenía guard en absoluto**: agendar una cita completa desde el modal y hacer clic en "Confirmar cita" en modo preview habría fallado silenciosamente. También `updateStatus` y `cancelAppointment`. Verificado end-to-end con Playwright: el wizard completo ahora llega a "Cita confirmada" sin error
- `AppointmentDetail.jsx` — `confirm`, `submitSurvey`, `markNoShow`, `handleFileUpload`, `executeDeleteDoc`
- `AprendicesList.jsx` — `handleDelete`
- `DocumentosPage.jsx`, `ConfiguracionPage.jsx`, `HorariosPage.jsx` — fetch inicial + acciones de guardado
- `StaffInvitePage.jsx` — `fetchInvitations`, `handleSend`, `handleCancel`
- `DependenciasPage.jsx` — no tenía NINGÚN guard (`toggleActive`, `saveEdit`)
- `ConfiguracionAdminPage.jsx` — `save`

Todos siguen el patrón ya establecido en el código: toast de éxito con "(demo)" + actualización de estado local, sin tocar Supabase, cuando `DEV_ROLE`/`IS_DEV` está activo.

## Menú móvil (drawer) + conversión a PWA (2026-08-10)
Usuario reportó que en móvil "se pierden varias cosas del menú" y "no hay opción de cerrar sesión". Causa: `renderMobileNav()` en `Layout.jsx` solo exponía 4 accesos rápidos en el `.bottom-nav`, y el `.sidebar` completo (con `signOut` y el resto de items por rol) se ocultaba por completo bajo `@media (max-width:768px)` sin ningún reemplazo.
- ✅ `Layout.jsx`: contenido del sidebar (marca, badge de rol, `renderNav()` completo, footer con **Cerrar sesión** + usuario) extraído a `sidebarContent`, reutilizado tanto en `.sidebar` (desktop) como en un nuevo `.mobile-drawer` (menú lateral deslizable en móvil). Se agregó `.mobile-topbar` (logo + botón hamburguesa + avatar) visible solo ≤768px, y un backdrop que cierra el drawer al hacer click fuera. El drawer se cierra automáticamente en cada cambio de ruta (`useEffect` sobre `location.pathname`). El `.bottom-nav` de 4 accesos rápidos se mantiene tal cual, ahora como complemento del drawer, no como único menú
- ✅ `layout.css`: nuevas clases `.mobile-topbar*`, `.mobile-drawer*` (fuera de flujo, `transform:translateX(-100%)` + `pointer-events:none` cuando cerrado, animado con `.open`); `.app-wrapper{flex-direction:column}` en móvil (antes quedaba en `row`, y al agregar el topbar como hermano de `.app-main` se habrían puesto lado a lado en vez de apilarse)
- ✅ Verificado con Chrome DevTools (roles aprendiz/admin vía `?preview=`): drawer muestra todos los items que antes solo estaban en desktop (Mi expediente, Documentos, Configuración, Ayuda / Usuarios, Fichas activas, etc.) + botón Cerrar sesión, igual que el sidebar de escritorio
- ✅ **PWA**: `vite-plugin-pwa` (`generateSW`, `registerType:autoUpdate`) configurado en `vite.config.js` — manifest (`Bienestar SENA`, `theme_color:#39a900`, `display:standalone`, `orientation:portrait`) + `runtimeCaching` (Supabase → `NetworkOnly`, nunca cachea datos en vivo; imágenes y Google Fonts → `CacheFirst`)
- ✅ Iconos generados desde `public/sena-logo.png` (1000×1000) con `sharp` (dependencia temporal, desinstalada tras generar): `public/pwa-icons/{icon,maskable}-{192,512}.png` + `apple-touch-icon.png` (192/512 "any" transparente con el logo verde original; maskable/apple con silueta blanca sobre fondo verde `#39a900` — el logo verde sobre fondo verde no tenía contraste suficiente)
- ✅ `index.html`: meta `theme-color`, `apple-mobile-web-app-*`, `apple-touch-icon`, `viewport-fit=cover` (para `env(safe-area-inset-*)` del drawer/topbar en notch)
- ✅ `vercel.json`: CSP ampliada con `worker-src 'self'; manifest-src 'self';` (antes solo caía por fallback a `script-src`/`default-src`, funcionaba pero no era explícito)
- ✅ Build limpio (`npm run build`): `dist/sw.js`, `dist/manifest.webmanifest`, `dist/registerSW.js` generados; precache 122 entradas. Probado con `vite preview`: service worker se registra y activa, manifest válido con los 4 iconos (2 `any` + 2 `maskable`), cache de precache poblado — cumple los criterios de instalabilidad de Chrome
- Nota: el bypass `?preview=<rol>` solo funciona en modo DEV (`import.meta.env.DEV`), no en el build de producción — es el comportamiento esperado, no un bug

## Auditoría general (seguridad + bugs + responsive) y fixes (2026-08-10)
Usuario pidió una auditoría completa de toda la plataforma. Se corrió en 3 forks paralelos (seguridad, bugs/calidad, responsive) y luego se corrigió todo lo encontrado.

**Seguridad — corregido:**
- 🔴 **Crítico**: `notify-appointment` era un relay de correo abierto — cualquier autenticado podía invocarlo con `to_email`/`subject`/`html` arbitrarios y el correo salía desde el dominio institucional (`noreply@bienestar-sena.co`). Ahora el payload es solo `{appointment_id, type, reason}`; destinatario y HTML se resuelven/generan 100% server-side desde una cita real, con autorización (dueño de la cita o staff/admin). `src/lib/notifications.js` se simplificó a solo disparar el evento
- 🟠 **Alto**: `invite-staff` no validaba `role_id` contra el rol del llamante — un ADMINISTRADOR podía asignarse/asignar SUPERADMIN vía request directo (el único freno era el `<select>` del formulario). Ahora el servidor bloquea asignar SUPERADMIN si el llamante no lo es
- 🟠 **Alto**: `react-router-dom` 7.14.0 caía en un rango con CVEs de severidad alta con fix disponible → bump a 7.18.2 vía `npm audit fix`. `xlsx` sigue con una vulnerabilidad sin fix en npm (ReDoS/prototype pollution) — **sí se usa para parsear archivos subidos por el admin** en `FichasPage.jsx` (import de fichas), no solo para exportar. Sin acción posible sin migrar de librería (SheetJS solo publica el parche en su propio CDN, no en npm) — pendiente decisión del usuario, no se tocó
- 🟡 **Medio — pendiente, requiere Supabase Dashboard**: el path de `user-documents` (`appointments/${id}/${timestamp}.ext`) no incluye `user_id` — la seguridad depende 100% de policies de Storage que no están versionadas en el repo. **Falta verificar manualmente en Supabase Dashboard → Storage → Policies** que la policy del bucket restrinja por dueño real, no solo por "autenticado"

**Bugs — corregidos:**
- `/admin/dependencias` quedaba en blanco en modo preview: `load()` sin guard `DEV_ROLE` (a diferencia de `toggleActive`/`saveEdit` en el mismo archivo) + sin manejo de error/vacío. Se agregó mock + toast de error + estado "Sin dependencias"
- "Lugar de la cita" mostraba 3 textos distintos (`AppointmentModal`, `AppointmentConfirmed` hardcodeados vs. `AppointmentDetail` leyendo `system_settings.appointment_location` real) — las 3 pantallas ahora leen la misma fuente
- `NewAppointment.jsx` (código muerto, ya reemplazado por el modal global) — eliminado

**Responsive — corregido:**
- `AprendizHistory.jsx` no tenía ningún `@media` en todo el archivo (grid de página `300px 1fr` fijo) — mismo patrón que ya causó el bug crítico de `Onboarding.jsx`. Se agregó colapso a 1 columna + `min-width:0` bajo 768px
- `ProfilePage.jsx`/`CompleteProfilePage.jsx`: grids de 2 columnas sin `min-width:0` ni `@media` — riesgo menor (inputs, no texto largo), corregido igual por consistencia

**Verificado sin hallazgos**: build limpio, 147→153 tests pasando (se agregaron 6 tests de regresión para la autorización de `notify-appointment` y el bloqueo de escalación de `invite-staff` en `src/test/security/notifications.test.js`), `delete-user` bien, sin secretos en el repo, sin XSS/`eval`, doble-reserva maneja bien el error 23505, sin memory leaks nuevos, patrón de guards `DEV_ROLE` sin regresiones en el resto del código.

**IMPORTANTE — pendiente de acción manual, no ejecutable desde aquí:**
- Los cambios en `supabase/functions/notify-appointment/index.ts` e `invite-staff/index.ts` **no se han desplegado** — solo están en el código del repo. Hay que correr `supabase functions deploy notify-appointment` y `supabase functions deploy invite-staff` (o subirlos manualmente desde el Dashboard) para que el fix de seguridad tome efecto en producción. No hay credenciales de deploy disponibles en este entorno
- Verificar policies del bucket `user-documents` en Supabase Dashboard (ver arriba)
- Decidir si migrar `xlsx` (import de fichas) a otra librería o al build parcheado de SheetJS

## Auditoría profunda página por página, rol por rol (2026-08-10, continuación)
Segunda pasada, más granular, sobre cada rol (APRENDIZ, profesional en sus 3 dependencias, COORDINACION, ADMINISTRADOR/SUPERADMIN) y cada página — 4 forks paralelos. Todo lo encontrado se corrigió en el código; nada requiere acción manual salvo lo ya listado en "Pendiente" abajo.

**Corregido:**
- 🔴 **`FichasPage.jsx` (`/admin/fichas`) no tenía NINGÚN guard `DEV_ROLE`** — en modo preview operaba contra la BD real: cargaba PII real de estudiantes y el botón "Borrar todo" (delete sobre toda `aprendiz_whitelist`) era completamente funcional y alcanzable. Se agregó mock + guards en las 5 operaciones (cargar, importar, borrar uno, borrar todo, toggle validación)
- `AprendicesList.jsx` y `FichasPage.jsx`: la búsqueda filtraba sobre el array ya capado a `.limit(200)` — un registro fuera de los primeros 200 no aparecía en la búsqueda aunque existiera. Ahora, con texto de búsqueda, la query filtra server-side en vez de sobre el array local
- `useAppointments.js cancelAppointment()`: bloqueaba cancelar cualquier cita que no estuviera "pending", pero el botón de cancelar en `AprendizDashboard` se muestra también para "confirmed" y el RPC `cancel_own_appointment` sí las permite — un aprendiz que cancelaba una cita confirmada desde el Dashboard recibía un error falso
- `StaffInvitePage.jsx`: el fetch de `roles` no tenía guard `IS_DEV` (a diferencia de `deps`, que sí) → en preview la tabla `roles` requiere sesión real y quedaba vacía → `handleSend` nunca encontraba el rol y "Invitar staff" siempre fallaba con "Rol no encontrado" antes de llegar a la rama demo
- Los toggles de `/configuracion` (Ajustes → Notificaciones) se guardaban en `user_settings` pero ninguna Edge Function los leía. `notify-appointment` ahora respeta `notifs.confirmacion`/`notifs.cancelacion`; `send-reminders` respeta `notifs.reminder24h`
- Menores: `ActividadPage.jsx`/`CoordinationDashboard.jsx` sin mock DEV completo (inconsistencia de demo, no afectaba producción); `ProfessionalStatsPage.jsx` con el mismo antipatrón de desfase UTC ya corregido antes en otras páginas (`new Date(string)` → `parseISO`); `UsuariosPage.jsx` normalizado a `supabase.functions.invoke` para `delete-user` (antes `fetch` crudo, funcionaba pero era inconsistente)

**Verificado sin hallazgos**: RBAC ADMINISTRADOR vs SUPERADMIN correcto en todas las pantallas; `delete-user`, `UsuariosPage` (`canDelete`) y el `<select>` de roles en `StaffInvitePage` (nunca ofrece SUPERADMIN) coherentes con el fix de escalación de la sesión anterior; la lógica de profesional/dependencias generaliza bien a Psicología/Enfermería/Trabajo Social sin hardcodes; cadena `appointment_location` (guardar en Admin → leer en 3 pantallas de citas) bien conectada; sin errores de consola en ninguna página visitada; `/admin/fichas` accesible sin guard es intencional para la tabla `aprendiz_whitelist` (RLS de lectura pública, necesaria para validar antes del registro) — no es el mismo problema que el guard de preview, son cosas distintas.

**No se pudo probar** (requiere datos reales de Supabase o las 3 dependencias del rol profesional con cuentas reales, fuera del alcance de `?preview=`): límite de 2 citas pendientes y slot duplicado en el wizard; subir/borrar documentos reales; encuesta de satisfacción; Enfermería/Trabajo Social con datos propios (`?preview=professional` solo simula Psicología).

## Despliegue de las 3 Edge Functions corregidas + descubrimiento de drift repo↔producción (2026-08-10)
Se desplegaron directamente desde el Dashboard de Supabase (browser automation, sin credenciales de CLI) los 3 fixes de seguridad de esta sesión: `notify-appointment`, `invite-staff`, `send-reminders`. Los 3 ya están corriendo en producción, confirmado con el timestamp "a few seconds ago" en cada uno tras el deploy.

**Hallazgo importante — `invite-staff` había divergido del repo.** Al ir a desplegar el fix, el código REALMENTE corriendo en producción no coincidía con lo que había en git — alguien lo editó directamente desde el Dashboard en algún momento (probablemente para agregar el flujo de `staff_invitations` con `invitation.id` + rollback si falla `createUser`, que no existe en ningún commit) y nunca se sincronizó de vuelta. La versión que estaba viva **no tenía ningún chequeo de autorización** (ni siquiera `Authorization` header) — más grave que el hueco que se había corregido en la versión del repo. Se parchó la versión real (preservando su lógica de invitaciones) con el mismo bloque de auth + bloqueo de escalación a SUPERADMIN, se desplegó, y se sincronizó de vuelta a git (commit `5130519`).

**`notify-appointment` y `send-reminders` SÍ coincidían con el repo** (confirmado con diff exacto contra el código descargado del Dashboard) — se desplegaron sin sorpresas.

**`delete-user` también divergió del repo** (imports `jsr:` en vez de `esm.sh`, mismo patrón que `invite-staff`) pero, a diferencia de `invite-staff`, SÍ tiene el chequeo de autorización SUPERADMIN correcto — no se le hizo ningún cambio ni se sincronizó de vuelta a git (queda pendiente, ver abajo).

**Lección para sesiones futuras**: el código en `supabase/functions/*/index.ts` en este repo **no es necesariamente lo que está corriendo en producción**. Antes de asumir que un archivo del repo refleja el comportamiento real de una función ya desplegada, descargar el código real desde el Dashboard (`Download → Download as ZIP`, o `Download via CLI` si hay credenciales) y comparar. No asumir que están sincronizados.

**Cómo se desplegó sin CLI**: navegación directa a `https://supabase.com/dashboard/project/hopjfppngueuhwuakzwf/functions/<nombre>/code`, edición del contenido del editor Monaco vía `window.monaco.editor.getEditors()[0].setValue(código)` (JS, no simulación de teclado — **el teclado sí es riesgoso aquí**: una tecla de navegación como Page Down escrita mientras el cursor está enfocado en el editor se interpreta como texto literal en vez de scroll, y en un intento previo la traducción automática de Chrome llegó a corromper identificadores del código pegado — "unknown"→"desconocido", "function"→"función" — antes de desplegar; verificar `document.documentElement.lang === "en"` y ausencia de `iframe.skiptranslate` antes de tocar el editor), luego clic en "Deploy updates" + confirmar en el modal.

## Pendiente (acciones manuales en Supabase Dashboard)
- Edge Functions → Secrets: verificar que `CRON_SECRET` y `RESEND_API_KEY` estén configurados (no se puede verificar valor vía MCP, solo presencia se infiere por comportamiento)
- Programar cron diario que invoque `send-reminders` (requiere habilitar extensión `pg_cron` primero, luego `cron.schedule(...)`, o usar un servicio externo tipo cron-job.org contra la URL de la función) con header `x-cron-secret`
- Auth → Emails → SMTP Settings: configurar Resend (host: smtp.resend.com, port: 465, user: resend)
- Auth → Attack Protection: activar "Leaked Password Protection" (sigue pendiente, confirmado por advisor de seguridad)
- Sincronizar `delete-user` al repo (divergió igual que `invite-staff`, pero SÍ tiene el chequeo de SUPERADMIN correcto — no es urgente, solo para que el repo vuelva a reflejar lo real)
