import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Calendar, Users, BarChart2, ChevronRight, Bell, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { supabase } from "../../../lib/supabase";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { P } from "../../../shared/rbac/permissions";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const MOCK_DATA = { total: 120, pending: 18, completed: 89, cancelled: 13 };

const TREND_DATA = [
  { week: "19 Feb", citas: 78, meta: 80 },
  { week: "26 Feb", citas: 85, meta: 80 },
  { week: "4 Mar",  citas: 96, meta: 90 },
  { week: "11 Mar", citas: 110, meta: 90 },
  { week: "18 Mar", citas: 120, meta: 100 },
  { week: "25 Mar", citas: 98,  meta: 100 },
];

// Brand-aligned colors
const DEP_DATA = [
  { name: "Psicología",     count: 54, pct: 45, color: "#39a900", bg: "#f0fce4" },
  { name: "Enfermería",     count: 38, pct: 32, color: "#0ea5e9", bg: "#e0f2fe" },
  { name: "Trabajo Social", count: 28, pct: 23, color: "#f59e0b", bg: "#fef3c7" },
];

const MOCK_RECENT = [
  { profiles: { full_name: "Laura Gómez" },    dependencies: { name: "Psicología" },     scheduled_time: "08:00:00", status: "completed" },
  { profiles: { full_name: "Carlos Ruiz" },    dependencies: { name: "Enfermería" },     scheduled_time: "09:30:00", status: "confirmed" },
  { profiles: { full_name: "María Torres" },   dependencies: { name: "Trabajo Social" }, scheduled_time: "10:30:00", status: "pending"   },
  { profiles: { full_name: "Andrés López" },   dependencies: { name: "Psicología" },     scheduled_time: "11:00:00", status: "no_show"   },
  { profiles: { full_name: "Sofía Martínez" }, dependencies: { name: "Enfermería" },     scheduled_time: "14:00:00", status: "completed" },
];

const STATUS_BADGE = {
  completed: { label: "Completada", bg: "#dcfce7", color: "#166534" },
  confirmed: { label: "Confirmada", bg: "#dbeafe", color: "#1e40af" },
  pending:   { label: "Pendiente",  bg: "#fef3c7", color: "#92400e" },
  no_show:   { label: "No asistió", bg: "#fee2e2", color: "#991b1b" },
};

const PERIODS = ["Hoy", "Esta semana", "Este mes", "Este año"];

