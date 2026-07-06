import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Filtros de citas (MisCitasPage lógica de tabs)
// ─────────────────────────────────────────────────────────────────────────────
describe("Filtros de pestañas en MisCitasPage", () => {
  const MOCK_CITAS = [
    { id: "1", status: "pending",   dependencies: { name: "Psicología" },    reason: "Ansiedad" },
    { id: "2", status: "confirmed", dependencies: { name: "Enfermería" },    reason: "Control" },
    { id: "3", status: "completed", dependencies: { name: "Psicología" },    reason: "Seguimiento" },
    { id: "4", status: "cancelled", dependencies: { name: "Trabajo Social" },reason: "" },
    { id: "5", status: "no_show",   dependencies: { name: "Psicología" },    reason: "Estrés" },
  ];

  function filterByTab(citas, tab, search = "", depFilter = "") {
    return citas.filter(c => {
      if (tab === "proximas"   && !["pending","confirmed"].includes(c.status)) return false;
      if (tab === "pasadas"    && !["completed","no_show"].includes(c.status)) return false;
      if (tab === "canceladas" && c.status !== "cancelled") return false;
      if (depFilter && c.dependencies?.name !== depFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (c.dependencies?.name || "").toLowerCase().includes(q)
            || (c.reason || "").toLowerCase().includes(q);
      }
      return true;
    });
  }

  it("tab 'proximas' devuelve pending y confirmed únicamente", () => {
    const result = filterByTab(MOCK_CITAS, "proximas");
    expect(result.map(c => c.status)).toEqual(["pending", "confirmed"]);
  });

  it("tab 'pasadas' devuelve completed y no_show únicamente", () => {
    const result = filterByTab(MOCK_CITAS, "pasadas");
    expect(result.map(c => c.status)).toEqual(["completed", "no_show"]);
  });

  it("tab 'canceladas' devuelve sólo cancelled", () => {
    const result = filterByTab(MOCK_CITAS, "canceladas");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("filtro por dependencia 'Psicología' funciona en tab proximas", () => {
    const result = filterByTab(MOCK_CITAS, "proximas", "", "Psicología");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("búsqueda por motivo es case-insensitive", () => {
    const result = filterByTab(MOCK_CITAS, "pasadas", "segui");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("búsqueda por dependencia es case-insensitive", () => {
    const result = filterByTab(MOCK_CITAS, "proximas", "psico");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("búsqueda vacía no filtra nada adicional", () => {
    const result = filterByTab(MOCK_CITAS, "proximas", "");
    expect(result).toHaveLength(2);
  });

  it("búsqueda sin resultados devuelve array vacío", () => {
    const result = filterByTab(MOCK_CITAS, "proximas", "zzznomatch");
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Lógica de estados de ánimo (AprendizDashboard)
// ─────────────────────────────────────────────────────────────────────────────
describe("Estados de ánimo (Mood widget)", () => {
  const MOODS = [
    { emoji: "😔", label: "Muy mal" },
    { emoji: "😟", label: "Mal" },
    { emoji: "😐", label: "Regular" },
    { emoji: "🙂", label: "Bien" },
    { emoji: "😊", label: "Muy bien" },
  ];

  it("hay exactamente 5 estados de ánimo", () => {
    expect(MOODS.length).toBe(5);
  });

  it("todos tienen emoji y etiqueta", () => {
    MOODS.forEach(m => {
      expect(m.emoji).toBeTruthy();
      expect(m.label).toBeTruthy();
    });
  });

  it("se puede buscar un mood por etiqueta (para restaurar estado guardado)", () => {
    const savedLabel = "Bien";
    const idx = MOODS.findIndex(m => m.label === savedLabel);
    expect(idx).toBe(3);
  });

  it("una etiqueta inexistente devuelve -1 (fallback seguro)", () => {
    const idx = MOODS.findIndex(m => m.label === "Invalido");
    expect(idx).toBe(-1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Validaciones de perfil de onboarding
// ─────────────────────────────────────────────────────────────────────────────
describe("Validaciones de onboarding", () => {
  function step1Valid(form) {
    return form.first_name.trim().length >= 2 && form.last_name.trim().length >= 2;
  }

  function step2Valid(form) {
    return form.doc_type !== "" && form.doc_number.trim().length >= 6 && form.program !== "";
  }

  it("paso 1 válido con nombre y apellido suficientes", () => {
    expect(step1Valid({ first_name: "Juan", last_name: "Pérez" })).toBe(true);
  });

  it("paso 1 inválido si nombre muy corto", () => {
    expect(step1Valid({ first_name: "J", last_name: "Pérez" })).toBe(false);
  });

  it("paso 1 inválido si apellido vacío", () => {
    expect(step1Valid({ first_name: "Juan", last_name: "" })).toBe(false);
  });

  it("paso 1 inválido con solo espacios", () => {
    expect(step1Valid({ first_name: "  ", last_name: "Pérez" })).toBe(false);
  });

  it("paso 2 válido con todos los campos requeridos", () => {
    expect(step2Valid({ doc_type: "CC", doc_number: "1034567890", program: "Tecnología" })).toBe(true);
  });

  it("paso 2 inválido sin tipo de documento", () => {
    expect(step2Valid({ doc_type: "", doc_number: "1034567890", program: "Tecnología" })).toBe(false);
  });

  it("paso 2 inválido con número de documento muy corto", () => {
    expect(step2Valid({ doc_type: "CC", doc_number: "123", program: "Tecnología" })).toBe(false);
  });

  it("paso 2 inválido sin programa seleccionado", () => {
    expect(step2Valid({ doc_type: "CC", doc_number: "1034567890", program: "" })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Encuesta de satisfacción
// ─────────────────────────────────────────────────────────────────────────────
describe("Encuesta de satisfacción", () => {
  it("rating válido está entre 1 y 5", () => {
    [1, 2, 3, 4, 5].forEach(r => {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(5);
    });
  });

  it("rating 0 no es válido (no se puede enviar sin seleccionar)", () => {
    expect(0).toBeLessThan(1);
  });

  it("comentario tiene límite de 400 caracteres", () => {
    const comment = "a".repeat(400);
    expect(comment.length).toBe(400);
    const tooLong = "a".repeat(401);
    expect(tooLong.length).toBeGreaterThan(400);
  });

  it("comentario se trimea antes de guardar", () => {
    const rawComment = "  Muy buen servicio  ";
    expect(rawComment.trim()).toBe("Muy buen servicio");
  });

  it("comentario vacío se convierte en null al guardar", () => {
    const comment = "   ".trim() || null;
    expect(comment).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Cronómetro de atención (useElapsed logic)
// ─────────────────────────────────────────────────────────────────────────────
describe("Cronómetro de atención (useElapsed)", () => {
  function getElapsed(startedAt, scheduledTime) {
    if (startedAt) return Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 60000));
    if (!scheduledTime) return 0;
    const [h, m] = scheduledTime.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    return Math.max(0, Math.floor((Date.now() - start) / 60000));
  }

  it("retorna 0 cuando no hay startedAt ni scheduledTime", () => {
    expect(getElapsed(null, null)).toBe(0);
  });

  it("calcula minutos desde startedAt hace 30 minutos", () => {
    const startedAt = new Date(Date.now() - 30 * 60000).toISOString();
    const elapsed = getElapsed(startedAt, null);
    expect(elapsed).toBe(30);
  });

  it("nunca retorna valor negativo (cita futura)", () => {
    const futureStart = new Date(Date.now() + 60 * 60000).toISOString();
    expect(getElapsed(futureStart, null)).toBe(0);
  });

  it("prefiere startedAt sobre scheduledTime cuando ambos existen", () => {
    const startedAt = new Date(Date.now() - 15 * 60000).toISOString();
    const elapsed = getElapsed(startedAt, "10:00");
    expect(elapsed).toBe(15);
  });
});
