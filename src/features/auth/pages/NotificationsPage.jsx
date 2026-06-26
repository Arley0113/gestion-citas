import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Clock, ChevronRight, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { format, parseISO, differenceInDays, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { useAppointments } from "../../appointments/hooks/useAppointments";
import { useAuth } from "../../../providers/AuthProvider";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const MOCK = [
  { id: "1", status: "pending",   scheduled_date: "2026-06-30", scheduled_time: "09:00:00", dependencies: { name: "Psicología" } },
  { id: "2", status: "confirmed", scheduled_date: "2026-07-02", scheduled_time: "14:00:00", dependencies: { name: "Enfermería" } },
];

function timeLabel(t) {
  if (!t) return "—";
  const [h] = t.split(":").map(Number);
  if (h < 12) return `${h}:00 a.m.`;
  if (h === 12) return "12:00 p.m.";
  return `${h - 12}:00 p.m.`;
}

function dayLabel(dateStr) {
  const d = parseISO(dateStr);
  if (isToday(d))    return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  const diff = differenceInDays(d, new Date());
  if (diff > 0 && diff <= 7) return `En ${diff} días`;
  return format(d, "d 'de' MMMM", { locale: es });
}

const STATUS_CFG = {
  pending:   { label: "Pendiente de confirmación", color: "#d97706", bg: "#fef3c7", icon: AlertCircle },
  confirmed: { label: "Confirmada",                color: "#2563eb", bg: "#dbeafe", icon: CheckCircle2 },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();

  useEffect(() => {
    if (!IS_DEV) fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apts   = IS_DEV ? MOCK : (appointments || []);
  const active = apts.filter(a => ["pending", "confirmed"].includes(a.status))
                      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Centro de avisos
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
              Notificaciones
            </h1>
            {active.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.75rem", background: "#dcfce7", borderRadius: 20, border: "1px solid #bbf7d0" }}>
                <Bell size={12} color="#16a34a" fill="#16a34a" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>{active.length} activas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 2rem" }}>

        {/* Aviso sistema */}
        <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1px solid #bbf7d0", borderRadius: 12, padding: "0.875rem 1.125rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Info size={15} color="#16a34a" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "0.8125rem", color: "#166534", margin: 0, lineHeight: 1.55 }}>
            Aquí verás recordatorios de tus citas y avisos del equipo de Bienestar SENA.
          </p>
        </div>

        {/* Citas próximas como recordatorios */}
        {active.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
              Recordatorios de citas
            </div>
            {active.map(apt => {
              const cfg = STATUS_CFG[apt.status] || STATUS_CFG.pending;
              const Ic  = cfg.icon;
              return (
                <button
                  key={apt.id}
                  onClick={() => navigate(`/cita/${apt.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    background: "white", border: "1px solid #e5e7eb",
                    borderLeft: `4px solid ${cfg.color}`,
                    borderRadius: "0 12px 12px 0",
                    padding: "1rem 1.25rem",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    fontFamily: "var(--font-sans)",
                    transition: "box-shadow 0.12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic size={18} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>
                      Cita de {apt.dependencies?.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8125rem", color: "#6b7280" }}>
                        <Calendar size={12} /> {dayLabel(apt.scheduled_date)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8125rem", color: "#6b7280" }}>
                        <Clock size={12} /> {timeLabel(apt.scheduled_time)}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "0.125rem 0.5rem", borderRadius: 20 }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <Bell size={28} color="#d1d5db" />
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
              Sin notificaciones pendientes
            </div>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", maxWidth: 280, margin: "0 auto" }}>
              Cuando agendes una cita aparecerá aquí como recordatorio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
