import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, ChevronRight, Check, X, Play, Users, BarChart2, FolderOpen, AlertCircle, TrendingUp, CheckCircle2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { P } from "../../../shared/rbac/permissions";
import { notifyAppointmentConfirmed, notifyAppointmentCancelled } from "../../../lib/notifications";
import { toast } from "sonner";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const MOCK = [
  { id: "p1", status: "pending",   scheduled_time: "08:00:00", reason: "Ansiedad por carga académica del semestre", profiles: { full_name: "Laura Gómez",    document_number: "1012345678" } },
  { id: "p2", status: "pending",   scheduled_time: "09:00:00", reason: "Estrés y dificultades de concentración",   profiles: { full_name: "Carlos Ruiz",    document_number: "1087654321" } },
  { id: "p3", status: "confirmed", scheduled_time: "10:30:00", reason: "Seguimiento de tratamiento psicológico",   profiles: { full_name: "María Torres",   document_number: "1098765432" } },
  { id: "p4", status: "confirmed", scheduled_time: "14:00:00", reason: "Orientación vocacional y proyecto de vida", profiles: { full_name: "Andrés López",   document_number: "1056789012" } },
  { id: "p5", status: "completed", scheduled_time: "07:30:00", reason: "Terapia de manejo de emociones",           profiles: { full_name: "Sofía Martínez", document_number: "1023456789" } },
];

