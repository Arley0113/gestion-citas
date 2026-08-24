// ─── Permiso constants ───────────────────────────────────────────────────────
export const P = {
  // Citas — acceso
  APPOINTMENTS_CREATE:      "appointments.create",
  APPOINTMENTS_READ_OWN:    "appointments.read.own",
  APPOINTMENTS_READ_DEPT:   "appointments.read.department",
  APPOINTMENTS_READ_ALL:    "appointments.read.all",
  // Citas — acciones
  APPOINTMENTS_CONFIRM:     "appointments.confirm",
  APPOINTMENTS_START:       "appointments.start",
  APPOINTMENTS_COMPLETE:    "appointments.complete",
  APPOINTMENTS_NO_SHOW:     "appointments.no_show",
  APPOINTMENTS_CANCEL_OWN:  "appointments.cancel.own",
  APPOINTMENTS_CANCEL_ANY:  "appointments.cancel.any",
  // Citas — notas
  APPOINTMENTS_NOTES_WRITE: "appointments.notes.write",
  APPOINTMENTS_NOTES_READ:  "appointments.notes.read",
  // Usuarios
  USERS_READ:               "users.read",
  USERS_CREATE:             "users.create",
  USERS_UPDATE:             "users.update",
  USERS_DELETE:             "users.delete",
  USERS_MANAGE_ROLES:       "users.manage_roles",
  // Dependencias
  DEPS_READ:                "dependencies.read",
  DEPS_MANAGE:              "dependencies.manage",
  // Convocatorias
  CONVOCATORIAS_MANAGE:     "convocatorias.manage",
  // Reportes
  REPORTS_READ:             "reports.read",
  REPORTS_EXPORT:           "reports.export",
  // Historial
  HISTORY_READ:             "history.read",
  HISTORY_READ_ALL:         "history.read.all",
  // Sistema
  SYSTEM_CONFIG:            "system.config",
  SYSTEM_AUDIT:             "system.audit",
  SYSTEM_DB:                "system.db",
};

// ─── Agrupaciones para UI ─────────────────────────────────────────────────────
export const PERMISSION_GROUPS = [
  {
    label: "Citas — Acceso",
    permissions: [P.APPOINTMENTS_CREATE, P.APPOINTMENTS_READ_OWN, P.APPOINTMENTS_READ_DEPT, P.APPOINTMENTS_READ_ALL],
  },
  {
    label: "Citas — Acciones",
    permissions: [P.APPOINTMENTS_CONFIRM, P.APPOINTMENTS_START, P.APPOINTMENTS_COMPLETE, P.APPOINTMENTS_NO_SHOW, P.APPOINTMENTS_CANCEL_OWN, P.APPOINTMENTS_CANCEL_ANY],
  },
  {
    label: "Notas clínicas",
    permissions: [P.APPOINTMENTS_NOTES_WRITE, P.APPOINTMENTS_NOTES_READ],
  },
  {
    label: "Usuarios",
    permissions: [P.USERS_READ, P.USERS_CREATE, P.USERS_UPDATE, P.USERS_DELETE, P.USERS_MANAGE_ROLES],
  },
  {
    label: "Reportes",
    permissions: [P.DEPS_READ, P.REPORTS_READ, P.REPORTS_EXPORT, P.HISTORY_READ, P.HISTORY_READ_ALL],
  },
  {
    label: "Sistema",
    permissions: [P.SYSTEM_CONFIG, P.SYSTEM_AUDIT, P.SYSTEM_DB, P.DEPS_MANAGE],
  },
  {
    label: "Convocatorias",
    permissions: [P.CONVOCATORIAS_MANAGE],
  },
];