function useDashboardData() {
  const [data, setData]           = useState(DEV_ROLE ? MOCK_DATA : null);
  const [loading, setLoading]     = useState(!DEV_ROLE);
  const [todayApts, setTodayApts] = useState(DEV_ROLE ? MOCK_RECENT : []);
  const [loadingToday, setLoadingToday] = useState(!DEV_ROLE);

  const loadToday = useCallback(async () => {
    if (DEV_ROLE) return;
    setLoadingToday(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("appointments")
      .select("id, status, scheduled_time, profiles!user_id(full_name), dependencies(name)")
      .eq("scheduled_date", todayStr)
      .order("scheduled_time")
      .limit(10);
    setTodayApts(rows || []);
    setLoadingToday(false);
  }, []);

  useEffect(() => {
    if (DEV_ROLE) return;
    const load = async () => {
      try {
        const [{ count: total }, { count: pending }, { count: completed }, { count: cancelled }] = await Promise.all([
          supabase.from("appointments").select("*", { count: "exact", head: true }),
          supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("appointments").select("*", { count: "exact", head: true }).in("status", ["cancelled","no_show"]),
        ]);
        setData({ total: total || 0, pending: pending || 0, completed: completed || 0, cancelled: cancelled || 0 });
      } catch { setData(MOCK_DATA); }
      finally  { setLoading(false); }
    };
    load();
    loadToday();
  }, [loadToday]);

  return { data, loading, todayApts, loadingToday, loadToday };
}

function fmtTime(t = "08:00:00") {
  const h = parseInt(t);
  if (h < 12) return `${h}:00 a.m.`;
  if (h === 12) return "12:00 p.m.";
  return `${h - 12}:00 p.m.`;
}

export default function CoordinationDashboard() {
  const { data, loading, todayApts, loadingToday, loadToday } = useDashboardData();
  const { can } = usePermissions();
  const today = new Date();
  const [period, setPeriod] = useState("Este mes");
  const [hoveredRow, setHoveredRow] = useState(null);

  const completedPct = data?.total ? Math.round((data.completed / data.total) * 100) : 74;
  const cancelledPct = data?.total ? Math.round((data.cancelled / data.total) * 100) : 11;
  const pendingPct   = data?.total ? Math.round((data.pending / data.total) * 100) : 15;

  const kpis = [
    { label: "Total citas",        value: data?.total     ?? "—", color: "#39a900", trend: "+12%", up: true,  icon: Calendar  },
    { label: "Pendientes",         value: data?.pending   ?? "—", color: "#f59e0b", trend: "-8%",  up: false, icon: TrendingDown },
    { label: "Completadas",        value: data?.completed ?? "—", color: "#16a34a", trend: "+5%",  up: true,  icon: TrendingUp  },
    { label: "Canceladas/No show", value: data?.cancelled ?? "—", color: "#ef4444", trend: "-3%",  up: false, icon: TrendingDown },
  ];

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Header ─── */}
      <div style={{ background: "linear-gradient(to bottom, #f0fce4 0%, #f5f7fa 100%)", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "1.5rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
                Panel de Coordinación
              </div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.2, fontFamily: "var(--font-display)", margin: "0 0 0.25rem" }}>
                Dashboard de Coordinación
              </h1>
              <p style={{ fontSize: "0.8125rem", color: "#4b5563", margin: 0, textTransform: "capitalize" }}>
                {format(today, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
              {/* Selector de período */}
              <div style={{ display: "flex", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", padding: "0.25rem" }}>
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    style={{ padding: "0.375rem 0.75rem", border: "none", borderRadius: 7, background: period === p ? "#39a900" : "transparent", color: period === p ? "white" : "#6b7280", fontSize: "0.8125rem", fontWeight: period === p ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s", whiteSpace: "nowrap" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {can(P.REPORTS_EXPORT) && (
                <button style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5625rem 1rem", border: "none", borderRadius: 8, background: "#39a900", fontSize: "0.875rem", fontWeight: 600, color: "white", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  <Download size={14} /> Exportar
                </button>
              )}
              <div style={{ position: "relative" }}>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
                  <Bell size={18} />
                  <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#ef4444", border: "1.5px solid white" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="coord-layout">
        {/* ─── Columna principal ─── */}
        <div className="coord-main">

          {/* KPIs */}
          <div className="coord-kpi-grid">
            {kpis.map(k => {
              const Ic = k.icon;
              return (
                <div key={k.label} className="kpi-card-desktop">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}>{k.label}</span>
                    <Ic size={14} color={k.color} />
                  </div>
                  <div style={{ fontSize: "2.25rem", fontWeight: 800, color: k.color, lineHeight: 1, fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
                    {loading ? "—" : k.value}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.625rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: k.up ? "#16a34a" : "#dc2626" }}>
                      {k.up ? "↑" : "↓"} {k.trend}
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "#9ca3af" }}>vs sem. ant.</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tendencia semanal */}
          <div className="coord-card">
            <div className="coord-card-header">
              <div>
                <h3>Tendencia semanal de citas</h3>
                <p>Comparación con meta del período</p>
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <RefreshCw size={12} /> Actualizar
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={TREND_DATA} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={v => [`${v} citas`]} />
                <Line type="monotone" dataKey="citas" stroke="#39a900" strokeWidth={2.5} dot={{ fill: "#39a900", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Citas" />
                <Line type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Meta" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por dependencia */}
          <div className="coord-card">
            <div className="coord-card-header">
              <div>
                <h3>Distribución por dependencia</h3>
                <p>Total de citas atendidas por área</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {DEP_DATA.map(dep => (
                  <div key={dep.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dep.color }} />
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>{dep.name}</span>
                      </div>
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: dep.color }}>{dep.count} ({dep.pct}%)</span>
                    </div>
                    <div style={{ height: 10, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${dep.pct}%`, background: dep.color, borderRadius: 99, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={DEP_DATA} barSize={36}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={v => [`${v} citas`]} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {DEP_DATA.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Citas de hoy */}
          <div className="coord-card">
            <div className="coord-card-header">
              <div>
                <h3>Citas de hoy</h3>
                <p>Actividad en tiempo real · {todayApts.length} registros</p>
              </div>
              <button onClick={loadToday}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                <RefreshCw size={12} /> Actualizar
              </button>
            </div>

            {loadingToday ? (
              <div style={{ padding: "2rem 0", textAlign: "center" }}>
                <div style={{ width: 24, height: 24, border: "2px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 0.625rem" }} />
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Cargando...</span>
              </div>
            ) : todayApts.length === 0 ? (
              <div style={{ padding: "2.5rem 0", textAlign: "center" }}>
                <Calendar size={32} color="#e5e7eb" style={{ margin: "0 auto 0.625rem" }} />
                <p style={{ fontSize: "0.875rem", color: "#9ca3af", margin: 0 }}>Sin citas programadas para hoy</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                {/* Cabecera de tabla */}
                <div style={{ minWidth: 520, display: "grid", gridTemplateColumns: "1fr 160px 100px 120px", gap: "1rem", padding: "0.625rem 0.75rem", background: "#f9fafb", borderRadius: 8, marginBottom: "0.375rem" }}>
                  {["Aprendiz", "Área", "Hora", "Estado"].map(h => (
                    <span key={h} style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
                  ))}
                </div>
                {todayApts.map((apt, i) => {
                  const badge  = STATUS_BADGE[apt.status] || STATUS_BADGE.pending;
                  const name   = apt.profiles?.full_name || "Aprendiz";
                  const isEven = i % 2 === 0;
                  return (
                    <div key={i}
                      style={{ minWidth: 520, display: "grid", gridTemplateColumns: "1fr 160px 100px 120px", gap: "1rem", padding: "0.75rem", borderBottom: i < todayApts.length - 1 ? "1px solid #f3f4f6" : "none", alignItems: "center", cursor: "pointer", borderRadius: 6, background: hoveredRow === i ? "#f0fce4" : isEven ? "white" : "#fafafa", transition: "background 0.1s" }}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8125rem", color: "#39a900", flexShrink: 0, border: "1.5px solid #bbf7d0" }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{name}</span>
                      </div>
                      <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{apt.dependencies?.name || "—"}</span>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>{fmtTime(apt.scheduled_time)}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: badge.color, background: badge.bg, padding: "0.25rem 0.625rem", borderRadius: 99, display: "inline-flex", width: "fit-content" }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Sidebar derecho ─── */}
        <aside className="coord-sidebar-right">

          {/* Donut cumplimiento */}
          <div className="coord-card" style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111827", marginBottom: "1.25rem" }}>
              Cumplimiento del mes
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#39a900" strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50 * completedPct / 100} ${2 * Math.PI * 50}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50 * pendingPct / 100} ${2 * Math.PI * 50}`}
                  strokeDashoffset={`-${2 * Math.PI * 50 * completedPct / 100}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#ef4444" strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50 * cancelledPct / 100} ${2 * Math.PI * 50}`}
                  strokeDashoffset={`-${2 * Math.PI * 50 * (completedPct + pendingPct) / 100}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
                <text x="60" y="56" textAnchor="middle" fill="#111827" fontSize="18" fontWeight="800">{completedPct}%</text>
                <text x="60" y="72" textAnchor="middle" fill="#9ca3af" fontSize="9">Completadas</text>
              </svg>
            </div>
            {[
              { label: "Completadas", pct: completedPct, color: "#39a900" },
              { label: "Pendientes",  pct: pendingPct,   color: "#f59e0b" },
              { label: "Canceladas",  pct: cancelledPct, color: "#ef4444" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{l.label}</span>
                </div>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>{l.pct}%</span>
              </div>
            ))}
          </div>

          {/* Acciones rápidas */}
          <div className="coord-card">
            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111827", marginBottom: "1rem" }}>
              Acciones rápidas
            </div>
            {[
              { icon: Users,    label: "Gestionar aprendices",  sub: "Ver todos los perfiles",   color: "#39a900", bg: "#f0fce4" },
              { icon: BarChart2,label: "Reporte de período",     sub: "Exportar en PDF o Excel",  color: "#3b82f6", bg: "#eff6ff" },
              { icon: Calendar, label: "Horarios disponibles",   sub: "Gestionar disponibilidad", color: "#8b5cf6", bg: "#f5f3ff" },
            ].map(({ icon: Icon, label, sub, color, bg }) => (
              <div key={label}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", borderRadius: 8, cursor: "pointer", transition: "background 0.1s, border-color 0.1s", border: "1.5px solid transparent", marginBottom: "0.25rem" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                  <Icon size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{sub}</div>
                </div>
                <ChevronRight size={14} color="#d1d5db" />
              </div>
            ))}
          </div>

          {/* Alerta "Atención requerida" — más prominente */}
          <div style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "1.125rem 1.125rem 1.125rem 1rem", border: "1px solid #fcd34d", borderLeftWidth: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", marginBottom: "0.625rem" }}>
              <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#92400e" }}>
                Atención requerida
              </div>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#92400e", lineHeight: 1.6, margin: "0 0 0.875rem" }}>
              Hay <strong style={{ fontSize: "1rem" }}>{data?.pending ?? "—"} citas pendientes</strong> sin confirmar por profesionales.
            </p>
            <button style={{ width: "100%", padding: "0.5625rem", background: "#f59e0b", color: "white", border: "none", borderRadius: 8, fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
              Ver pendientes →
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        .coord-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 1.5rem;
          padding: 1.5rem 2rem;
          max-width: 1240px;
          margin: 0 auto;
        }
        .coord-main { display: flex; flex-direction: column; gap: 1.25rem; }
        .coord-sidebar-right { display: flex; flex-direction: column; gap: 1.25rem; }
        .coord-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .kpi-card-desktop {
          background: white;
          border-radius: 14px;
          padding: 1.25rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .coord-card {
          background: white;
          border-radius: 14px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .coord-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .coord-card-header h3 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.125rem;
        }
        .coord-card-header p {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0;
        }
        @media (max-width: 1100px) {
          .coord-layout { grid-template-columns: 1fr; }
          .coord-sidebar-right { display: grid; grid-template-columns: 1fr 1fr; }
          .coord-kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .coord-layout { padding: 1rem; }
          .coord-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
          .coord-sidebar-right { grid-template-columns: 1fr; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
