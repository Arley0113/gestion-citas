// Horario de atención de los profesionales: dos bloques por día
// (mañana 08:00-11:00 y tarde 14:00-17:00 por defecto).
//
// Cada día guarda { active, start, end, active2, start2, end2 }. Los horarios
// guardados antes de esta migración no traen el segundo bloque: normalizeSchedule
// los completa como inactivo para no romper ni la UI ni la RPC get_dependency_slots.

export const SCHEDULE_DAYS = [
  { key: "lunes",     label: "Lunes" },
  { key: "martes",    label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves",    label: "Jueves" },
  { key: "viernes",   label: "Viernes" },
  { key: "sabado",    label: "Sábado" },
];

// Índice de día de la semana (0 = domingo) → clave del objeto schedule.
export const DAY_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export const DEFAULT_SCHEDULE = {
  lunes:     { active: true,  start: "08:00", end: "11:00", active2: true,  start2: "14:00", end2: "17:00" },
  martes:    { active: true,  start: "08:00", end: "11:00", active2: true,  start2: "14:00", end2: "17:00" },
  miercoles: { active: true,  start: "08:00", end: "11:00", active2: true,  start2: "14:00", end2: "17:00" },
  jueves:    { active: true,  start: "08:00", end: "11:00", active2: true,  start2: "14:00", end2: "17:00" },
  viernes:   { active: true,  start: "08:00", end: "11:00", active2: true,  start2: "14:00", end2: "17:00" },
  sabado:    { active: false, start: "08:00", end: "12:00", active2: false, start2: "14:00", end2: "17:00" },
};

// Ventanas en las que un aprendiz PUEDE agendar: 8:00-11:00 y 14:00-17:00.
// Se aplican en AppointmentModal y en la RPC get_dependency_slots para que,
// aunque un horario guardado cubra más (p. ej. el antiguo 08:00-17:00),
// nunca se ofrezcan horas fuera de estas ventanas.
export const BOOKING_WINDOWS = [
  { start: "08:00", end: "11:00" },
  { start: "14:00", end: "17:00" },
];

// Horario genérico de respaldo cuando nadie en la dependencia/sede ha
// configurado "Mis horarios" todavía (AppointmentModal.jsx).
export const FALLBACK_HOUR_VALUES = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"];

export function countSlots(start, end, duration) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin <= 0) return 0;
  return Math.floor(totalMin / duration);
}

export function toMinutes(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ¿Esta hora de inicio está dentro de una ventana de agendamiento?
// (inicio incluido, fin excluido: un slot de 10:30 dura hasta 11:00 y sí
// cabe; un slot a las 11:00 exactas no se ofrece).
export function isBookableTime(hhmm) {
  const t = toMinutes(hhmm);
  return BOOKING_WINDOWS.some(w => t >= toMinutes(w.start) && t < toMinutes(w.end));
}

export function normalizeSchedule(raw) {
  const out = {};
  for (const { key } of SCHEDULE_DAYS) {
    const d = raw?.[key] ?? {};
    const def = DEFAULT_SCHEDULE[key];
    out[key] = {
      active: d.active ?? def.active,
      start: d.start ?? def.start,
      end: d.end ?? def.end,
      active2: d.active2 ?? false,
      start2: d.start2 ?? d.start ?? def.start2,
      end2: d.end2 ?? d.end ?? def.end2,
    };
  }
  return out;
}

// Bloques activos de un día en orden: [{ start, end }, ...]
export function dayBlocks(day) {
  if (!day) return [];
  const blocks = [];
  if (day.active && day.start && day.end) blocks.push({ start: day.start, end: day.end });
  if (day.active2 && day.start2 && day.end2) blocks.push({ start: day.start2, end: day.end2 });
  return blocks;
}

export function countDaySlots(day, duration) {
  return dayBlocks(day).reduce((acc, b) => acc + countSlots(b.start, b.end, duration), 0);
}

// Horas (enteras) cubiertas por los bloques de un día, para el grid de la agenda.
export function blockHours(day) {
  const hours = new Set();
  for (const b of dayBlocks(day)) {
    const sh = Number(b.start.split(":")[0]);
    const eh = Number(b.end.split(":")[0]);
    for (let h = sh; h < eh; h += 1) hours.add(h);
  }
  return [...hours];
}
