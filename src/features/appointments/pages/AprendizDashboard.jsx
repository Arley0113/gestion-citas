import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, ChevronRight, Brain, Heart, Users, Calendar,
  X, Clock, CheckCircle2, AlertCircle, TrendingUp,
  Sparkles, Shield, ChevronDown, Smile,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAppointments } from "../hooks/useAppointments";
import { useAuth } from "../../../providers/AuthProvider";
import { useAppointmentModal } from "../../../providers/AppointmentModalContext";
import { toast } from "sonner";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const MOCK_APTS = [
  { id: "1", status: "pending",   scheduled_date: "2026-06-30", scheduled_time: "09:00:00", reason: "Ansiedad y estrés por carga académica del trimestre", dependencies: { name: "Psicología" } },
  { id: "2", status: "confirmed", scheduled_date: "2026-07-02", scheduled_time: "14:00:00", reason: "Control de tensión arterial y revisión general", dependencies: { name: "Enfermería" } },
  { id: "3", status: "completed", scheduled_date: "2026-06-10", scheduled_time: "10:00:00", reason: "Apoyo en convivencia y redes de apoyo", dependencies: { name: "Trabajo Social" } },
  { id: "4", status: "cancelled", scheduled_date: "2026-06-05", scheduled_time: "11:00:00", reason: "Seguimiento de plan académico", dependencies: { name: "Psicología" } },
];

