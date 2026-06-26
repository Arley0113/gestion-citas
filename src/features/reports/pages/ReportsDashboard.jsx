import { useEffect, useState, useCallback } from "react";
import { BarChart2, Download, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { P } from "../../../shared/rbac/permissions";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const STATUS_CONFIG = {
  pending:     { label: "Pendiente",     color: "#f59e0b", bg: "#fef3c7" },
  confirmed:   { label: "Confirmada",    color: "#3b82f6", bg: "#dbeafe" },
  in_progress: { label: "En atención",   color: "#8b5cf6", bg: "#f5f3ff" },
  completed:   { label: "Completada",    color: "#39a900", bg: "#dcfce7" },
  cancelled:   { label: "Cancelada",     color: "#ef4444", bg: "#fee2e2" },
  no_show:     { label: "No asistió",    color: "#9ca3af", bg: "#f3f4f6" },
};

const DEV_STATS = {
  total: 148,
  byStatus: [
    { status: "pending",     count: 12 },
    { status: "confirmed",   count: 8  },
    { status: "completed",   count: 104 },
    { status: "cancelled",   count: 18 },
    { status: "no_show",     count: 6  },
  ],
  byDep: [
    { name: "Psicología",     count: 67, color: "#39a900" },
    { name: "Enfermería",     count: 51, color: "#0ea5e9" },
    { name: "Trabajo Social", count: 30, color: "#f59e0b" },
  ],
  monthly: [
    { month: "Ene", total: 18 },
    { month: "Feb", total: 22 },
    { month: "Mar", total: 19 },
    { month: "Abr", total: 25 },
    { month: "May", total: 31 },
    { month: "Jun", total: 33 },
  ],
};

const TOP_PROGRAMS = [
  { name: "Desarrollo de Software",      count: 34, pct: 23 },
  { name: "Contabilidad y Finanzas",     count: 28, pct: 19 },
  { name: "Administración de Empresas",  count: 22, pct: 15 },
  { name: "Diseño Gráfico",              count: 18, pct: 12 },
  { name: "Mantenimiento Industrial",    count: 14, pct: 9  },
];

const PERIODS = [
  { key: "semana", label: "Esta semana" },
  { key: "mes",    label: "Este mes"    },
  { key: "año",    label: "Este año"    },
  { key: "todo",   label: "Todo"        },
];

function useReportsData() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (DEV_ROLE) {
      setData(DEV_STATS);
      setLoading(false);
      return;
    }
    try {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString().slice(0, 10);

      const [{ data: all }] = await Promise.all([
        supabase.from("appointments").select("status, scheduled_date, dependency_id, dependencies(name, color)"),
      ]);

      const rows = all || [];
      const total = rows.length;
      const statusMap = {};
      const depMap    = {};
      const monthMap  = {};

      rows.forEach(r => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
        const depName  = r.dependencies?.name  || "Sin dependencia";
        const depColor = r.dependencies?.color || "#9ca3af";
        if (!depMap[depName]) depMap[depName] = { name: depName, count: 0, color: depColor };
        depMap[depName].count++;

        if (r.scheduled_date >= sixMonthsAgo) {
          const mo = format(new Date(r.scheduled_date), "MMM", { locale: es });
          const key = r.scheduled_date.slice(0, 7);
          monthMap[key] = { month: mo.charAt(0).toUpperCase() + mo.slice(1), total: (monthMap[key]?.total || 0) + 1 };
        }
      });

      setData({
        total,
        byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        byDep:    Object.values(depMap).sort((a, b) => b.count - a.count),
        monthly:  Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

export default function ReportsDashboard() {
  const { can }          = usePermissions();
  const { data, loading } = useReportsData();
  const canExport        = can(P.REPORTS_EXPORT);
  const now              = new Date();
  const [period, setPeriod] = useState("mes");

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Estado", "Cantidad"],
      ...(data.byStatus || []).map(s => [STATUS_CONFIG[s.status]?.label || s.status, s.count]),
      [],
      ["Dependencia", "Cantidad"],
      ...(data.byDep || []).map(d => [d.name, d.count]),
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `reporte-citas-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => toast.info("Generando PDF...");

  const completedCount = data?.byStatus?.find(s => s.status === "completed")?.count ?? 0;
  const attendanceRate = data?.total ? Math.round((completedCount / data.total) * 100) : 96;

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Header ─── */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Reportes
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.2, fontFamily: "var(--font-display)", margin: 0 }}>
                Panel de reportes
              </h1>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
                {now.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            {canExport && (
              <div style={{ display: "flex", gap: "0.625rem" }}>
                <button
                  onClick={handleExportPDF}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", background: "white", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#d1d5db"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <FileText size={15} color="#6b7280" />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={loading || !data}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", background: "#39a900", color: "white", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", transition: "background 0.15s", opacity: loading ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2d8200"}
                  onMouseLeave={e => e.currentTarget.style.background = "#39a900"}
                >
                  <Download size={15} />
                  Exportar CSV
                </button>
              </div>
            )}
          </div>

          {/* Selector de período */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: 20,
                  border: period === p.key ? "none" : "1.5px solid #e5e7eb",
                  background: period === p.key ? "#39a900" : "white",
                  color: period === p.key ? "white" : "#6b7280",
                  fontSize: "0.8125rem",
                  fontWeight: period === p.key ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          </div>
        ) : data ? (
          <>
            {/* ─── KPIs (5 columnas) ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total citas",       value: data.total,                                                                                                                             icon: Calendar,     color: "#3b82f6", bg: "#eff6ff" },
                { label: "Completadas",        value: data.byStatus.find(s => s.status === "completed")?.count ?? 0,                                                                          icon: CheckCircle,  color: "#39a900", bg: "#f0fce4" },
                { label: "Pendientes",         value: (data.byStatus.find(s => s.status === "pending")?.count ?? 0) + (data.byStatus.find(s => s.status === "confirmed")?.count ?? 0),       icon: Clock,        color: "#f59e0b", bg: "#fffbeb" },
                { label: "No asistieron",      value: data.byStatus.find(s => s.status === "no_show")?.count ?? 0,                                                                            icon: AlertTriangle,color: "#9ca3af", bg: "#f9fafb" },
                { label: "Tasa de asistencia", value: `${attendanceRate}%`,                                                                                                                   icon: TrendingUp,   color: "#39a900", bg: "#f0fce4", isRate: true },
              ].map(({ label, value, icon: Icon, color, bg, isRate }) => (
                <div key={label} style={{ background: "white", borderRadius: "12px", padding: "1.125rem 1.25rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 500 }}>{label}</span>
                    <div style={{ width: 30, height: 30, borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} color={color} />
                    </div>
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.03em", fontFamily: "var(--font-display)" }}>
                    {value}
                  </div>
                  {isRate && (
                    <div style={{ marginTop: "0.5rem", height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${attendanceRate}%`, background: "linear-gradient(90deg, #39a900, #5bc700)", borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ─── Gráficos ─── */}
            <div className="chart-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>

              <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Distribución</div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: "0 0 1.25rem", fontFamily: "var(--font-display)" }}>Citas por dependencia</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.byDep} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [v, "Citas"]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.8125rem" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.byDep.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Tendencia</div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: "0 0 1.25rem", fontFamily: "var(--font-display)" }}>Citas por mes</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [v, "Citas"]} contentStyle={{ border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.8125rem" }} />
                    <Line type="monotone" dataKey="total" stroke="#39a900" strokeWidth={2.5} dot={{ fill: "#39a900", r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── Por estado ─── */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Desglose</div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: "0 0 1.25rem", fontFamily: "var(--font-display)" }}>Citas por estado</h2>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {data.byStatus.map(({ status, count }) => {
                  const cfg = STATUS_CONFIG[status] || { label: status, color: "#9ca3af", bg: "#f9fafb" };
                  const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                  return (
                    <div key={status} style={{ flex: "1 1 140px", background: cfg.bg, border: `1px solid ${cfg.color}20`, borderRadius: "10px", padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.8125rem", color: "#6b7280", fontWeight: 500 }}>{cfg.label}</span>
                      </div>
                      <div style={{ fontSize: "1.625rem", fontWeight: 800, color: cfg.color, lineHeight: 1, fontFamily: "var(--font-display)" }}>{count}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem" }}>{pct}% del total</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Top 5 programas ─── */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Programas</div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Top 5 programas con más citas</h2>
              </div>
              {/* Tabla header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 60px", padding: "0.5rem 1.5rem", background: "#fafafa", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6" }}>
                {["Programa de formación", "Citas", "Distribución", "%"].map(h => (
                  <div key={h} style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>
              {TOP_PROGRAMS.map(({ name, count, pct }, i) => (
                <div
                  key={name}
                  style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 60px", padding: "0.875rem 1.5rem", background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: i < TOP_PROGRAMS.length - 1 ? "1px solid #f9fafb" : "none", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0fce4"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"}
                >
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#111827" }}>{name}</div>
                  <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#39a900", fontFamily: "var(--font-display)" }}>{count}</div>
                  <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(pct / 23) * 100}%`, background: "linear-gradient(90deg, #39a900, #5bc700)", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#6b7280" }}>{pct}%</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#9ca3af" }}>
            <BarChart2 size={40} color="#e5e7eb" style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No se pudieron cargar los reportes</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
