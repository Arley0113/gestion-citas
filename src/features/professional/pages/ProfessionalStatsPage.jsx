import { useState } from "react";
import { CheckCircle2, TrendingUp, UserX, CalendarDays, Award } from "lucide-react";

const AVATAR_COLORS = ["#39a900","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#06b6d4"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const PERIODS = [
  { key: "mes",  label: "Este mes"    },
  { key: "prev", label: "Último mes"  },
  { key: "year", label: "Este año"    },
];

const WEEK_DATA = [
  { label: "Sem 1", value: 12 },
  { label: "Sem 2", value: 9  },
  { label: "Sem 3", value: 14 },
  { label: "Sem 4", value: 7  },
];
const maxVal = Math.max(...WEEK_DATA.map(d => d.value));

const TOP_APRENDICES = [
  { name: "Laura Gómez",    citas: 4 },
  { name: "Carlos Ruiz",    citas: 3 },
  { name: "Ana Martínez",   citas: 3 },
  { name: "Pedro Torres",   citas: 2 },
  { name: "María López",    citas: 2 },
];
const maxCitas = Math.max(...TOP_APRENDICES.map(a => a.citas));

const KPIS = [
  { label: "Citas realizadas",   value: "42",  icon: CheckCircle2, color: "#39a900", bg: "#f0fce4", trend: "+8%",  up: true  },
  { label: "Tasa de asistencia", value: "87%", icon: TrendingUp,   color: "#39a900", bg: "#f0fce4", trend: "+4%",  up: true  },
  { label: "No asistieron",      value: "6",   icon: UserX,        color: "#d97706", bg: "#fef3c7", trend: "-2%",  up: false },
  { label: "Promedio diario",    value: "5.2", icon: CalendarDays, color: "#3b82f6", bg: "#eff6ff", trend: "+0.3", up: true  },
];

export default function ProfessionalStatsPage() {
  const [period, setPeriod] = useState("mes");
  const [hoveredRow, setHoveredRow] = useState(null);

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
            {/* Period selector */}
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

        {/* Logro del mes */}
        <div style={{ background: "linear-gradient(135deg, #f0fce4, #dcfce7)", border: "1px solid #bbf7d0", borderRadius: 14, padding: "1.125rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Award size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#166534" }}>¡Excelente mes!</div>
            <div style={{ fontSize: "0.8125rem", color: "#16a34a" }}>Superaste el 80% de asistencia · Sigue así</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {KPIS.map(({ label, value, icon: Icon, color, bg, trend, up }) => (
            <div key={label} style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: up ? "#16a34a" : "#dc2626" }}>
                  {up ? "▲" : "▼"} {trend}
                </span>
              </div>
              <div style={{ fontSize: "1.875rem", fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "var(--font-display)" }}>{value}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.375rem", fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: "0.6875rem", color: "#d1d5db", marginTop: "0.125rem" }}>vs mes anterior</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }} className="main-two-col">

          {/* Bar chart CSS */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827", marginBottom: "1.5rem" }}>Citas por semana</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 120, paddingBottom: "0.25rem" }}>
              {WEEK_DATA.map(({ label, value }) => {
                const h = Math.round((value / maxVal) * 100);
                return (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#39a900" }}>{value}</span>
                    <div style={{ width: "100%", height: `${h}px`, background: "linear-gradient(to top, #39a900, #5bc700)", borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
                    <span style={{ fontSize: "0.6875rem", color: "#9ca3af", fontWeight: 500 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top aprendices */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>Top aprendices atendidos</div>
            {TOP_APRENDICES.map((a, i) => (
              <div
                key={a.name}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1.5rem", background: hoveredRow === i ? "#f0fce4" : i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.12s", borderBottom: i < TOP_APRENDICES.length - 1 ? "1px solid #f9fafb" : "none" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(a.name), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontWeight: 700, fontSize: "0.875rem" }}>{a.name[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginTop: "0.375rem" }}>
                    <div style={{ height: 4, width: `${(a.citas / maxCitas) * 100}%`, background: "#39a900", borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", minWidth: 24, textAlign: "right" }}>{a.citas}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
