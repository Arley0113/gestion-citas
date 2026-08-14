import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, List, Clock, Loader2 } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { toast } from "sonner";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const STATUS_CFG = {
  pending:   { bg: "#fef3c7", border: "#f59e0b", label: "Pendiente" },
  confirmed: { bg: "#dbeafe", border: "#3b82f6", label: "Confirmada" },
  completed: { bg: "#dcfce7", border: "#39a900", label: "Completada" },
  no_show:   { bg: "#fee2e2", border: "#ef4444", label: "No asistió" },
  cancelled: { bg: "#f3f4f6", border: "#9ca3af", label: "Cancelada" },
};

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MOCK_WEEK_CITAS = [
  { id: "1", scheduled_date: null, _dayIdx: 1, _hour: 8,  profiles: { full_name: "Laura G."  }, status: "confirmed" },
  { id: "2", scheduled_date: null, _dayIdx: 1, _hour: 9,  profiles: { full_name: "Carlos R." }, status: "pending"   },
  { id: "3", scheduled_date: null, _dayIdx: 3, _hour: 10, profiles: { full_name: "Ana M."    }, status: "completed" },
  { id: "4", scheduled_date: null, _dayIdx: 3, _hour: 14, profiles: { full_name: "Pedro T."  }, status: "confirmed" },
  { id: "5", scheduled_date: null, _dayIdx: 4, _hour: 8,  profiles: { full_name: "María L."  }, status: "pending"   },
  { id: "6", scheduled_date: null, _dayIdx: 5, _hour: 11, profiles: { full_name: "Diego S."  }, status: "confirmed" },
];

function fmtHour(h) {
  if (h < 12) return `${h}:00 a.m.`;
  if (h === 12) return "12:00 p.m.";
  return `${h - 12}:00 p.m.`;
}

function apptName(apt) {
  return apt.profiles?.full_name || "Aprendiz";
}

