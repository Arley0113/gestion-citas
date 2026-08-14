import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";
import { useAuth } from "../../../providers/AuthProvider";

const STATUS_DOT = { completed: "#22c55e", pending: "#f59e0b", confirmed: "#0284c7", cancelled: "#ef4444", no_show: "#6b7280" };
const STATUS_LBL = { completed: "Completada", pending: "Pendiente", confirmed: "Confirmada", cancelled: "Cancelada", no_show: "No asistió" };
const STATUS_BG  = { completed: "#f0fce4", pending: "#fffbeb", confirmed: "#eff6ff", cancelled: "#fef2f2", no_show: "#f9fafb" };
const STATUS_CLR = { completed: "#166534", pending: "#92400e", confirmed: "#1e40af", cancelled: "#991b1b", no_show: "#6b7280" };

const TABS = ["Resumen", "Historial", "Evolución"];

const sectionLabel = {
  fontSize: "0.6875rem", fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem",
};

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const MOCK_PROFILE = { id: "mock", full_name: "Juan Pérez", document_number: "1034567890", program: "Tecnología en Desarrollo de Software", dependencies: { name: "Psicología" } };
const MOCK_APTS = [
  { id: "1", status: "completed", scheduled_date: "2026-06-10", scheduled_time: "09:00:00", reason: "Ansiedad académica", dependencies: { name: "Psicología", color: "#39a900" } },
  { id: "2", status: "completed", scheduled_date: "2026-05-20", scheduled_time: "10:00:00", reason: "Seguimiento de bienestar", dependencies: { name: "Psicología", color: "#39a900" } },
  { id: "3", status: "completed", scheduled_date: "2026-04-15", scheduled_time: "14:00:00", reason: "Control de tensión arterial", dependencies: { name: "Enfermería", color: "#0284c7" } },
  { id: "4", status: "cancelled", scheduled_date: "2026-03-05", scheduled_time: "11:00:00", reason: "Apoyo emocional", dependencies: { name: "Psicología", color: "#39a900" } },
];

