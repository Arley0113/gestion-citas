import { useState, useEffect } from "react";
import { CheckCircle2, TrendingUp, UserX, CalendarDays, Award } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, parseISO, getWeek } from "date-fns";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const MOCK_STATS = {
  stats:       { total: 38, completed: 31, noShow: 4, avgDaily: "2.2" },
  weekData:    [{ label: "Sem 1", value: 8 }, { label: "Sem 2", value: 11 }, { label: "Sem 3", value: 9 }, { label: "Sem 4", value: 10 }],
  topAprendices: [
    { name: "María Torres", count: 5 }, { name: "Juan Pérez", count: 4 },
    { name: "Ana Gómez", count: 3 },   { name: "Carlos Ruiz", count: 3 },
    { name: "Luis Martínez", count: 2 },
  ],
};

const AVATAR_COLORS = ["#39a900","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#06b6d4"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const PERIODS = [
  { key: "mes",  label: "Este mes"   },
  { key: "prev", label: "Último mes" },
  { key: "year", label: "Este año"   },
];

export default function ProfessionalStatsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("mes");
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [stats, setStats]           = useState({ total: 0, completed: 0, noShow: 0, avgDaily: "0.0" });
  const [weekData, setWeekData]     = useState([]);
  const [topAprendices, setTopAprendices] = useState([]);

  useEffect(() => {
    if (IS_DEV) {
      setStats(MOCK_STATS.stats);
      setWeekData(MOCK_STATS.weekData);
      setTopAprendices(MOCK_STATS.topAprendices);
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }

    const now = new Date();
    let dateFrom;
    let dateTo = null;
    if (period === "mes")  dateFrom = format(startOfMonth(now), "yyyy-MM-dd");
    else if (period === "prev") {
      dateFrom = format(startOfMonth(subDays(now, 30)), "yyyy-MM-dd");
      dateTo   = format(endOfMonth(subDays(now, 30)), "yyyy-MM-dd");
    }
    else dateFrom = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd");

    setLoading(true);
    let q = supabase
      .from("appointments")
      .select("id, status, scheduled_date, aprendiz:profiles!user_id(full_name)")
      .eq("professional_id", user.id)
      .gte("scheduled_date", dateFrom);
    if (dateTo) q = q.lte("scheduled_date", dateTo);
    q = q.order("scheduled_date");
    q
      .then(({ data, error }) => {
        if (error) { toast.error("Error al cargar estadísticas"); setLoading(false); return; }
        const rows = data || [];

        const total     = rows.length;
        const completed = rows.filter(a => a.status === "completed").length;
        const noShow    = rows.filter(a => a.status === "no_show").length;
        const days      = Math.max(1, Math.ceil((now - parseISO(dateFrom)) / 86400000));
        const avgDaily  = (total / days).toFixed(1);
        setStats({ total, completed, noShow, avgDaily });

        // Agrupar por semana ISO
        const weekMap = {};
        rows.forEach(a => {
          const w = getWeek(parseISO(a.scheduled_date));
          weekMap[w] = (weekMap[w] || 0) + 1;
        });
        const weeks = Object.entries(weekMap).slice(-4).map(([, count], i) => ({
          label: `Sem ${i + 1}`, value: count,
        }));
        setWeekData(weeks.length ? weeks : [{ label: "Sin datos", value: 0 }]);

        // Top aprendices
        const aprendizMap = {};
        rows.forEach(a => {
          const name = a.aprendiz?.full_name || "Sin nombre";
          aprendizMap[name] = (aprendizMap[name] || 0) + 1;
        });
        setTopAprendices(
          Object.entries(aprendizMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))
        );
        setLoading(false);
      });
  }, [user, period]);

  const attendance = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const maxVal     = Math.max(...weekData.map(d => d.value), 1);
  const maxCitas   = Math.max(...topAprendices.map(a => a.count), 1);

  const KPIS = [
    { label: "Citas realizadas",   value: String(stats.total),     icon: CheckCircle2, color: "#39a900", bg: "#f0fce4" },
    { label: "Tasa de asistencia", value: `${attendance}%`,        icon: TrendingUp,   color: "#39a900", bg: "#f0fce4" },
    { label: "No asistieron",      value: String(stats.noShow),    icon: UserX,        color: "#d97706", bg: "#fef3c7" },
    { label: "Promedio diario",    value: stats.avgDaily,          icon: CalendarDays, color: "#3b82f6", bg: "#eff6ff" },
  ];

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Mis estadísticas</div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>Mi desempeño</h1>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>Métricas de atención del período seleccionado</p>
            </div>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{ padding: "0.375rem 0.875rem", borderRadius: 20, border: "1.5px solid", borderColor: period === p.key ? "#39a900" : "#e5e7eb", background: period === p.key ? "#39a900" : "white", color: period === p.key ? "white" : "#6b7280", fontFamily: "var(--font-sans)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : stats.total === 0 ? (
          <>
            <div style={{ textAlign: "center", padding: "4rem 1rem", background: "white", borderRadius: 14, border: "1px solid #e5e7eb" }}>
              <CalendarDays size={40} color="#e5e7eb" style={{ margin: "0 auto 0.875rem" }} />
              <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151" }}>Sin citas en este período</div>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.375rem" }}>Las estadísticas aparecerán cuando tengas citas registradas.</p>
            </div>
          </>
        ) : (
          <>
            {/* Logro del mes */}
            {attendance >= 80 && (
              <div style={{ background: "linear-gradient(135deg, #f0fce4, #dcfce7)", border: "1px solid #bbf7d0", borderRadius: 14, padding: "1.125rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Award size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#166534" }}>¡Excelente desempeño!</div>
                  <div style={{ fontSize: "0.8125rem", color: "#16a34a" }}>Superaste el 80% de asistencia · Sigue así</div>
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {KPIS.map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={17} color={color} />
                    </div>
                  </div>
                  <div style={{ fontSize: "1.875rem", fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "var(--font-display)" }}>{value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.375rem", fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }} className="main-two-col">

              {/* Bar chart CSS */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827", marginBottom: "1.5rem" }}>Citas por semana</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 120, paddingBottom: "0.25rem" }}>
                  {weekData.map(({ label, value }) => {
                    const h = Math.round((value / maxVal) * 100);
                    return (
                      <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#39a900" }}>{value}</span>
                        <div style={{ width: "100%", height: `${Math.max(h, 4)}px`, background: "linear-gradient(to top, #39a900, #5bc700)", borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
                        <span style={{ fontSize: "0.6875rem", color: "#6b7280", fontWeight: 500 }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top aprendices */}
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>Top aprendices atendidos</div>
                {topAprendices.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>Sin datos</div>
                ) : topAprendices.map((a, i) => (
                  <div key={a.name} onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1.5rem", background: hoveredRow === i ? "#f0fce4" : i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.12s", borderBottom: i < topAprendices.length - 1 ? "1px solid #f9fafb" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(a.name), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: "0.875rem" }}>{a.name[0]}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                      <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginTop: "0.375rem" }}>
                        <div style={{ height: 4, width: `${(a.count / maxCitas) * 100}%`, background: "#39a900", borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", minWidth: 24, textAlign: "right" }}>{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