const STATUS_COLOR = {
  pending:   { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#f59e0b", label: "Pendiente",  left: "#f59e0b" },
  confirmed: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6", label: "Confirmada", left: "#3b82f6" },
  completed: { bg: "#f0fce4", border: "#bbf7d0", text: "#166534", dot: "#39a900", label: "Completada", left: "#39a900" },
};

// Avatar color palette based on initial letter
const AVATAR_COLORS = ["#39a900","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#0ea5e9","#14b8a6","#ec4899"];
function avatarColor(name = "") { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

function fmtTime(t = "08:00:00") {
  const [h, m] = t.split(":").map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2,"0")} ${h < 12 ? "a.m." : "p.m."}`;
}

function fmtTimeShort(t = "08:00:00") {
  const [h, m] = t.split(":").map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { time: `${hr}:${String(m).padStart(2,"0")}`, ampm: h < 12 ? "a.m." : "p.m." };
}

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const TABS = [
  { key: "pending",   label: "Pendientes" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "completed", label: "Completadas" },
];

export default function ProfessionalDashboard() {
  const { profile } = useAuth();
  const { can }    = usePermissions();
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [apts, setApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const currentHour = today.getHours();
  const enJornada = currentHour >= 7 && currentHour < 17;

  const depName   = profile?.dependencies?.name || "Psicología";
  const fullName  = DEV_ROLE ? "Carolina Ruiz" : (profile?.full_name || "Profesional");
  const firstName = fullName.split(" ")[0];
  const nameInitial = fullName.charAt(0).toUpperCase();

  const fetch = useCallback(async () => {
    if (DEV_ROLE) { setApts(MOCK); setLoading(false); return; }
    if (!profile?.dependency_id) { setLoading(false); return; }
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, profiles!user_id(full_name,document_number)")
      .eq("dependency_id", profile.dependency_id)
      .eq("scheduled_date", todayStr)
      .order("scheduled_time");
    setApts(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (DEV_ROLE || !profile?.dependency_id) return;
    const channel = supabase
      .channel(`apt-today-${profile.dependency_id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `dependency_id=eq.${profile.dependency_id}`,
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetch]);

  const confirm = async (apt) => {
    if (!DEV_ROLE) {
      const { error } = await supabase.from("appointments").update({ status: "confirmed", updated_at: new Date() }).eq("id", apt.id);
      if (error) { toast.error("Error al confirmar la cita"); return; }
      notifyAppointmentConfirmed({
        to_email: apt.profiles?.email,
        user_id: apt.user_id,
        to_name: apt.profiles?.full_name || "Aprendiz",
        service_name: depName,
        scheduled_date: apt.scheduled_date,
        scheduled_time: apt.scheduled_time,
      });
    }
    toast.success("Cita confirmada");
    fetch();
  };

  const noShow = async (apt) => {
    if (!DEV_ROLE) {
      const { error } = await supabase.from("appointments").update({ status: "no_show", updated_at: new Date() }).eq("id", apt.id);
      if (error) { toast.error("Error al actualizar la cita"); return; }
      notifyAppointmentCancelled({
        to_email: apt.profiles?.email,
        user_id: apt.user_id,
        to_name: apt.profiles?.full_name || "Aprendiz",
        service_name: depName,
        scheduled_date: apt.scheduled_date,
        reason: "El profesional registró que no asististe a la cita.",
      });
    }
    toast.info("Marcada como no asistió");
    fetch();
  };

  const counts = {
    total:     apts.length,
    pending:   apts.filter(a => a.status === "pending").length,
    confirmed: apts.filter(a => a.status === "confirmed").length,
    completed: apts.filter(a => a.status === "completed").length,
  };

  const filtered = apts.filter(a => a.status === tab);

  const statsCards = [
    { label: "Total hoy",   value: counts.total,     icon: CalendarDays,  color: "#6366f1", bg: "#eef2ff" },
    { label: "Pendientes",  value: counts.pending,   icon: AlertCircle,   color: "#d97706", bg: "#fffbeb" },
    { label: "Confirmadas", value: counts.confirmed, icon: TrendingUp,    color: "#2563eb", bg: "#eff6ff" },
    { label: "Completadas", value: counts.completed, icon: CheckCircle2,  color: "#16a34a", bg: "#f0fce4" },
  ];

  const progressPct = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Header enriquecido ─── */}
      <div style={{ background: "linear-gradient(135deg, #f0fce4 0%, #e8f8d8 100%)", borderBottom: "2px solid #d1fae5" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            {/* Izquierda: avatar + info */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 4px 12px rgba(57,169,0,0.3)" }}>
                {nameInitial}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1, fontFamily: "var(--font-display)", margin: 0 }}>
                    {firstName}
                  </h1>
                  <span style={{ padding: "0.2rem 0.625rem", background: "#39a900", color: "white", borderRadius: 20, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.04em" }}>
                    {depName}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", fontWeight: 600, color: enJornada ? "#166534" : "#6b7280" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: enJornada ? "#39a900" : "#9ca3af", display: "inline-block" }} />
                    {enJornada ? "En jornada" : "Fuera de jornada"}
                  </span>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563", display: "flex", alignItems: "center", gap: "0.375rem", textTransform: "capitalize" }}>
                  <Clock size={12} color="#6b7280" />
                  {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </div>
              </div>
            </div>
            {/* Derecha: chip citas hoy */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "white", border: "1.5px solid #bbf7d0", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <CalendarDays size={16} color="#39a900" />
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>{counts.total}</span>
              <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>citas hoy</span>
            </div>
          </div>

          {/* Stats cards */}
          <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginTop: "1.25rem" }}>
            {statsCards.map(s => {
              const Ic = s.icon;
              return (
                <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "1rem 1.125rem", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic size={18} color={s.color} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", lineHeight: 1, letterSpacing: "-0.04em", fontFamily: "var(--font-display)" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#9ca3af", fontWeight: 500, marginTop: "0.125rem" }}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Contenido principal ─── */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "1.75rem 2rem" }}>
        <div className="main-two-col" style={{ display: "flex", gap: "1.5rem", alignItems: "start" }}>

          {/* ─── Agenda del día ─── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <button style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <Calendar size={14} color="#39a900" />
                {format(today, "d 'de' MMMM, yyyy", { locale: es })}
              </button>
              <span style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
                {apts.length} {apts.length === 1 ? "cita" : "citas"} programadas
              </span>
            </div>

            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", padding: "0 1.5rem" }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{ padding: "1rem 0.875rem", border: "none", background: "none", fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? "#111827" : "#9ca3af", borderBottom: tab === t.key ? "2px solid #39a900" : "2px solid transparent", cursor: "pointer", marginBottom: "-1px", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.12s" }}
                  >
                    {t.label}
                    <span style={{ padding: "0.1rem 0.5rem", borderRadius: 99, fontSize: "0.6875rem", fontWeight: 700, background: tab === t.key ? "#39a900" : "#f3f4f6", color: tab === t.key ? "white" : "#9ca3af" }}>
                      {counts[t.key]}
                    </span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: "3rem 0", textAlign: "center", color: "#9ca3af" }}>
                  <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 1rem" }} />
                  Cargando agenda...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "3.5rem 0", textAlign: "center" }}>
                  <Calendar size={36} color="#e5e7eb" style={{ marginBottom: "0.875rem" }} />
                  <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                    No hay citas {TABS.find(t => t.key === tab)?.label.toLowerCase()} para hoy
                  </p>
                </div>
              ) : (
                <div>
                  {filtered.map((apt, i, arr) => {
                    const sc = STATUS_COLOR[apt.status] || STATUS_COLOR.pending;
                    const { time, ampm } = fmtTimeShort(apt.scheduled_time);
                    const aptName = apt.profiles?.full_name || "Aprendiz";
                    const ac = avatarColor(aptName);
                    return (
                      <div key={apt.id}
                        style={{ borderBottom: i < arr.length - 1 ? "1px solid #f3f4f6" : "none", borderLeft: `4px solid ${sc.left}`, transition: "box-shadow 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "1.125rem", padding: "1.125rem 1.5rem", cursor: "pointer" }}
                          onClick={() => navigate(`/cita/${apt.id}${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                        >
                          {/* Hora */}
                          <div style={{ minWidth: 52, flexShrink: 0, textAlign: "center" }}>
                            <div style={{ fontSize: "1.375rem", fontWeight: 800, color: "#111827", lineHeight: 1, fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
                              {time}
                            </div>
                            <div style={{ fontSize: "0.625rem", color: "#9ca3af", fontWeight: 600, marginTop: 2 }}>{ampm}</div>
                          </div>

                          <div style={{ width: 1, height: 40, background: "#f3f4f6", flexShrink: 0 }} />

                          {/* Avatar */}
                          <div style={{ width: 42, height: 42, borderRadius: "50%", background: ac + "22", border: `2px solid ${ac}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8125rem", color: ac, flexShrink: 0 }}>
                            {initials(aptName)}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>
                              {aptName}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>CC: {apt.profiles?.document_number}</span>
                              {apt.reason && (
                                <span style={{ fontSize: "0.75rem", color: "#6b7280", background: "#f3f4f6", padding: "0.125rem 0.5rem", borderRadius: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                                  {apt.reason}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.3rem 0.75rem", background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 99, flexShrink: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: sc.text }}>{sc.label}</span>
                          </div>

                          <ChevronRight size={15} color="#d1d5db" />
                        </div>

                        {/* Acciones */}
                        {(apt.status === "pending" || apt.status === "confirmed") && (can(P.APPOINTMENTS_CONFIRM) || can(P.APPOINTMENTS_START) || can(P.APPOINTMENTS_NO_SHOW)) && (
                          <div style={{ display: "flex", gap: "0.625rem", padding: "0.875rem 1.5rem", background: "#fafafa", borderTop: "1px solid #f3f4f6" }}>
                            {can(P.APPOINTMENTS_CONFIRM) && apt.status === "pending" && (
                              <button onClick={() => confirm(apt)}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "#39a900", color: "white", border: "none", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", boxShadow: "0 1px 4px rgba(57,169,0,0.3)" }}>
                                <Check size={14} /> Confirmar
                              </button>
                            )}
                            {can(P.APPOINTMENTS_START) && apt.status === "confirmed" && (
                              <button onClick={() => navigate(`/cita/${apt.id}/atencion${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: "#39a900", color: "white", border: "none", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", boxShadow: "0 1px 4px rgba(57,169,0,0.3)" }}>
                                <Play size={14} /> Iniciar atención
                              </button>
                            )}
                            {can(P.APPOINTMENTS_NO_SHOW) && (
                              <button onClick={() => noShow(apt)}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", background: "white", color: "#9ca3af", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                                <X size={14} /> No asistió
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Sidebar derecho ─── */}
          <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Resumen del día */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
                <h3 style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  Resumen del día
                </h3>
              </div>
              <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  { label: "Pendientes de confirmar",  value: counts.pending,   color: "#f59e0b" },
                  { label: "Confirmadas para atender", value: counts.confirmed, color: "#39a900" },
                  { label: "Completadas",              value: counts.completed, color: "#9ca3af" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#111827", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              {/* Barra de progreso mejorada */}
              {counts.total > 0 && (
                <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>
                      {counts.completed} de {counts.total} atendidas
                    </span>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#39a900" }}>{progressPct}%</span>
                  </div>
                  <div style={{ height: 12, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #39a900, #5bc700)", borderRadius: 6, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Accesos rápidos — como cards */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
                <h3 style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  Accesos rápidos
                </h3>
              </div>
              {[
                { icon: Users,      label: "Aprendices",  sub: "Historial de atención",   path: "/aprendices", color: "#3b82f6", bg: "#eff6ff" },
                { icon: FolderOpen, label: "Expedientes", sub: "Notas clínicas",            path: "/professional/notas", color: "#8b5cf6", bg: "#f5f3ff" },
                { icon: BarChart2,  label: "Mis citas",   sub: "Agenda completa del día",  path: "/professional/agenda", color: "#39a900", bg: "#f0fce4" },
              ].map(({ icon: Ic, label, sub, path, color, bg }, i, arr) => (
                <div key={label} onClick={() => path && navigate(`${path}${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                  style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1.25rem", borderBottom: i < arr.length - 1 ? "1px solid #f9fafb" : "none", cursor: path ? "pointer" : "default", transition: "background 0.1s, border-color 0.1s", borderLeft: "3px solid transparent" }}
                  onMouseEnter={e => { if (path) { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderLeftColor = "#39a900"; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic size={16} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>{label}</div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{sub}</div>
                  </div>
                  <ChevronRight size={13} color="#d1d5db" />
                </div>
              ))}
            </div>

            {/* Nota */}
            <div style={{ background: "#fffbeb", borderRadius: 12, padding: "1rem 1.125rem", border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b" }}>
              <p style={{ fontSize: "0.8125rem", color: "#92400e", lineHeight: 1.65, margin: 0 }}>
                💡 Confirma las citas antes de iniciar la jornada. Los aprendices reciben notificación automática.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .main-two-col { flex-direction: column !important; }
          .main-two-col > div:last-child { width: 100% !important; }
        }
        @media (max-width: 640px) {
          .kpi-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