export const PERMISSION_LABELS = {
  [P.APPOINTMENTS_CREATE]:      "Crear citas",
  [P.APPOINTMENTS_READ_OWN]:    "Ver propias citas",
  [P.APPOINTMENTS_READ_DEPT]:   "Ver citas de dependencia",
  [P.APPOINTMENTS_READ_ALL]:    "Ver todas las citas",
  [P.APPOINTMENTS_CONFIRM]:     "Confirmar citas",
  [P.APPOINTMENTS_START]:       "Iniciar atención",
  [P.APPOINTMENTS_COMPLETE]:    "Completar atención",
  [P.APPOINTMENTS_NO_SHOW]:     "Marcar no asistió",
  [P.APPOINTMENTS_CANCEL_OWN]:  "Cancelar propias citas",
  [P.APPOINTMENTS_CANCEL_ANY]:  "Cancelar cualquier cita",
  [P.APPOINTMENTS_NOTES_WRITE]: "Escribir notas clínicas",
  [P.APPOINTMENTS_NOTES_READ]:  "Leer notas clínicas",
  [P.USERS_READ]:               "Ver usuarios",
  [P.USERS_CREATE]:             "Crear usuarios",
  [P.USERS_UPDATE]:             "Editar usuarios",
  [P.USERS_DELETE]:             "Eliminar usuarios",
  [P.USERS_MANAGE_ROLES]:       "Gestionar roles",
  [P.DEPS_READ]:                "Ver dependencias",
  [P.DEPS_MANAGE]:              "Gestionar dependencias",
  [P.CONVOCATORIAS_MANAGE]:     "Gestionar convocatorias",
  [P.REPORTS_READ]:             "Ver reportes",
  [P.REPORTS_EXPORT]:           "Exportar reportes",
  [P.HISTORY_READ]:             "Ver historial de dependencia",
  [P.HISTORY_READ_ALL]:         "Ver historial completo",
  [P.SYSTEM_CONFIG]:            "Configuración del sistema",
  [P.SYSTEM_AUDIT]:             "Auditoría del sistema",
  [P.SYSTEM_DB]:                "Gestión de base de datos",
};

// ─── Permisos compartidos por todos los profesionales ─────────────────────────
const PROFESSIONAL_PERMS = [
  P.APPOINTMENTS_READ_DEPT,
  P.APPOINTMENTS_CONFIRM,
  P.APPOINTMENTS_START,
  P.APPOINTMENTS_COMPLETE,
  P.APPOINTMENTS_NO_SHOW,
  P.APPOINTMENTS_NOTES_WRITE,
  P.APPOINTMENTS_NOTES_READ,
  P.USERS_READ,
  P.HISTORY_READ,
];

// ─── Matriz Rol → Permisos ────────────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  APRENDIZ: [
    P.APPOINTMENTS_CREATE,
    P.APPOINTMENTS_READ_OWN,
    P.APPOINTMENTS_CANCEL_OWN,
  ],

  PSICOLOGIA:     PROFESSIONAL_PERMS,
  ENFERMERIA:     PROFESSIONAL_PERMS,
  TRABAJO_SOCIAL: PROFESSIONAL_PERMS,

  COORDINACION: [
    P.APPOINTMENTS_READ_ALL,
    P.APPOINTMENTS_CONFIRM,
    P.APPOINTMENTS_CANCEL_ANY,
    P.APPOINTMENTS_NOTES_READ,
    P.USERS_READ,
    P.USERS_DELETE,
    P.DEPS_READ,
    P.REPORTS_READ,
    P.REPORTS_EXPORT,
    P.HISTORY_READ,
    P.HISTORY_READ_ALL,
  ],

  ADMINISTRADOR: [
    P.APPOINTMENTS_READ_ALL,
    P.APPOINTMENTS_CONFIRM,
    P.APPOINTMENTS_CANCEL_ANY,
    P.APPOINTMENTS_NOTES_READ,
    P.USERS_READ,
    P.USERS_CREATE,
    P.USERS_UPDATE,
    P.USERS_DELETE,
    P.USERS_MANAGE_ROLES,
    P.DEPS_READ,
    P.DEPS_MANAGE,
    P.CONVOCATORIAS_MANAGE,
    P.REPORTS_READ,
    P.REPORTS_EXPORT,
    P.HISTORY_READ,
    P.HISTORY_READ_ALL,
  ],

  SUPERADMIN: Object.values(P),
};

// ─── Etiquetas de roles para UI ───────────────────────────────────────────────
export const ROLE_LABELS = {
  APRENDIZ:       "Aprendiz",
  PSICOLOGIA:     "Psicología",
  ENFERMERIA:     "Enfermería",
  TRABAJO_SOCIAL: "Trabajo Social",
  COORDINACION:   "Coordinación",
  ADMINISTRADOR:  "Administrador",
  SUPERADMIN:     "Super Admin",
};

export const ALL_ROLES = Object.keys(ROLE_PERMISSIONS);
