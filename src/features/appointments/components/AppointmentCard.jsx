import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, ChevronRight, MapPin } from "lucide-react";

const STATUS_CONFIG = {
  pending:   { label: "Pendiente",  cls: "badge-pending",   icon: AlertCircle, color: "var(--color-warning)" },
  confirmed: { label: "Confirmada", cls: "badge-confirmed",  icon: CheckCircle, color: "var(--color-info)" },
  completed: { label: "Completada", cls: "badge-completed",  icon: CheckCircle, color: "var(--color-success)" },
  cancelled: { label: "Cancelada",  cls: "badge-cancelled",  icon: XCircle,     color: "var(--color-error)" },
  no_show:   { label: "No asistió", cls: "badge-no_show",    icon: XCircle,     color: "var(--gray-500)" },
};

const DEP_CONFIG = {
  "Psicología":     { color: "#39a900", bg: "#e6f4ea", abbr: "PSI" },
  "Enfermería":     { color: "#0284c7", bg: "#e0f2fe", abbr: "ENF" },
  "Trabajo Social": { color: "#f59e0b", bg: "#fef3c7", abbr: "TS"  },
};

function formatTime(scheduled_time) {
  if (!scheduled_time) return "—";
  const [h, m] = scheduled_time.split(":").map(Number);
  const meridiem = h < 12 ? "a.m." : "p.m.";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${meridiem}`;
}

export function AppointmentCard({ appointment, onCancel, isAprendiz, onClick }) {
  const { dependencies, scheduled_date, scheduled_time, status, reason, profiles } = appointment;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const dep = DEP_CONFIG[dependencies?.name] || { color: "#6b7280", bg: "#f3f4f6", abbr: "?" };

  const dateFormatted = scheduled_date
    ? format(parseISO(scheduled_date), "EEEE d 'de' MMMM", { locale: es })
    : "—";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--white)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--gray-100)",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
    >
      {/* Color strip + department */}
      <div style={{ display: "flex", alignItems: "center", padding: "0.875rem 1.25rem 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.625rem", flex: 1,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "var(--radius-sm)",
            background: dep.bg, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "0.65rem", color: dep.color, flexShrink: 0,
          }}>
            {dep.abbr}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--gray-900)" }}>
              {dependencies?.name || "Bienestar SENA"}
            </div>
            {!isAprendiz && profiles && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <User size={10} /> {profiles.full_name}
              </div>
            )}
          </div>
        </div>
        <span className={`badge ${cfg.cls}`} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Icon size={11} /> {cfg.label}
        </span>
      </div>

      {/* Date & Time */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "0.625rem 1.25rem", borderBottom: "1px solid var(--gray-100)", marginTop: "0.625rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
          <Calendar size={14} color={dep.color} />
          <span style={{ textTransform: "capitalize" }}>{dateFormatted}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>
          <Clock size={14} color={dep.color} />
          {formatTime(scheduled_time)}
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <p style={{
          padding: "0.75rem 1.25rem",
          fontSize: "var(--text-sm)", color: "var(--gray-600)",
          lineHeight: 1.5, borderBottom: "1px solid var(--gray-100)",
        }}>
          {reason}
        </p>
      )}

      {/* Actions */}
      <div style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {isAprendiz && status === "pending" ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-danger-outline btn-sm"
              onClick={e => { e.stopPropagation(); onCancel?.(); }}
            >
              Cancelar
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={onClick}
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              Ver detalles <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)" }}>
            {status === "completed" ? "Atención completada" : status === "cancelled" ? "Cita cancelada" : ""}
          </span>
        )}
        {onClick && status !== "pending" && (
          <ChevronRight size={16} color="var(--gray-300)" />
        )}
      </div>
    </div>
  );
}
