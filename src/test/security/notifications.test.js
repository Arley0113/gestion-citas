import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Sanitización de HTML en emails (supabase/functions/notify-appointment/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

// Misma función esc() usada en notify-appointment (el HTML del correo se reconstruye
// server-side ahí; notifications.js en el cliente solo dispara el evento)
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("Sanitización HTML en emails (esc)", () => {
  it("escapa < para prevenir XSS", () => {
    expect(esc("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
  });

  it("escapa > ", () => {
    expect(esc("1 > 0")).toBe("1 &gt; 0");
  });

  it("escapa & (entidad HTML)", () => {
    expect(esc("Bienestar & Salud")).toBe("Bienestar &amp; Salud");
  });

  it("escapa comillas dobles (atributos HTML)", () => {
    expect(esc('href="malicious"')).toBe("href=&quot;malicious&quot;");
  });

  it("maneja null y undefined sin lanzar error", () => {
    expect(() => esc(null)).not.toThrow();
    expect(() => esc(undefined)).not.toThrow();
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });

  it("texto normal no se modifica", () => {
    expect(esc("Juan Pérez")).toBe("Juan Pérez");
    expect(esc("Psicología")).toBe("Psicología");
  });

  it("previene inyección de etiquetas en el nombre del usuario", () => {
    const maliciousName = '<img src=x onerror="alert(1)">';
    const escaped = esc(maliciousName);
    // Las etiquetas HTML quedan escapadas (no ejecutables por el navegador)
    expect(escaped).not.toContain("<img");   // el tag real desaparece
    expect(escaped).not.toContain("</");     // no hay etiquetas de cierre
    expect(escaped).toContain("&lt;img");    // queda como texto plano inofensivo
    expect(escaped).toContain("&gt;");       // el cierre > también escapado
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Formato de hora en emails (fmtTime)
// ─────────────────────────────────────────────────────────────────────────────
function fmtTime(t = "") {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

describe("fmtTime en plantillas de email", () => {
  it("formatea 09:00 como '9:00 a.m.'", () => {
    expect(fmtTime("09:00")).toBe("9:00 a.m.");
  });

  it("formatea 12:00 como '12:00 p.m.'", () => {
    expect(fmtTime("12:00")).toBe("12:00 p.m.");
  });

  it("formatea 00:00 como '12:00 a.m.'", () => {
    expect(fmtTime("00:00")).toBe("12:00 a.m.");
  });

  it("formatea 14:30 como '2:30 p.m.'", () => {
    expect(fmtTime("14:30")).toBe("2:30 p.m.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Autenticación de send-reminders
// ─────────────────────────────────────────────────────────────────────────────
describe("Autenticación de send-reminders", () => {
  // Lógica extraída de supabase/functions/send-reminders/index.ts
  function isAuthorized(cronSecret, providedSecret, serviceKey, authHeader) {
    const isService = serviceKey && authHeader === `Bearer ${serviceKey}`;
    if (isService) return true;
    if (cronSecret && providedSecret === cronSecret) return true;
    return false;
  }

  const SECRET = "mi-secreto-seguro-abc123";
  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role";

  it("autoriza con service-role key correcta", () => {
    expect(isAuthorized(null, null, SERVICE_KEY, `Bearer ${SERVICE_KEY}`)).toBe(true);
  });

  it("autoriza con CRON_SECRET correcto", () => {
    expect(isAuthorized(SECRET, SECRET, "", "")).toBe(true);
  });

  it("rechaza si no hay ninguna credencial", () => {
    expect(isAuthorized(null, null, "", "")).toBe(false);
  });

  it("rechaza con CRON_SECRET incorrecto", () => {
    expect(isAuthorized(SECRET, "secreto-incorrecto", "", "")).toBe(false);
  });

  it("rechaza con Authorization Bearer incorrecto", () => {
    expect(isAuthorized(null, null, SERVICE_KEY, "Bearer otro-key")).toBe(false);
  });

  it("rechaza si CRON_SECRET no está configurado (null) aunque se provea un valor", () => {
    expect(isAuthorized(null, "cualquier-cosa", "", "")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Autorización de notify-appointment (cierra el relay de correo abierto:
// el destinatario/asunto/HTML ya no vienen del cliente, pero cualquier autenticado
// podía antes disparar el correo de CUALQUIER cita con solo el appointment_id)
// ─────────────────────────────────────────────────────────────────────────────
describe("Autorización de notify-appointment", () => {
  const STAFF_ROLES = ["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL", "COORDINACION", "ADMINISTRADOR", "SUPERADMIN"];

  // Misma lógica que supabase/functions/notify-appointment/index.ts
  function isAuthorizedToNotify(callerId, appointmentUserId, callerRoleName) {
    if (callerId === appointmentUserId) return true;
    return STAFF_ROLES.includes(callerRoleName);
  }

  it("autoriza al propio dueño de la cita", () => {
    expect(isAuthorizedToNotify("user-1", "user-1", "APRENDIZ")).toBe(true);
  });

  it("autoriza a un profesional/staff aunque no sea el dueño de la cita", () => {
    expect(isAuthorizedToNotify("staff-1", "user-1", "PSICOLOGIA")).toBe(true);
    expect(isAuthorizedToNotify("admin-1", "user-1", "ADMINISTRADOR")).toBe(true);
  });

  it("rechaza a un aprendiz que no es dueño de la cita (el bug del relay abierto)", () => {
    expect(isAuthorizedToNotify("aprendiz-atacante", "user-1", "APRENDIZ")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — invite-staff no permite escalar a SUPERADMIN
// ─────────────────────────────────────────────────────────────────────────────
describe("invite-staff bloquea escalación a SUPERADMIN", () => {
  // Misma lógica que supabase/functions/invite-staff/index.ts
  function canAssignRole(targetRoleName, callerRoleName) {
    if (targetRoleName === "SUPERADMIN" && callerRoleName !== "SUPERADMIN") return false;
    return true;
  }

  it("un ADMINISTRADOR no puede asignar SUPERADMIN", () => {
    expect(canAssignRole("SUPERADMIN", "ADMINISTRADOR")).toBe(false);
  });

  it("un SUPERADMIN sí puede asignar SUPERADMIN", () => {
    expect(canAssignRole("SUPERADMIN", "SUPERADMIN")).toBe(true);
  });

  it("un ADMINISTRADOR puede asignar roles de staff normales", () => {
    expect(canAssignRole("PSICOLOGIA", "ADMINISTRADOR")).toBe(true);
    expect(canAssignRole("COORDINACION", "ADMINISTRADOR")).toBe(true);
  });
});
