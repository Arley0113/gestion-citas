import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Calendar, CheckCircle2, XCircle, Clock, UserPlus, AlertCircle, PlayCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_META = {
  pending:     { icon: Clock,         color: "#f59e0b", bg: "#fef3c7", label: "Pendiente" },
  confirmed:   { icon: CheckCircle2,  color: "#39a900", bg: "#f0fce4", label: "Confirmada" },
  cancelled:   { icon: XCircle,       color: "#ef4444", bg: "#fef2f2", label: "Cancelada" },
  in_progress: { icon: PlayCircle,    color: "#3b82f6", bg: "#eff6ff", label: "En atención" },
  completed:   { icon: CheckCircle2,  color: "#8b5cf6", bg: "#f5f3ff", label: "Completada" },
  no_show:     { icon: AlertCircle,   color: "#6b7280", bg: "#f9fafb", label: "No asistió" },
};

const DEP_LABELS = { 1: "Psicología", 2: "Enfermería", 3: "Trabajo Social" };

export default function ActividadPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("appointments")
        .select("id, status, scheduled_date, scheduled_time, created_at, cancelled_reason, dependency_id, profiles!user_id(full_name, document_number), dependencies(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "linear-gradient(to bottom, #fef3c7, #f5f7fa)", borderBottom: "1px solid #fde68a" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 2rem 1.5rem" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: "1rem", padding: 0 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={20} color="#f59e0b" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Registro de actividad</h1>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>Últimas 100 citas del sistema</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 2rem" }}>
        {/* Filtro por estado */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[["all", "Todas"], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: "0.375rem 0.875rem", borderRadius: 20, border: "1.5px solid",
                borderColor: filter === key ? "#39a900" : "#e5e7eb",
                background: filter === key ? "#f0fce4" : "white",
                color: filter === key ? "#166534" : "#6b7280",
                fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>Cargando...</div>
        ) : (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.875rem" }}>Sin registros</div>
            ) : filtered.map((row, i) => {
              const meta = STATUS_META[row.status] || STATUS_META.pending;
              const Icon = meta.icon;
              const date = row.created_at ? parseISO(row.created_at) : null;
              return (
                <div
                  key={row.id}
                  onClick={() => navigate(`/cita/${row.id}`)}
                  style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.875rem 1.25rem", borderBottom: i < filtered.length - 1 ? "1px solid #f9fafb" : "none", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.125rem" }}>
                    <Icon size={16} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>
                      {row.profiles?.full_name || "Aprendiz"} — {row.dependencies?.name || DEP_LABELS[row.dependency_id] || "Dependencia"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span>{row.scheduled_date} {row.scheduled_time?.slice(0,5)}</span>
                      {row.cancelled_reason && <span style={{ color: "#ef4444" }}>Motivo: {row.cancelled_reason}</span>}
                      {date && <span>{format(date, "d MMM yyyy, HH:mm", { locale: es })}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: meta.color, background: meta.bg, padding: "0.2rem 0.625rem", borderRadius: 20, flexShrink: 0 }}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
