import { useState, useEffect } from "react";
import { Clock, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { DEV_ROLE } from "../../../lib/devMode";
import {
  SCHEDULE_DAYS as DAYS,
  DEFAULT_SCHEDULE,
  countSlots,
  countDaySlots,
  dayBlocks,
  toMinutes,
  normalizeSchedule,
} from "../../../lib/schedule";

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

export default function HorariosPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user || DEV_ROLE) return;
    supabase
      .from("professional_schedules")
      .select("*")
      .eq("professional_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // No mostramos el horario por defecto sin avisar: si el profesional ya
          // tenía uno guardado, "Guardar" ahora mismo lo sobrescribiría con el
          // default sin que se dé cuenta de que la carga falló.
          setLoadFailed(true);
          toast.error("No se pudo cargar tu horario guardado. Recarga la página antes de guardar cambios.");
          return;
        }
        if (data) {
          setSchedule(normalizeSchedule(data.schedule ?? DEFAULT_SCHEDULE));
          setDuration(data.duration_minutes ?? 30);
        }
      });
  }, [user]);

  const toggleDay = (key) => {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], active: !prev[key].active },
    }));
  };

  const toggleBlock2 = (key) => {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], active2: !prev[key].active2 },
    }));
  };

  const setField = (key, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (loadFailed) {
      toast.error("No se pudo confirmar tu horario guardado. Recarga la página antes de guardar.");
      return;
    }
    for (const { key } of DAYS) {
      const d = schedule[key];
      if (!d.active) continue;
      const dayLabel = DAYS.find(x => x.key === key)?.label ?? key;
      const blocks = dayBlocks(d);
      for (const b of blocks) {
        if (toMinutes(b.end) <= toMinutes(b.start)) {
          toast.error(`${dayLabel}: la hora de fin debe ser mayor a la de inicio`);
          return;
        }
      }
      if (blocks.length === 2) {
        const [b1, b2] = blocks;
        const solapan = toMinutes(b1.end) > toMinutes(b2.start) && toMinutes(b2.end) > toMinutes(b1.start);
        if (solapan) {
          toast.error(`${dayLabel}: los bloques de la mañana y la tarde no pueden solaparse`);
          return;
        }
      }
    }
    if (DEV_ROLE) { toast.success("Horarios guardados correctamente"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("professional_schedules")
      .upsert(
        { professional_id: user.id, schedule, duration_minutes: duration },
        { onConflict: "professional_id" }
      );
    setSaving(false);
    if (error) { toast.error("Error al guardar los horarios"); return; }
    toast.success("Horarios guardados correctamente");
  };

  const totalSlots = DAYS.reduce((acc, { key }) => acc + countDaySlots(schedule[key], duration), 0);

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
            Configura tus bloques de atención (mañana y tarde) y la duración de cada cita.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Resumen */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
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
            const slots = countDaySlots(d, duration);
            const selectStyle = { padding: "0.4rem 0.625rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", color: "#111827", background: "white", cursor: "pointer", fontFamily: "var(--font-sans)", outline: "none" };
            return (
              <div
                key={key}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
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

                {/* Bloques */}
                {d.active ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: "1 1 320px", minWidth: 0 }}>
                    {/* Bloque 1 — mañana */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", width: 58, flexShrink: 0 }}>
                        Mañana
                      </span>
                      <select value={d.start} onChange={e => setField(key, "start", e.target.value)} style={selectStyle}>
                        {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select>
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>hasta</span>
                      <select value={d.end} onChange={e => setField(key, "end", e.target.value)} style={selectStyle}>
                        {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                      </select>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        <strong style={{ color: "#39a900" }}>{countSlots(d.start, d.end, duration)}</strong> slots
                      </span>
                    </div>
                    {/* Bloque 2 — tarde */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                      <button
                        onClick={() => toggleBlock2(key)}
                        aria-label={`Activar/desactivar bloque de la tarde de ${label}`}
                        style={{
                          width: 44, height: 24, borderRadius: 12,
                          background: d.active2 ? "#39a900" : "#d1d5db",
                          border: "none", cursor: "pointer",
                          position: "relative", transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: "absolute",
                          top: 2, left: d.active2 ? 22 : 2,
                          width: 20, height: 20,
                          borderRadius: "50%", background: "white",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                          transition: "left 0.2s",
                        }} />
                      </button>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", width: 58, flexShrink: 0 }}>
                        Tarde
                      </span>
                      {d.active2 ? (
                        <>
                          <select value={d.start2} onChange={e => setField(key, "start2", e.target.value)} style={selectStyle}>
                            {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                          </select>
                          <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>hasta</span>
                          <select value={d.end2} onChange={e => setField(key, "end2", e.target.value)} style={selectStyle}>
                            {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                          </select>
                          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            <strong style={{ color: "#39a900" }}>{countSlots(d.start2, d.end2, duration)}</strong> slots
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: "0.8125rem", color: "#9ca3af", fontStyle: "italic" }}>Sin bloque de la tarde</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: "0.875rem", color: "#6b7280", fontStyle: "italic" }}>No disponible</div>
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
