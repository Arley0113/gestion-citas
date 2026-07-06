# Testing — Bienestar SENA Gestión de Citas

## Stack de pruebas

| Herramienta | Versión | Rol |
|---|---|---|
| Vitest | ^4.1.10 | Test runner (integrado con Vite) |
| @testing-library/react | ^16.3.2 | Tests de componentes React |
| @testing-library/jest-dom | ^6.9.1 | Matchers DOM extendidos |
| @testing-library/user-event | ^14.6.1 | Simulación de interacciones |
| jsdom | ^29.1.1 | Entorno DOM en Node |

## Comandos

```bash
npm test              # Ejecuta todos los tests (una sola vez)
npm run test:watch    # Modo watch — re-ejecuta al guardar archivos
npm run test:ui       # Abre UI visual de Vitest en el navegador
npm run test:coverage # Genera reporte de cobertura en /coverage
```

## Estructura de tests

```
src/test/
  setup.js                          # Setup global: importa @testing-library/jest-dom
  rbac/
    permissions.test.js             # RBAC: permisos por rol, seguridad, escalación
  utils/
    formatters.test.js              # formatTime, timeLabel, duración, estados
  business/
    appointments.test.js            # Filtros de citas, mood, onboarding, encuesta, cronómetro
  security/
    notifications.test.js           # Sanitización XSS en emails, autenticación de cron
```

## Resumen de pruebas (147 tests — todos pasan ✅)

### `rbac/permissions.test.js` — 59 tests

| Suite | Tests | Descripción |
|---|---|---|
| P — constantes de permisos | 2 | 26 permisos únicos, formato correcto |
| ALL_ROLES — catálogo | 3 | 7 roles, etiquetas definidas |
| APRENDIZ | 9 | Solo puede crear/ver/cancelar sus propias citas. No accede a notas, usuarios ni sistema |
| PSICOLOGIA / ENFERMERIA / TRABAJO_SOCIAL | 3×12 | Mismos permisos entre sí. Pueden confirmar, iniciar, completar, notas clínicas. No ven todas las citas |
| COORDINACION | 7 | Ve todas las citas, cancela cualquiera, exporta reportes. No escribe notas |
| ADMINISTRADOR | 4 | CRUD de usuarios, gestionar dependencias. Sin permisos de sistema (config, audit, db) |
| SUPERADMIN | 3 | Todos los permisos. Sin duplicados |
| Seguridad — escalación | 5 | APRENDIZ no accede a permisos de sistema. ADMIN sin system.config/audit/db. Solo SUPERADMIN tiene SYSTEM_DB y SYSTEM_CONFIG |

### `utils/formatters.test.js` — 33 tests

| Suite | Tests | Descripción |
|---|---|---|
| formatTime | 10 | Medianoche, mañana, mediodía, tarde, minutos con cero, bug previo de `:00` fijo |
| timeLabel | 7 | Equivalente a formatTime, consistencia entre ambas funciones |
| Duración de citas | 4 | Mínimo 1 minuto, 30 min, 60 min, null sin startedAt |
| Status de citas | 4 | 6 estados, etiquetas en español, flujo normal del ciclo |

### `business/appointments.test.js` — 38 tests

| Suite | Tests | Descripción |
|---|---|---|
| Filtros de pestañas | 8 | Proximas (pending+confirmed), Pasadas (completed+no_show), Canceladas, filtro por dependencia, búsqueda case-insensitive, sin resultados |
| Mood widget | 4 | 5 estados, todos con emoji+label, búsqueda por etiqueta para restaurar estado |
| Validaciones de onboarding | 8 | Paso 1 (nombre/apellido ≥2 chars, no espacios), Paso 2 (tipo doc, número ≥6 chars, programa) |
| Encuesta de satisfacción | 5 | Rating 1-5 válido, rating 0 inválido, límite 400 chars, trim, null si vacío |
| Cronómetro useElapsed | 5 | Sin datos retorna 0, calcula 30 min, nunca negativo (cita futura), prefiere startedAt |

### `security/notifications.test.js` — 17 tests

| Suite | Tests | Descripción |
|---|---|---|
| Sanitización XSS en emails | 7 | Escapa `<`, `>`, `&`, `"`, null/undefined sin error, texto normal intacto, inyección de img+onerror neutralizada |
| fmtTime en emails | 4 | Formato de hora en plantillas de email (09:00, 12:00, 00:00, 14:30) |
| Autenticación send-reminders | 6 | Autoriza con service-role, con CRON_SECRET; rechaza sin credenciales, secreto incorrecto, Bearer incorrecto, CRON_SECRET no configurado |

## Casos de seguridad críticos verificados

1. **Escalación de privilegios** — APRENDIZ no puede acceder a ningún permiso de SUPERADMIN. ADMINISTRADOR no tiene `system.config`, `system.audit` ni `system.db`.
2. **Exclusividad SUPERADMIN** — `SYSTEM_DB` y `SYSTEM_CONFIG` solo pertenecen a SUPERADMIN.
3. **XSS en emails** — La función `esc()` neutraliza etiquetas HTML en nombres de usuario y datos que van al cuerpo del email.
4. **Autenticación del cron** — `send-reminders` rechaza cualquier petición sin `CRON_SECRET` válido o `service-role key` correcta.

## Qué NO está cubierto (pruebas futuras)

| Área | Motivo / Dificultad |
|---|---|
| Integración con Supabase | Requiere instancia real o mock complejo (Auth + RLS). Mejor cubierto con tests E2E |
| Flujo de auth (login/logout/refresh) | Depende de Supabase Auth; se prueba manualmente en el browser |
| Renderizado de componentes React | Pendiente: agregar tests de componentes para `AppointmentDetail`, `AprendizDashboard`, `AttentionInProgress` |
| Edge Functions (Deno) | Requieren runtime Deno; la lógica de negocio está cubierta con tests de unidad |
| Flujo completo E2E | Playwright (próximo paso recomendado) |

## Convenciones

- Un archivo de test por dominio, en `src/test/<dominio>/`
- Las funciones puras se importan/reproducen directamente — sin mocks complejos
- Nombres de tests en español para que coincidan con la documentación del negocio
- Suite de seguridad siempre presente para los módulos críticos (RBAC, notificaciones)

## Ejecución en CI (GitHub Actions — pendiente configurar)

```yaml
- name: Run tests
  run: npm test
```

Los tests no requieren variables de entorno ni conexión a Supabase.
