import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, List, Clock } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const STATUS_CFG = {
  pending:   { bg: "#fef3c7", border: "#f59e0b", label: "Pendiente" },
  confirmed: { bg: "#dbeafe", border: "#3b82f6", label: "Confirmada" },
  completed: { bg: "#dcfce7", border: "#39a900", label: "Completada" },
};

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MOCK_WEEK_CITAS = [
  { id: "1", day: 1, hour: 8,  aprendiz: "Laura G.",  status: "confirmed" },
  { id: "2", day: 1, hour: 9,  aprendiz: "Carlos R.", status: "pending"   },
  { id: "3", day: 3, hour: 10, aprendiz: "Ana M.",    status: "completed" },
  { id: "4", day: 3, hour: 14, aprendiz: "Pedro T.",  status: "confirmed" },
  { id: "5", day: 4, hour: 8,  aprendiz: "María L.",  status: "pending"   },
  { id: "6", day: 5, hour: 11, aprendiz: "Diego S.",  status: "confirmed" },
];

function fmtHour(h) {
  if (h < 12) return `${h}:00 a.m.`;
  if (h === 12) return "12:00 p.m.";
  return `${h - 12}:00 p.m.`;
}

export default function ProfessionalAgendaPage() {
  const navigate  = useNavigate();
  const [weekBase, setWeekBase] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");

  const monday = startOfWeek(weekBase, { weekStartsOn: 1 });
  const days   = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const weekLabel = `${format(days[0], "d MMM", { locale: es })} – ${format(days[6], "d MMM yyyy", { locale: es })}`;
  const totalCitas = IS_DEV ? MOCK_WEEK_CITAS.length : 0;

  const getCitasFor = (dayIndex, hour) =>
    MOCK_WEEK_CITAS.filter(c => c.day === dayIndex && c.hour === hour);

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Mi agenda</div>
              <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>Agenda semanal</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 9, padding: "0.25rem", gap: "0.25rem" }}>
                <button onClick={() => setViewMode("week")} style={{ padding: "0.375rem 0.75rem", borderRadius: 7, border: "none", fontFamily: "var(--font-sans)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", background: viewMode === "week" ? "white" : "transparent", color: viewMode === "week" ? "#111827" : "#9ca3af", boxShadow: viewMode === "week" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  <CalendarDays size={14} style={{ display: "inline", marginRight: "0.375rem", verticalAlign: "middle" }} />Semana
                </button>
                <button onClick={() => setViewMode("list")} style={{ padding: "0.375rem 0.75rem", borderRadius: 7, border: "none", fontFamily: "var(--font-sans)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", background: viewMode === "list" ? "white" : "transparent", color: viewMode === "list" ? "#111827" : "#9ca3af", boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  <List size={14} style={{ display: "inline", marginRight: "0.375rem", verticalAlign: "middle" }} />Lista
                </button>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#39a900", background: "#f0fce4", border: "1px solid #bbf7d0", padding: "0.25rem 0.75rem", borderRadius: 20 }}>
                {totalCitas} citas esta semana
              </span>
            </div>
          </div>

          {/* Week nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
            <button onClick={() => setWeekBase(w => subWeeks(w, 1))} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft size={16} color="#374151" />
            </button>
            <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827", minWidth: 160, textAlign: "center" }}>{weekLabel}</span>
            <button onClick={() => setWeekBase(w => addWeeks(w, 1))} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronRight size={16} color="#374151" />
            </button>
            <button onClick={() => setWeekBase(new Date())} style={{ padding: "0.375rem 0.875rem", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontFamily: "var(--font-sans)", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", cursor: "pointer" }}>Hoy</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem" }}>

        {viewMode === "list" ? (
          /* ── Vista lista ── */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {days.map((day, di) => {
              const dayIdx  = day.getDay();
              const dayCitas = MOCK_WEEK_CITAS.filter(c => c.day === dayIdx);
              if (!dayCitas.length && !isToday(day)) return null;
              return (
                <div key={di}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: isToday(day) ? "#39a900" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
                    {format(day, "EEEE d 'de' MMMM", { locale: es })} {isToday(day) && "· Hoy"}
                  </div>
                  {dayCitas.length === 0
                    ? <div style={{ fontSize: "0.875rem", color: "#9ca3af", padding: "0.75rem 1rem", background: "white", borderRadius: 10, border: "1px solid #f3f4f6" }}>Sin citas</div>
                    : dayCitas.map(c => {
                        const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                        return (
                          <div key={c.id} onClick={() => navigate(`/cita/${c.id}`)} style={{ display: "flex", alignItems: "center", gap: "1rem", background: "white", borderRadius: 10, border: "1px solid #e5e7eb", borderLeft: `4px solid ${cfg.border}`, padding: "0.875rem 1.25rem", cursor: "pointer", marginBottom: "0.5rem", transition: "box-shadow 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                            <Clock size={15} color="#9ca3af" />
                            <span style={{ fontWeight: 700, color: "#374151", minWidth: 70 }}>{fmtHour(c.hour)}</span>
                            <span style={{ fontWeight: 600, color: "#111827", flex: 1 }}>{c.aprendiz}</span>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: cfg.border, background: cfg.bg, padding: "0.2rem 0.6rem", borderRadius: 20 }}>{cfg.label}</span>
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vista semana ── */
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: "2px solid #f3f4f6" }}>
              <div style={{ padding: "0.75rem 0.5rem", borderRight: "1px solid #f3f4f6" }} />
              {days.map((day, di) => {
                const today = isToday(day);
                return (
                  <div key={di} style={{ padding: "0.75rem 0.5rem", textAlign: "center", borderRight: di < 6 ? "1px solid #f3f4f6" : "none", background: today ? "#f0fce4" : "transparent" }}>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: today ? "#39a900" : "#9ca3af", textTransform: "uppercase" }}>{DAY_NAMES[day.getDay()]}</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: today ? "#39a900" : "#111827", marginTop: "0.125rem" }}>{format(day, "d")}</div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour, hi) => (
              <div key={hour} style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: hi < HOURS.length - 1 ? "1px solid #f9fafb" : "none", minHeight: 52 }}>
                <div style={{ padding: "0.375rem 0.5rem", borderRight: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.6875rem", color: "#9ca3af", fontWeight: 500 }}>{fmtHour(hour)}</span>
                </div>
                {days.map((day, di) => {
                  const citas = getCitasFor(day.getDay(), hour);
                  const today  = isToday(day);
                  return (
                    <div key={di} style={{ borderRight: di < 6 ? "1px solid #f9fafb" : "none", padding: "0.25rem", background: today ? "rgba(57,169,0,0.02)" : "transparent", verticalAlign: "top" }}>
                      {citas.map(c => {
                        const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                        return (
                          <div key={c.id} onClick={() => navigate(`/cita/${c.id}`)} style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}`, borderRadius: "0 6px 6px 0", padding: "0.25rem 0.375rem", cursor: "pointer", marginBottom: "0.25rem" }}>
                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: cfg.border }}>{fmtHour(hour)}</div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.aprendiz}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Leyenda */}
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: cfg.bg, border: `2px solid ${cfg.border}` }} />
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
