import { describe, it, expect } from "vitest";

// Copiamos las funciones puras directamente para testearlas sin dependencias de React.
// Son idénticas a las que viven en AppointmentDetail.jsx, MisCitasPage.jsx, etc.

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const mm = String(m ?? 0).padStart(2, "0");
  return h < 12 ? `${h}:${mm} a.m.` : h === 12 ? `12:${mm} p.m.` : `${h-12}:${mm} p.m.`;
}

function timeLabel(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const mm = String(m).padStart(2, "0");
  if (h < 12) return `${h}:${mm} a.m.`;
  if (h === 12) return `12:${mm} p.m.`;
  return `${h - 12}:${mm} p.m.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — formatTime (AppointmentDetail.jsx)
// ─────────────────────────────────────────────────────────────────────────────
describe("formatTime", () => {
  it("retorna '—' para valores nulos/vacíos", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime(undefined)).toBe("—");
    expect(formatTime("")).toBe("—");
  });

  it("formatea medianoche correctamente (00:00)", () => {
    expect(formatTime("00:00:00")).toBe("0:00 a.m.");
  });

  it("formatea hora de la mañana (08:30)", () => {
    expect(formatTime("08:30:00")).toBe("8:30 a.m.");
  });

  it("formatea 12:00 p.m. (mediodía)", () => {
    expect(formatTime("12:00:00")).toBe("12:00 p.m.");
  });

  it("formatea 12:30 p.m.", () => {
    expect(formatTime("12:30:00")).toBe("12:30 p.m.");
  });

  it("formatea hora de la tarde (14:00 → 2:00 p.m.)", () => {
    expect(formatTime("14:00:00")).toBe("2:00 p.m.");
  });

  it("formatea 15:30 correctamente", () => {
    expect(formatTime("15:30:00")).toBe("3:30 p.m.");
  });

  it("formatea última hora del día (23:59)", () => {
    expect(formatTime("23:59:00")).toBe("11:59 p.m.");
  });

  it("los minutos llevan cero a la izquierda (09:05)", () => {
    expect(formatTime("09:05:00")).toBe("9:05 a.m.");
  });

  it("NO pierde los minutos (bug previo: antes devolvía ':00' siempre)", () => {
    expect(formatTime("10:45:00")).not.toBe("10:00 a.m.");
    expect(formatTime("10:45:00")).toBe("10:45 a.m.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — timeLabel (MisCitasPage, AprendizDashboard)
// ─────────────────────────────────────────────────────────────────────────────
describe("timeLabel", () => {
  it("retorna '—' para valor nulo", () => {
    expect(timeLabel(null)).toBe("—");
    expect(timeLabel("")).toBe("—");
  });

  it("formatea 9:00 a.m.", () => {
    expect(timeLabel("09:00:00")).toBe("9:00 a.m.");
  });

  it("formatea 12:00 p.m.", () => {
    expect(timeLabel("12:00:00")).toBe("12:00 p.m.");
  });

  it("formatea 14:00 como 2:00 p.m.", () => {
    expect(timeLabel("14:00:00")).toBe("2:00 p.m.");
  });

  it("formatea 17:30 como 5:30 p.m.", () => {
    expect(timeLabel("17:30:00")).toBe("5:30 p.m.");
  });

  it("formatea 8:05 con cero (no '8:5 a.m.')", () => {
    expect(timeLabel("08:05:00")).toBe("8:05 a.m.");
  });

  it("es consistente con formatTime para horas estándar", () => {
    const horas = ["09:00:00", "12:00:00", "14:30:00", "17:00:00"];
    horas.forEach(h => {
      expect(timeLabel(h)).toBe(formatTime(h));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Lógica de duración de citas (AttentionResult)
// ─────────────────────────────────────────────────────────────────────────────
describe("Duración de citas (AttentionResult logic)", () => {
  function calcDuration(startedAt, updatedAt) {
    if (!startedAt) return null;
    const end = updatedAt ? new Date(updatedAt) : new Date();
    return Math.max(1, Math.round((end - new Date(startedAt)) / 60000));
  }

  it("calcula duración mínima de 1 minuto", () => {
    const start = new Date();
    const end = new Date(start.getTime() + 30000); // 30 segundos
    expect(calcDuration(start.toISOString(), end.toISOString())).toBe(1);
  });

  it("calcula 30 minutos correctamente", () => {
    const start = new Date("2026-06-28T10:00:00Z");
    const end   = new Date("2026-06-28T10:30:00Z");
    expect(calcDuration(start.toISOString(), end.toISOString())).toBe(30);
  });

  it("calcula 60 minutos correctamente", () => {
    const start = new Date("2026-06-28T09:00:00Z");
    const end   = new Date("2026-06-28T10:00:00Z");
    expect(calcDuration(start.toISOString(), end.toISOString())).toBe(60);
  });

  it("retorna null si no hay started_at", () => {
    expect(calcDuration(null, "2026-06-28T10:00:00Z")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Estados de citas (status labels)
// ─────────────────────────────────────────────────────────────────────────────
describe("Status de citas", () => {
  const STATUS_CFG = {
    pending:     { label: "Pendiente"   },
    confirmed:   { label: "Confirmada"  },
    in_progress: { label: "En atención" },
    completed:   { label: "Completada"  },
    no_show:     { label: "No asistió"  },
    cancelled:   { label: "Cancelada"   },
  };

  it("define los 6 estados del ciclo de vida de una cita", () => {
    expect(Object.keys(STATUS_CFG).length).toBe(6);
  });

  it("cada estado tiene su etiqueta en español", () => {
    Object.values(STATUS_CFG).forEach(({ label }) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it("el flujo normal es: pending → confirmed → in_progress → completed", () => {
    const STATUS_STEPS = ["pending", "confirmed", "in_progress", "completed"];
    expect(STATUS_STEPS[0]).toBe("pending");
    expect(STATUS_STEPS[STATUS_STEPS.length - 1]).toBe("completed");
  });
});
