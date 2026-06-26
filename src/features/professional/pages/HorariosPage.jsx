import { useState } from "react";
import { Clock, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const DAYS = [
  { key: "lunes",     label: "Lunes" },
  { key: "martes",    label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves",    label: "Jueves" },
  { key: "viernes",   label: "Viernes" },
  { key: "sabado",    label: "Sábado" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

const DURATIONS = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hora" },
];

const DEFAULT_SCHEDULE = {
  lunes:     { active: true,  start: "08:00", end: "17:00" },
  martes:    { active: true,  start: "08:00", end: "17:00" },
  miercoles: { active: true,  start: "08:00", end: "17:00" },
  jueves:    { active: true,  start: "08:00", end: "17:00" },
  viernes:   { active: true,  start: "08:00", end: "15:00" },
  sabado:    { active: false, start: "08:00", end: "12:00" },
};

function countSlots(start, end, duration) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin <= 0) return 0;
  return Math.floor(totalMin / duration);
}

export default function HorariosPage() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  const toggleDay = (key) => {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], active: !prev[key].active },
    }));
  };

  const setField = (key, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success("Horarios guardados correctamente");
  };

  const totalSlots = DAYS.reduce((acc, { key }) => {
    const d = schedule[key];
    if (!d.active) return acc;
    return acc + countSlots(d.start, d.end, duration);
  }, 0);

  const activeDays = DAYS.filter(({ key }) => schedule[key].active).length;

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Mi cuenta
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
            Gestión de horarios
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Configura tu disponibilidad semanal y la duración de cada cita.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Resumen */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { label: "Días activos", value: activeDays, icon: CheckCircle2, color: "#39a900", bg: "#f0fce4" },
            { label: "Duración de cita", value: `${duration} min`, icon: Clock, color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Slots / semana", value: totalSlots, icon: AlertCircle, color: "#f59e0b", bg: "#fffbeb" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: "1.125rem 1.25rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: "1.375rem", fontWeight: 800, color: "#111827" }}>{value}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Duración de cita */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.375rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827", marginBottom: "0.875rem" }}>
            Duración por cita
          </div>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                style={{
                  padding: "0.5rem 1.125rem",
                  borderRadius: 8,
                  border: duration === d.value ? "2px solid #39a900" : "1.5px solid #e5e7eb",
                  background: duration === d.value ? "#f0fce4" : "white",
                  color: duration === d.value ? "#39a900" : "#374151",
                  fontWeight: duration === d.value ? 700 : 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.12s",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horarios por día */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "1.125rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>Disponibilidad semanal</div>
          </div>

          {DAYS.map(({ key, label }, i) => {
            const d = schedule[key];
            const slots = d.active ? countSlots(d.start, d.end, duration) : 0;
            return (
              <div
                key={key}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "1rem 1.5rem",
                  borderBottom: i < DAYS.length - 1 ? "1px solid #f9fafb" : "none",
                  background: d.active ? "white" : "#f9fafb",
                  transition: "background 0.12s",
                }}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleDay(key)}
                  aria-label={`Activar/desactivar ${label}`}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: d.active ? "#39a900" : "#d1d5db",
                    border: "none", cursor: "pointer",
                    position: "relative", transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: "absolute",
                    top: 2, left: d.active ? 22 : 2,
                    width: 20, height: 20,
                    borderRadius: "50%", background: "white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "left 0.2s",
                  }} />
                </button>

                {/* Día */}
                <div style={{ width: 90, fontWeight: 600, fontSize: "0.9rem", color: d.active ? "#111827" : "#9ca3af" }}>
                  {label}
                </div>

                {/* Horas */}
                {d.active ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flex: 1 }}>
                    <select
                      value={d.start}
                      onChange={e => setField(key, "start", e.target.value)}
                      style={{ padding: "0.4rem 0.625rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", color: "#111827", background: "white", cursor: "pointer", fontFamily: "var(--font-sans)", outline: "none" }}
                    >
                      {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                    <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>hasta</span>
                    <select
                      value={d.end}
                      onChange={e => setField(key, "end", e.target.value)}
                      style={{ padding: "0.4rem 0.625rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", color: "#111827", background: "white", cursor: "pointer", fontFamily: "var(--font-sans)", outline: "none" }}
                    >
                      {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: "0.875rem", color: "#9ca3af", fontStyle: "italic" }}>No disponible</div>
                )}

                {/* Slots */}
                {d.active && (
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", flexShrink: 0, textAlign: "right", minWidth: 72 }}>
                    <span style={{ fontWeight: 700, color: "#39a900" }}>{slots}</span> slots
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botón guardar */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              background: saving ? "#9ca3af" : "#39a900",
              color: "white", border: "none", borderRadius: 10,
              fontSize: "0.9375rem", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              boxShadow: "0 2px 8px rgba(57,169,0,0.3)",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#2d8600"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#39a900"; }}
          >
            <Save size={16} />
            {saving ? "Guardando…" : "Guardar horarios"}
          </button>
        </div>
      </div>
    </div>
  );
}