export default function AprendizHistory() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { isProfessional } = useAuth();
  const [profile, setProfile]   = useState(DEV_ROLE ? MOCK_PROFILE : null);
  const [apts, setApts]         = useState(DEV_ROLE ? MOCK_APTS : []);
  const [tab, setTab]           = useState("Resumen");
  const [loading, setLoading]   = useState(!DEV_ROLE);

  useEffect(() => {
    if (DEV_ROLE) return;
    const load = async () => {
      const [{ data: prof }, { data: aptsData }] = await Promise.all([
        supabase.from("profiles").select("*, dependencies(name)").eq("id", id).single(),
        supabase.from("appointments").select("*, dependencies(name,color)").eq("user_id", id).order("scheduled_date", { ascending: false }),
      ]);
      setProfile(prof);
      setApts(aptsData || []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#6b7280", fontFamily: "var(--font-sans)" }}>
      Cargando historial...
    </div>
  );
  if (!profile) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#6b7280", fontFamily: "var(--font-sans)" }}>
      Aprendiz no encontrado
    </div>
  );

  const total     = apts.length;
  const completed = apts.filter(a => a.status === "completed").length;
  const pending   = apts.filter(a => a.status === "pending").length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;
  const lastApt     = apts[0];
  const lastAptDate = lastApt?.scheduled_date ? parseISO(lastApt.scheduled_date) : null;
  const isFutureApt = lastAptDate && lastAptDate > new Date();
  const lastAptLabel = isFutureApt ? "Próxima cita" : "Última cita";
  const lastAgo     = lastAptDate
    ? formatDistanceToNow(lastAptDate, { locale: es, addSuffix: true })
    : null;

  // Agrupar citas completadas por mes para la gráfica
  const monthMap = {};
  apts.filter(a => a.status === "completed" && a.scheduled_date).forEach(a => {
    const key = format(parseISO(a.scheduled_date), "MMM yy", { locale: es });
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const chartData = Object.entries(monthMap).slice(-6).map(([name, value]) => ({ name, value }));

  const initials = profile.full_name?.split(" ").slice(0, 2).map(w => w[0]).join("") || "?";

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Top bar ─── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "white", borderBottom: "2px solid #39a900", padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 8px rgba(57,169,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Historial del aprendiz</div>
        </div>
        <button
          onClick={() => navigate("/professional")}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "#39a900", color: "white", border: "none", borderRadius: "8px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          <Calendar size={14} /> Agendar cita
        </button>
      </div>

      <div className="aprendiz-history-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", padding: "2rem 2.5rem", maxWidth: 1200, margin: "0 auto", alignItems: "start" }}>

        {/* ─── Panel izquierdo (perfil) ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Perfil */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#39a900", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem" }}>
                {initials}
              </div>
              <div style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#111827", marginBottom: "0.25rem" }}>
                {profile.full_name}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                {profile.ficha_number
                  ? `Ficha: ${profile.ficha_number}`
                  : profile.document_number
                    ? `CC: ${profile.document_number}`
                    : "—"}
              </div>
              {profile.program && (
                <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>{profile.program}</div>
              )}
              <span style={{ marginTop: "0.75rem", padding: "0.25rem 0.875rem", background: "#f0fce4", color: "#39a900", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 700 }}>
                Activo
              </span>
            </div>

            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Dependencia", value: profile.dependencies?.name || "—" },
                { label: lastAptLabel, value: lastAgo || "Sin citas" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.125rem" }}>{label}</div>
                  <div style={{ fontSize: "0.875rem", color: "#374151", fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem" }}>
            <div style={sectionLabel}>Resumen estadístico</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { value: total,     label: "Total citas" },
                { value: completed, label: "Completadas" },
                { value: pending,   label: "Pendientes" },
                { value: `${pct}%`, label: "Evolución" },
              ].map(({ value, label }) => (
                <div key={label} style={{ background: "#fafafa", borderRadius: "8px", padding: "0.875rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>{value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.125rem" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendación */}
          <div style={{ background: "#f0fce4", border: "1px solid #bbf7a0", borderRadius: "12px", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Recomendación</div>
            <div style={{ fontSize: "0.8125rem", color: "#166534", lineHeight: 1.6 }}>
              Continuar con el plan de acción y reforzar estrategias de afrontamiento.
            </div>
            <button
              onClick={() => navigate(isProfessional?.() ? "/professional" : "/coordination")}
              style={{ marginTop: "0.875rem", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", fontWeight: 600, color: "#39a900", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", padding: 0 }}
            >
              Agendar seguimiento <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ─── Panel principal (historial) ─── */}
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0", background: "white", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "4px", marginBottom: "1.5rem" }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "0.5rem 1rem", border: "none", borderRadius: "7px",
                  fontSize: "0.8125rem", fontWeight: tab === t ? 700 : 400,
                  background: tab === t ? "#111827" : "transparent",
                  color: tab === t ? "white" : "#6b7280",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Contenido por tab */}
          {tab === "Resumen" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Resumen rápido */}
              {lastApt && (
                <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem" }}>
                  <div style={sectionLabel}>{lastAptLabel}</div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "10px", background: "#f0fce4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#39a900", lineHeight: 1 }}>
                        {lastApt.scheduled_date ? format(parseISO(lastApt.scheduled_date), "d") : "—"}
                      </span>
                      <span style={{ fontSize: "0.5625rem", color: "#6b7280", textTransform: "uppercase" }}>
                        {lastApt.scheduled_date ? format(parseISO(lastApt.scheduled_date), "MMM", { locale: es }) : ""}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
                        {lastApt.reason || "Sin motivo especificado"}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                        {lastApt.dependencies?.name} · {lastAgo}
                      </div>
                    </div>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, background: STATUS_BG[lastApt.status] || "#f9fafb", color: STATUS_CLR[lastApt.status] || "#6b7280" }}>
                      {STATUS_LBL[lastApt.status]}
                    </span>
                  </div>
                </div>
              )}

              {/* Citas recientes */}
              <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={sectionLabel}>Citas recientes</span>
                  <button onClick={() => setTab("Historial")} style={{ fontSize: "0.8125rem", color: "#39a900", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    Ver todas <ChevronRight size={14} />
                  </button>
                </div>
                {apts.slice(0, 5).map((apt, i) => {
                  const d = apt.scheduled_date ? parseISO(apt.scheduled_date) : null;
                  return (
                    <div key={apt.id}
                      onClick={() => navigate(`/cita/${apt.id}${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                      style={{ display: "flex", alignItems: "center", gap: "1.125rem", padding: "1rem 1.5rem", borderBottom: i < Math.min(apts.length, 5) - 1 ? "1px solid #f3f4f6" : "none", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[apt.status] || "#d1d5db", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>{apt.reason || "Sin motivo"}</div>
                        <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.125rem" }}>
                          {apt.dependencies?.name} · {d ? format(d, "d MMM yyyy", { locale: es }) : "—"}
                        </div>
                      </div>
                      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, background: STATUS_BG[apt.status] || "#f9fafb", color: STATUS_CLR[apt.status] || "#6b7280" }}>
                        {STATUS_LBL[apt.status]}
                      </span>
                      <ChevronRight size={14} color="#d1d5db" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "Historial" && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
              {apts.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>No hay citas registradas.</div>
              ) : apts.map((apt, i) => {
                const d = apt.scheduled_date ? parseISO(apt.scheduled_date) : null;
                return (
                  <div key={apt.id}
                    onClick={() => navigate(`/cita/${apt.id}${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`)}
                    style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.125rem 1.5rem", borderBottom: i < apts.length - 1 ? "1px solid #f3f4f6" : "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", lineHeight: 1 }}>{d ? format(d, "d") : "—"}</div>
                      <div style={{ fontSize: "0.625rem", color: "#6b7280", textTransform: "uppercase" }}>{d ? format(d, "MMM yy", { locale: es }) : ""}</div>
                    </div>
                    <div style={{ width: 1, height: 36, background: "#e5e7eb", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>{apt.reason || "Sin motivo especificado"}</div>
                      <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.125rem" }}>
                        {apt.dependencies?.name} · {apt.scheduled_time ? apt.scheduled_time.slice(0, 5) : ""}
                      </div>
                    </div>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 600, background: STATUS_BG[apt.status] || "#f9fafb", color: STATUS_CLR[apt.status] || "#6b7280" }}>
                      {STATUS_LBL[apt.status]}
                    </span>
                    <ChevronRight size={14} color="#d1d5db" />
                  </div>
                );
              })}
            </div>
          )}

          {tab === "Evolución" && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem" }}>
              <div style={sectionLabel}>Citas completadas por mes</div>
              <div style={{ fontSize: "3rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.04em", marginBottom: "0.25rem" }}>{completed}</div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "2rem" }}>Total completadas · {pct}% de tasa de asistencia</div>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="value" stroke="#39a900" strokeWidth={2.5} dot={{ fill: "#39a900", r: 4 }} activeDot={{ r: 6 }} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontSize: "0.875rem" }}>
                  Se necesitan más citas completadas para mostrar la evolución.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .aprendiz-history-grid > * { min-width: 0; }
        @media (max-width: 768px) {
          .aprendiz-history-grid { grid-template-columns: 1fr !important; padding: 1.25rem !important; }
        }
      `}</style>
    </div>
  );
}