const SERVICES = [
  { key: "PSICOLOGIA",    icon: Brain,  label: "Psicología",     desc: "Apoyo emocional y mental",      color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  { key: "ENFERMERIA",    icon: Heart,  label: "Enfermería",     desc: "Salud y bienestar físico",       color: "#2563eb", bg: "#dbeafe", border: "#bfdbfe" },
  { key: "TRABAJO_SOCIAL",icon: Users,  label: "Trabajo Social", desc: "Acompañamiento y apoyo social",  color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
];

const STATUS = {
  pending:   { label: "Pendiente",  color: "#92400e", bg: "#fef3c7", border: "#fde68a", dot: "#f59e0b",  leftBorder: "#f59e0b"  },
  confirmed: { label: "Confirmada", color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe", dot: "#3b82f6",  leftBorder: "#3b82f6"  },
  completed: { label: "Completada", color: "#166534", bg: "#dcfce7", border: "#bbf7d0", dot: "#16a34a",  leftBorder: "#16a34a"  },
  cancelled: { label: "Cancelada",  color: "#991b1b", bg: "#fee2e2", border: "#fecaca", dot: "#ef4444",  leftBorder: "#ef4444"  },
  no_show:   { label: "No asistió", color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb", dot: "#9ca3af",  leftBorder: "#9ca3af"  },
};

const TABS = ["Próximas", "Todas", "Historial"];

function timeLabel(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const mm = String(m).padStart(2, "0");
  if (h < 12) return `${h}:${mm} a.m.`;
  if (h === 12) return `12:${mm} p.m.`;
  return `${h - 12}:${mm} p.m.`;
}

function getDepMeta(name) {
  if (!name) return SERVICES[0];
  if (name.toLowerCase().includes("psico"))   return SERVICES[0];
  if (name.toLowerCase().includes("enfer"))   return SERVICES[1];
  if (name.toLowerCase().includes("trabajo")) return SERVICES[2];
  return SERVICES[0];
}

const MOODS = [
  { emoji: "😔", label: "Muy mal" },
  { emoji: "😟", label: "Mal" },
  { emoji: "😐", label: "Regular" },
  { emoji: "🙂", label: "Bien" },
  { emoji: "😊", label: "Muy bien" },
];

export default function AprendizDashboard() {
  const navigate   = useNavigate();
  const { profile } = useAuth();
  const { openModal } = useAppointmentModal();
  const { appointments, cancelAppointment, fetchAppointments } = useAppointments();
  const [tab, setTab]             = useState("Próximas");
  const [showAllServices, setShowAllServices] = useState(false);
  const [mood, setMood]           = useState(null);
  const [cancelModal, setCancelModal] = useState({ open: false, aptId: null, reason: "" });

  useEffect(() => {
    if (!IS_DEV) fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apts      = IS_DEV ? MOCK_APTS : (appointments || []);
  const firstName = IS_DEV ? "Juan" : (profile?.full_name?.split(" ")[0] || "Aprendiz");
  const now       = new Date();
  const hour      = now.getHours();
  const greeting  = hour < 12 ? "¡Buenos días" : hour < 18 ? "¡Buenas tardes" : "¡Buenas noches";

  const upcoming  = apts.filter(a => ["pending","confirmed"].includes(a.status));
  const completed = apts.filter(a => a.status === "completed");
  const history   = apts.filter(a => ["completed","cancelled","no_show"].includes(a.status));
  const nextApt   = upcoming[0];
  const listApts  = tab === "Próximas" ? upcoming : tab === "Historial" ? history : apts;

  const handleCancel = (e, id) => {
    e.stopPropagation();
    setCancelModal({ open: true, aptId: id, reason: "" });
  };

  const executeCancel = async () => {
    if (IS_DEV) {
      toast.success("Cita cancelada (demo)");
      setCancelModal({ open: false, aptId: null, reason: "" });
      return;
    }
    await cancelAppointment(cancelModal.aptId, cancelModal.reason.trim() || null);
    setCancelModal({ open: false, aptId: null, reason: "" });
  };

  const stats = [
    { label: "Total",       value: apts.length,      icon: Calendar,      color: "#39a900", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Pendientes",  value: upcoming.filter(a => a.status === "pending").length,  icon: AlertCircle,  color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
    { label: "Confirmadas", value: upcoming.filter(a => a.status === "confirmed").length,icon: TrendingUp,   color: "#2563eb", bg: "#dbeafe", border: "#bfdbfe" },
    { label: "Completadas", value: completed.length,  icon: CheckCircle2,  color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  ];

  return (
    <div style={{ background: "var(--surface-base)", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Hero header ─── */}
      <div style={{
        background: "linear-gradient(135deg, #1a4a1a 0%, #39a900 60%, #52c41a 100%)",
        padding: "2rem 2rem 3.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Patrón decorativo */}
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(0,0,0,0.08) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div className="hero-header-row">
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.65)", marginBottom: "0.375rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={12} />
                {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </div>
              <h1 style={{
                fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
                fontWeight: 800, color: "white",
                letterSpacing: "-0.03em", lineHeight: 1.15,
                fontFamily: "var(--font-display)",
              }}>
                {greeting}, {firstName}!
              </h1>
              <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.75)", marginTop: "0.5rem", maxWidth: 460 }}>
                {nextApt
                  ? <>Tu próxima cita es el{" "}
                      <span style={{ fontWeight: 700, color: "white" }}>
                        {format(new Date(nextApt.scheduled_date + "T12:00:00"), "d 'de' MMMM", { locale: es })}
                      </span>
                      {" "}en {nextApt.dependencies?.name}</>
                  : "Tu bienestar es nuestra prioridad. Agenda una cita cuando lo necesites."}
              </p>
            </div>

            <button
              onClick={() => openModal()}
              className="hero-cta"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "0.75rem 1.375rem",
                background: "white", color: "#39a900",
                border: "none", borderRadius: 12,
                fontSize: "0.9375rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "var(--font-sans)",
                flexShrink: 0,
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
            >
              <Plus size={17} />
              Agendar cita
            </button>
          </div>

          {/* Stats cards — overlapping el hero */}
          <div className="stats-grid kpi-grid-4" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.875rem",
            marginTop: "1.75rem",
          }}>
            {stats.map(s => {
              const Ic = s.icon;
              return (
                <div key={s.label} style={{
                  background: "white",
                  borderRadius: 14,
                  padding: "1rem 1.125rem",
                  border: `1px solid ${s.border}`,
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: s.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Ic size={19} color={s.color} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", lineHeight: 1, letterSpacing: "-0.04em", fontFamily: "var(--font-display)" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#9ca3af", fontWeight: 500, marginTop: "0.1875rem" }}>
                      {s.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Contenido ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.75rem 2rem" }}>

        {/* Widget ¿Cómo te sientes hoy? */}
        <div style={{
          background: "white", borderRadius: 16, border: "1px solid #e5e7eb",
          padding: "1.125rem 1.5rem", marginBottom: "1.25rem",
          boxShadow: "var(--shadow-sm)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Smile size={17} color="#39a900" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>¿Cómo te sientes hoy?</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Registro de bienestar diario</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            {MOODS.map((m, i) => (
              <button
                key={i}
                onClick={() => { if (mood !== i) toast.success(`Estado: ${m.label}`); setMood(i); }}
                title={m.label}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "2px solid",
                  borderColor: mood === i ? "#39a900" : "#e5e7eb",
                  background: mood === i ? "#f0fce4" : "white",
                  fontSize: "1.375rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                  transform: mood === i ? "scale(1.15)" : "scale(1)",
                }}
                onMouseEnter={e => { if (mood !== i) e.currentTarget.style.borderColor = "#9ca3af"; }}
                onMouseLeave={e => { if (mood !== i) e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                {m.emoji}
              </button>
            ))}
            {mood !== null && (
              <div style={{ marginLeft: "0.5rem", fontSize: "0.8125rem", fontWeight: 600, color: "#39a900" }}>
                {MOODS[mood].label} ✓
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", alignItems: "start" }}>

          {/* ─── Columna principal ─── */}
          <div>
            {/* Próxima cita destacada */}
            {nextApt && (
              <div
                onClick={() => navigate(`/cita/${nextApt.id}${IS_DEV ? `?preview=${IS_DEV}` : ""}`)}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderLeft: "4px solid #39a900",
                  borderRadius: "0 14px 14px 0",
                  padding: "1.125rem 1.5rem",
                  marginBottom: "1.5rem",
                  display: "flex", alignItems: "center", gap: "1.25rem",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                  transition: "box-shadow 0.15s, transform 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: "linear-gradient(135deg, #39a900, #2d8600)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(57,169,0,0.3)",
                }}>
                  <span style={{ fontSize: "1.375rem", fontWeight: 800, color: "white", lineHeight: 1, fontFamily: "var(--font-display)" }}>
                    {format(new Date(nextApt.scheduled_date + "T12:00:00"), "d")}
                  </span>
                  <span style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {format(new Date(nextApt.scheduled_date + "T12:00:00"), "MMM", { locale: es })}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.25rem" }}>
                    Próxima cita
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.0625rem", color: "#111827" }}>
                    {nextApt.dependencies?.name}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.125rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Clock size={12} />
                    {timeLabel(nextApt.scheduled_time)} · {format(new Date(nextApt.scheduled_date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                  </div>
                </div>
                <div style={{
                  padding: "0.3rem 0.875rem", borderRadius: 99,
                  fontSize: "0.75rem", fontWeight: 700,
                  background: STATUS[nextApt.status]?.bg,
                  color: STATUS[nextApt.status]?.color,
                  border: `1px solid ${STATUS[nextApt.status]?.border}`,
                  flexShrink: 0, display: "flex", alignItems: "center", gap: "0.375rem",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS[nextApt.status]?.dot, display: "inline-block" }} />
                  {STATUS[nextApt.status]?.label}
                </div>
                <ChevronRight size={18} color="#d1d5db" style={{ flexShrink: 0 }} />
              </div>
            )}

            {/* Panel de citas */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              {/* Tabs */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex" }}>
                  {TABS.map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{
                        padding: "1rem 0.875rem", border: "none", background: "none", cursor: "pointer",
                        fontFamily: "var(--font-sans)", fontSize: "0.875rem",
                        fontWeight: tab === t ? 700 : 500,
                        color: tab === t ? "#111827" : "#9ca3af",
                        borderBottom: tab === t ? "2px solid #39a900" : "2px solid transparent",
                        marginBottom: "-1px", transition: "all 0.12s",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: "0.8125rem", color: "#d1d5db", paddingRight: "0.25rem" }}>
                  {listApts.length} {listApts.length === 1 ? "cita" : "citas"}
                </span>
              </div>

              {/* Lista */}
              {listApts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                    <Calendar size={28} color="#d1d5db" />
                  </div>
                  <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
                    {tab === "Próximas" ? "Sin citas próximas" : "Sin registros"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "1.25rem" }}>
                    {tab === "Próximas" ? "Agenda una cita con nuestros especialistas" : "Aquí aparecerán tus citas cuando las agendes"}
                  </div>
                  {tab === "Próximas" && (
                    <button
                      onClick={() => openModal()}
                      style={{
                        padding: "0.625rem 1.25rem",
                        background: "#39a900", color: "white",
                        border: "none", borderRadius: 9,
                        fontSize: "0.875rem", fontWeight: 700,
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                      }}
                    >
                      <Plus size={14} /> Agendar ahora
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {listApts.map((apt, i) => {
                    const st  = STATUS[apt.status] || STATUS.pending;
                    const d   = new Date(apt.scheduled_date + "T12:00:00");
                    const svc = getDepMeta(apt.dependencies?.name);
                    const Ic  = svc.icon;
                    return (
                      <div
                        key={apt.id}
                        onClick={() => navigate(`/cita/${apt.id}${IS_DEV ? `?preview=${IS_DEV}` : ""}`)}
                        style={{
                          display: "flex", alignItems: "center", gap: "1rem",
                          padding: "1rem 1.5rem",
                          borderBottom: i < listApts.length - 1 ? "1px solid #f9fafb" : "none",
                          cursor: "pointer", transition: "background 0.1s",
                          borderLeft: `3px solid ${st.leftBorder}`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Fecha */}
                        <div style={{ width: 40, textAlign: "center", flexShrink: 0 }}>
                          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", lineHeight: 1, fontFamily: "var(--font-display)" }}>
                            {format(d, "d")}
                          </div>
                          <div style={{ fontSize: "0.5625rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "0.0625rem" }}>
                            {format(d, "MMM", { locale: es })}
                          </div>
                        </div>

                        {/* Icono servicio */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 9,
                          background: svc.bg, border: `1px solid ${svc.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Ic size={16} color={svc.color} strokeWidth={1.75} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>
                            {apt.dependencies?.name}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "#9ca3af", marginTop: "0.125rem", display: "flex", alignItems: "center", gap: "0.375rem", overflow: "hidden" }}>
                            <Clock size={11} />
                            <span>{timeLabel(apt.scheduled_time)}</span>
                            {apt.reason && (
                              <>
                                <span>·</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {apt.reason}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
                          {apt.status === "pending" && (
                            <button
                              onClick={e => handleCancel(e, apt.id)}
                              title="Cancelar cita"
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                border: "1px solid #fecaca", background: "white",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                              onMouseLeave={e => e.currentTarget.style.background = "white"}
                            >
                              <X size={12} color="#ef4444" />
                            </button>
                          )}
                          <div style={{
                            display: "flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.275rem 0.75rem", borderRadius: 99,
                            fontSize: "0.6875rem", fontWeight: 700,
                            background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                            whiteSpace: "nowrap",
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                            {st.label}
                          </div>
                          <ChevronRight size={14} color="#e5e7eb" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Sidebar derecho ─── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

            {/* Servicios de bienestar */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Servicios
                </div>
              </div>

              {SERVICES.map(({ key, icon: Icon, label, desc, color, bg, border }) => (
                <button
                  key={key}
                  onClick={() => openModal(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.875rem 1.25rem",
                    background: "white", border: "none",
                    borderBottom: "1px solid #f9fafb",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    textAlign: "left", width: "100%", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} color={color} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{label}</div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.0625rem" }}>{desc}</div>
                  </div>
                  <ChevronRight size={13} color="#e5e7eb" />
                </button>
              ))}

              <div style={{ padding: "0.875rem 1.25rem" }}>
                <button
                  onClick={() => openModal()}
                  style={{
                    width: "100%", padding: "0.625rem",
                    background: "#39a900", color: "white",
                    border: "none", borderRadius: 9,
                    fontSize: "0.875rem", fontWeight: 700,
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                    boxShadow: "0 2px 8px rgba(57,169,0,0.25)",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2d8600"}
                  onMouseLeave={e => e.currentTarget.style.background = "#39a900"}
                >
                  <Plus size={14} /> Nueva cita
                </button>
              </div>
            </div>

            {/* Horarios */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: "1.125rem 1.25rem", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
                Horarios de atención
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  { name: "Psicología",     hours: "Lun–Vie · 8:00–5:00 p.m.", color: "#16a34a" },
                  { name: "Enfermería",     hours: "Lun–Vie · 7:00–4:00 p.m.", color: "#2563eb" },
                  { name: "Trabajo Social", hours: "Mar–Jue · 8:00–12:00 m.",  color: "#d97706" },
                ].map(({ name, hours, color }) => (
                  <div key={name} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
                    <div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>{name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.0625rem" }}>{hours}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso de privacidad */}
            <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderRadius: 14, padding: "1rem 1.125rem", border: "1px solid #bbf7d0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Shield size={14} color="#16a34a" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Confidencialidad
                </span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#166534", lineHeight: 1.6 }}>
                Tu información es privada. Solo el personal autorizado de Bienestar SENA puede acceder a tus datos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modal cancelación ─── */}
      {cancelModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "1.75rem", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "#111827", marginBottom: "0.25rem", fontFamily: "var(--font-display)" }}>Cancelar cita</div>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem", lineHeight: 1.55 }}>
              Esta acción no se puede deshacer. Si lo deseas, puedes indicar el motivo.
            </p>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
              Motivo <span style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
            </label>
            <textarea
              value={cancelModal.reason}
              onChange={e => setCancelModal(m => ({ ...m, reason: e.target.value }))}
              placeholder="Ej: No puedo asistir por motivos académicos..."
              maxLength={300}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.625rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.875rem", color: "#111827", resize: "none", outline: "none", fontFamily: "var(--font-sans)", marginBottom: "0.25rem" }}
              onFocus={e => e.target.style.borderColor = "#ef4444"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", textAlign: "right", marginBottom: "1rem" }}>{cancelModal.reason.length}/300</div>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={() => setCancelModal({ open: false, aptId: null, reason: "" })}
                style={{ flex: 1, padding: "0.75rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", color: "#374151" }}
              >
                Volver
              </button>
              <button
                onClick={executeCancel}
                style={{ flex: 2, padding: "0.75rem", background: "#ef4444", color: "white", border: "none", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