export default function ProfessionalAgendaPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [weekBase, setWeekBase] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");
  const [apts, setApts] = useState([]);
  const [loading, setLoading] = useState(true);

  const monday = startOfWeek(weekBase, { weekStartsOn: 1 });
  const days   = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekLabel = `${format(days[0], "d MMM", { locale: es })} – ${format(days[6], "d MMM yyyy", { locale: es })}`;

  const fetchWeek = useCallback(async () => {
    if (DEV_ROLE) { setApts(MOCK_WEEK_CITAS); setLoading(false); return; }
    if (!profile?.dependency_id) { setLoading(false); return; }
    setLoading(true);
    const from = format(days[0], "yyyy-MM-dd");
    const to   = format(days[6], "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("appointments")
      .select("id, scheduled_date, scheduled_time, status, profiles!user_id(full_name)")
      .eq("dependency_id", profile.dependency_id)
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date")
      .order("scheduled_time");
    if (error) toast.error("No se pudo cargar la agenda de esta semana");
    setApts(data || []);
    setLoading(false);
  }, [profile, monday.toISOString()]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  const getCitasFor = (day, hour) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return apts.filter(a => {
      if (DEV_ROLE) return a._dayIdx === day.getDay() && a._hour === hour;
      if (a.scheduled_date !== dateStr) return false;
      const h = parseInt(a.scheduled_time?.split(":")[0] ?? "0", 10);
      return h === hour;
    });
  };

  const getDayCitas = (day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return apts.filter(a => {
      if (DEV_ROLE) return a._dayIdx === day.getDay();
      return a.scheduled_date === dateStr;
    });
  };

  const fmtAptTime = (apt) => {
    if (DEV_ROLE) return fmtHour(apt._hour);
    if (!apt.scheduled_time) return "—";
    const [h, m] = apt.scheduled_time.split(":").map(Number);
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${String(m).padStart(2,"0")} ${h < 12 ? "a.m." : "p.m."}`;
  };

  const totalCitas = apts.filter(a => !["cancelled"].includes(a.status)).length;

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
              {loading
                ? <Loader2 size={16} color="#39a900" style={{ animation: "spin 0.7s linear infinite" }} />
                : <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#39a900", background: "#f0fce4", border: "1px solid #bbf7d0", padding: "0.25rem 0.75rem", borderRadius: 20 }}>
                    {totalCitas} citas esta semana
                  </span>
              }
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

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        )}

        {!loading && viewMode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {days.map((day, di) => {
              const dayCitas = getDayCitas(day);
              if (!dayCitas.length && !isToday(day)) return null;
              return (
                <div key={di}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: isToday(day) ? "#39a900" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
                    {format(day, "EEEE d 'de' MMMM", { locale: es })} {isToday(day) && "· Hoy"}
                  </div>
                  {dayCitas.length === 0
                    ? <div style={{ fontSize: "0.875rem", color: "#6b7280", padding: "0.75rem 1rem", background: "white", borderRadius: 10, border: "1px solid #f3f4f6" }}>Sin citas</div>
                    : dayCitas.map(apt => {
                        const cfg = STATUS_CFG[apt.status] || STATUS_CFG.pending;
                        return (
                          <div key={apt.id}
                            onClick={() => navigate(`/cita/${apt.id}${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                            style={{ display: "flex", alignItems: "center", gap: "1rem", background: "white", borderRadius: 10, border: "1px solid #e5e7eb", borderLeft: `4px solid ${cfg.border}`, padding: "0.875rem 1.25rem", cursor: "pointer", marginBottom: "0.5rem", transition: "box-shadow 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                          >
                            <Clock size={15} color="#9ca3af" />
                            <span style={{ fontWeight: 700, color: "#374151", minWidth: 70 }}>{fmtAptTime(apt)}</span>
                            <span style={{ fontWeight: 600, color: "#111827", flex: 1 }}>{apptName(apt)}</span>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: cfg.border, background: cfg.bg, padding: "0.2rem 0.6rem", borderRadius: 20 }}>{cfg.label}</span>
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        )}

        {!loading && viewMode === "week" && (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: "2px solid #f3f4f6" }}>
              <div style={{ padding: "0.75rem 0.5rem", borderRight: "1px solid #f3f4f6" }} />
              {days.map((day, di) => {
                const td = isToday(day);
                return (
                  <div key={di} style={{ padding: "0.75rem 0.5rem", textAlign: "center", borderRight: di < 6 ? "1px solid #f3f4f6" : "none", background: td ? "#f0fce4" : "transparent" }}>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: td ? "#39a900" : "#9ca3af", textTransform: "uppercase" }}>{DAY_NAMES[day.getDay()]}</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: td ? "#39a900" : "#111827", marginTop: "0.125rem" }}>{format(day, "d")}</div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour, hi) => (
              <div key={hour} style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: hi < HOURS.length - 1 ? "1px solid #f9fafb" : "none", minHeight: 52 }}>
                <div style={{ padding: "0.375rem 0.5rem", borderRight: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "0.6875rem", color: "#6b7280", fontWeight: 500 }}>{fmtHour(hour)}</span>
                </div>
                {days.map((day, di) => {
                  const citas = getCitasFor(day, hour);
                  const td = isToday(day);
                  return (
                    <div key={di} style={{ borderRight: di < 6 ? "1px solid #f9fafb" : "none", padding: "0.25rem", background: td ? "rgba(57,169,0,0.02)" : "transparent" }}>
                      {citas.map(apt => {
                        const cfg = STATUS_CFG[apt.status] || STATUS_CFG.pending;
                        return (
                          <div key={apt.id}
                            onClick={() => navigate(`/cita/${apt.id}${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                            style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}`, borderRadius: "0 6px 6px 0", padding: "0.25rem 0.375rem", cursor: "pointer", marginBottom: "0.25rem" }}
                          >
                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: cfg.border }}>{fmtAptTime(apt)}</div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apptName(apt)}</div>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
