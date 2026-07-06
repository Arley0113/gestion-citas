import { describe, it, expect } from "vitest";
import { P, ROLE_PERMISSIONS, ALL_ROLES, ROLE_LABELS } from "../../shared/rbac/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Estructura de constantes
// ─────────────────────────────────────────────────────────────────────────────
describe("P — constantes de permisos", () => {
  it("define exactamente 26 permisos únicos", () => {
    const values = Object.values(P);
    expect(values.length).toBe(26);
    expect(new Set(values).size).toBe(26); // no hay duplicados
  });

  it("todos los valores son strings no vacíos con formato 'dominio.accion'", () => {
    Object.values(P).forEach(v => {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
      expect(v).toContain(".");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Roles definidos
// ─────────────────────────────────────────────────────────────────────────────
describe("ALL_ROLES — catálogo de roles", () => {
  it("contiene exactamente 7 roles", () => {
    expect(ALL_ROLES.length).toBe(7);
  });

  it("incluye los 7 roles esperados", () => {
    const expected = ["APRENDIZ", "PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL", "COORDINACION", "ADMINISTRADOR", "SUPERADMIN"];
    expected.forEach(r => expect(ALL_ROLES).toContain(r));
  });

  it("cada rol tiene su etiqueta en ROLE_LABELS", () => {
    ALL_ROLES.forEach(r => {
      expect(ROLE_LABELS[r]).toBeDefined();
      expect(typeof ROLE_LABELS[r]).toBe("string");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — APRENDIZ: permisos correctos
// ─────────────────────────────────────────────────────────────────────────────
describe("ROLE_PERMISSIONS — APRENDIZ", () => {
  const perms = ROLE_PERMISSIONS.APRENDIZ;

  it("puede crear citas", () => expect(perms).toContain(P.APPOINTMENTS_CREATE));
  it("puede ver sus propias citas", () => expect(perms).toContain(P.APPOINTMENTS_READ_OWN));
  it("puede cancelar sus propias citas", () => expect(perms).toContain(P.APPOINTMENTS_CANCEL_OWN));

  it("NO puede ver citas de otros", () => {
    expect(perms).not.toContain(P.APPOINTMENTS_READ_DEPT);
    expect(perms).not.toContain(P.APPOINTMENTS_READ_ALL);
  });
  it("NO puede confirmar citas", () => expect(perms).not.toContain(P.APPOINTMENTS_CONFIRM));
  it("NO puede escribir notas clínicas", () => expect(perms).not.toContain(P.APPOINTMENTS_NOTES_WRITE));
  it("NO puede leer notas clínicas", () => expect(perms).not.toContain(P.APPOINTMENTS_NOTES_READ));
  it("NO puede acceder a usuarios", () => {
    expect(perms).not.toContain(P.USERS_READ);
    expect(perms).not.toContain(P.USERS_CREATE);
  });
  it("NO tiene permisos de sistema", () => {
    expect(perms).not.toContain(P.SYSTEM_CONFIG);
    expect(perms).not.toContain(P.SYSTEM_AUDIT);
    expect(perms).not.toContain(P.SYSTEM_DB);
  });
  it("tiene exactamente 3 permisos", () => expect(perms.length).toBe(3));
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Profesionales (Psicología, Enfermería, Trabajo Social)
// ─────────────────────────────────────────────────────────────────────────────
describe("ROLE_PERMISSIONS — Profesionales", () => {
  const PROF_ROLES = ["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL"];

  it("los tres roles tienen los mismos permisos", () => {
    const base = ROLE_PERMISSIONS.PSICOLOGIA;
    PROF_ROLES.slice(1).forEach(r => {
      expect(ROLE_PERMISSIONS[r]).toEqual(base);
    });
  });

  PROF_ROLES.forEach(rol => {
    describe(rol, () => {
      const perms = ROLE_PERMISSIONS[rol];

      it("puede ver citas de su dependencia", () => expect(perms).toContain(P.APPOINTMENTS_READ_DEPT));
      it("puede confirmar citas", () => expect(perms).toContain(P.APPOINTMENTS_CONFIRM));
      it("puede iniciar atención", () => expect(perms).toContain(P.APPOINTMENTS_START));
      it("puede completar atención", () => expect(perms).toContain(P.APPOINTMENTS_COMPLETE));
      it("puede marcar no asistió", () => expect(perms).toContain(P.APPOINTMENTS_NO_SHOW));
      it("puede escribir notas clínicas", () => expect(perms).toContain(P.APPOINTMENTS_NOTES_WRITE));
      it("puede leer notas clínicas", () => expect(perms).toContain(P.APPOINTMENTS_NOTES_READ));
      it("puede ver usuarios", () => expect(perms).toContain(P.USERS_READ));
      it("puede ver historial de dependencia", () => expect(perms).toContain(P.HISTORY_READ));

      it("NO puede ver todas las citas", () => expect(perms).not.toContain(P.APPOINTMENTS_READ_ALL));
      it("NO puede cancelar cualquier cita", () => expect(perms).not.toContain(P.APPOINTMENTS_CANCEL_ANY));
      it("NO puede crear usuarios", () => expect(perms).not.toContain(P.USERS_CREATE));
      it("NO tiene permisos de sistema", () => {
        expect(perms).not.toContain(P.SYSTEM_CONFIG);
        expect(perms).not.toContain(P.SYSTEM_DB);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — COORDINACION
// ─────────────────────────────────────────────────────────────────────────────
describe("ROLE_PERMISSIONS — COORDINACION", () => {
  const perms = ROLE_PERMISSIONS.COORDINACION;

  it("puede ver todas las citas", () => expect(perms).toContain(P.APPOINTMENTS_READ_ALL));
  it("puede cancelar cualquier cita", () => expect(perms).toContain(P.APPOINTMENTS_CANCEL_ANY));
  it("puede exportar reportes", () => expect(perms).toContain(P.REPORTS_EXPORT));
  it("puede leer notas (solo lectura)", () => expect(perms).toContain(P.APPOINTMENTS_NOTES_READ));
  it("puede ver historial completo", () => expect(perms).toContain(P.HISTORY_READ_ALL));

  it("NO puede escribir notas clínicas", () => expect(perms).not.toContain(P.APPOINTMENTS_NOTES_WRITE));
  it("NO puede crear usuarios", () => expect(perms).not.toContain(P.USERS_CREATE));
  it("NO tiene permisos de sistema", () => {
    expect(perms).not.toContain(P.SYSTEM_CONFIG);
    expect(perms).not.toContain(P.SYSTEM_DB);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────
describe("ROLE_PERMISSIONS — ADMINISTRADOR", () => {
  const perms = ROLE_PERMISSIONS.ADMINISTRADOR;

  it("puede gestionar usuarios (CRUD)", () => {
    [P.USERS_READ, P.USERS_CREATE, P.USERS_UPDATE, P.USERS_DELETE, P.USERS_MANAGE_ROLES].forEach(p =>
      expect(perms).toContain(p)
    );
  });
  it("puede gestionar dependencias", () => expect(perms).toContain(P.DEPS_MANAGE));
  it("puede exportar reportes", () => expect(perms).toContain(P.REPORTS_EXPORT));

  it("NO tiene permiso de configuración del sistema", () => expect(perms).not.toContain(P.SYSTEM_CONFIG));
  it("NO tiene permiso de auditoría del sistema", () => expect(perms).not.toContain(P.SYSTEM_AUDIT));
  it("NO tiene permiso de base de datos", () => expect(perms).not.toContain(P.SYSTEM_DB));
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — SUPERADMIN
// ─────────────────────────────────────────────────────────────────────────────
describe("ROLE_PERMISSIONS — SUPERADMIN", () => {
  const perms = ROLE_PERMISSIONS.SUPERADMIN;
  const total = Object.values(P).length;

  it("tiene TODOS los permisos del sistema", () => {
    expect(perms.length).toBe(total);
  });

  it("incluye permisos de sistema (config, audit, db)", () => {
    expect(perms).toContain(P.SYSTEM_CONFIG);
    expect(perms).toContain(P.SYSTEM_AUDIT);
    expect(perms).toContain(P.SYSTEM_DB);
  });

  it("no tiene permisos duplicados", () => {
    expect(new Set(perms).size).toBe(perms.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — Escalación de privilegios (seguridad crítica)
// ─────────────────────────────────────────────────────────────────────────────
describe("Seguridad — escalación de privilegios", () => {
  it("APRENDIZ no puede acceder a ningún permiso de SUPERADMIN exclusivo", () => {
    const aprendizPerms = new Set(ROLE_PERMISSIONS.APRENDIZ);
    const systemPerms = [P.SYSTEM_CONFIG, P.SYSTEM_AUDIT, P.SYSTEM_DB, P.USERS_DELETE, P.USERS_MANAGE_ROLES];
    systemPerms.forEach(p => expect(aprendizPerms.has(p)).toBe(false));
  });

  it("ADMINISTRADOR no puede acceder a permisos de sistema reservados para SUPERADMIN", () => {
    const adminPerms = new Set(ROLE_PERMISSIONS.ADMINISTRADOR);
    expect(adminPerms.has(P.SYSTEM_CONFIG)).toBe(false);
    expect(adminPerms.has(P.SYSTEM_AUDIT)).toBe(false);
    expect(adminPerms.has(P.SYSTEM_DB)).toBe(false);
  });

  it("cada rol tiene al menos un permiso", () => {
    ALL_ROLES.forEach(r => {
      expect(ROLE_PERMISSIONS[r].length).toBeGreaterThan(0);
    });
  });

  it("SUPERADMIN es el único rol con permiso SYSTEM_DB", () => {
    const rolesWithSystemDb = ALL_ROLES.filter(r =>
      ROLE_PERMISSIONS[r].includes(P.SYSTEM_DB)
    );
    expect(rolesWithSystemDb).toEqual(["SUPERADMIN"]);
  });

  it("SUPERADMIN es el único rol con permiso SYSTEM_CONFIG", () => {
    const rolesWithConfig = ALL_ROLES.filter(r =>
      ROLE_PERMISSIONS[r].includes(P.SYSTEM_CONFIG)
    );
    expect(rolesWithConfig).toEqual(["SUPERADMIN"]);
  });
});
