import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight, Tag, Target, StickyNote, Calendar, User, ArrowLeft, FileText, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { SenaLogo } from "../../../shared/components/SenaLogo";
import { supabase } from "../../../lib/supabase";

const OBS_LABELS = { done: "Cita cumplida", follow: "Requiere seguimiento", refer: "Remitir a otro servicio" };

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const MOCK_DATA = {
  apt: {
    id: "mock-result-id",
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: "10:00",
    reason: "Seguimiento académico y apoyo emocional por bajo rendimiento",
    user_id: "mock-user",
    profiles: { full_name: "Juan Andrés Pérez García", document_number: "1004567890" },
    dependencies: { name: "Psicología" },
  },
  notes: "El aprendiz muestra avances significativos en el manejo del estrés académico. Se reforzaron técnicas de organización del tiempo.",
  tags: ["Estrés académico", "Seguimiento", "Bajo rendimiento"],
  objectives: ["Identificar fuentes de estrés", "Establecer rutinas de estudio"],
  obs: ["done", "follow"],
};

export default function AttentionResult() {
  const { id }     = useParams();
  const { state }  = useLocation();
  const navigate   = useNavigate();

  const [loading, setLoading] = useState(!state && !IS_DEV);
  const [data,    setData]    = useState(state || (IS_DEV ? MOCK_DATA : null));

  useEffect(() => {
    if (state || IS_DEV) return;
    supabase
      .from("appointments")
      .select("id, scheduled_date, scheduled_time, reason, notes, tags, observations, objectives_checked, user_id, started_at, updated_at, profiles!user_id(full_name, document_number), dependencies(name)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data: apt }) => {
        if (apt) {
          setData({
            apt: {
              id: apt.id,
              scheduled_date: apt.scheduled_date,
              scheduled_time: apt.scheduled_time,
              reason: apt.reason,
              user_id: apt.user_id,
              profiles: apt.profiles,
              dependencies: apt.dependencies,
              started_at: apt.started_at,
              updated_at: apt.updated_at,
            },
            notes:      apt.notes      || "",
            tags:       apt.tags       || [],
            objectives: apt.objectives_checked || [],
            obs:        apt.observations || [],
          });
        }
        setLoading(false);
      });
  }, [id, state]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f7fa" }}>
        <Loader2 size={32} color="#39a900" style={{ animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "0.5rem", fontFamily: "var(--font-sans)" }}>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#e5e7eb" }}>404</div>
        <div style={{ color: "#9ca3af" }}>Registro no encontrado</div>
        <button onClick={() => navigate("/professional")} style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", background: "#39a900", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          Volver al panel
        </button>
      </div>
    );
  }

  const { apt, notes, tags, objectives, obs } = data;
  const hasFollow = obs.includes("follow");
  const initials  = apt?.profiles?.full_name?.split(" ").slice(0, 2).map(w => w[0]).join("") || "?";
  const durationMin = apt?.started_at
    ? Math.max(1, Math.round((new Date(apt.updated_at || Date.now()) - new Date(apt.started_at)) / 60000))
    : null;

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => navigate("/professional")}
              style={{ width: 36, height: 36, borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}
            >
              <ArrowLeft size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SenaLogo size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111827" }}>Resultado de atención</div>
                <div style={{ fontSize: "0.6875rem", color: "#39a900", fontWeight: 600 }}>Registro guardado exitosamente</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/professional")}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5625rem 1.125rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            <Calendar size={14} color="#39a900" /> Volver al panel
          </button>
        </div>
      </div>

      <div className="result-layout">

        {/* Columna principal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Success card */}
          <div style={{ background: "linear-gradient(135deg, #1a6b00 0%, #39a900 100%)", borderRadius: "16px", padding: "2rem 2.25rem", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: -30, right: 80, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={30} color="white" strokeWidth={1.5} />
              </div>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", letterSpacing: "-0.025em", marginBottom: "0.375rem", fontFamily: "var(--font-display)", lineHeight: 1.15 }}>
                  Atención completada
                </h1>
                <p style={{ fontSize: "0.9375rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                  El registro clínico fue guardado correctamente en el sistema Bienestar SENA.
                </p>
                {hasFollow && (
                  <div style={{ marginTop: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.875rem", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "99px" }}>
                    <RefreshCw size={13} color="rgba(255,255,255,0.9)" />
                    <span style={{ fontSize: "0.8125rem", color: "white", fontWeight: 600 }}>Requiere seguimiento</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aprendiz atendido */}
          {apt && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                Aprendiz atendido
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.125rem" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #39a900, #2d8600)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 800, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: "1.0625rem" }}>{apt.profiles?.full_name}</div>
                  <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.125rem", display: "flex", gap: "1rem" }}>
                    {apt.profiles?.document_number && <span>Doc: {apt.profiles.document_number}</span>}
                    <span>{apt.dependencies?.name}</span>
                  </div>
                </div>
                {apt.scheduled_date && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", textTransform: "capitalize" }}>
                      {format(parseISO(apt.scheduled_date), "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>{durationMin ? `${durationMin} minutos` : "~60 minutos"}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Etiquetas */}
          {tags.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
                <Tag size={13} /> Etiquetas utilizadas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {tags.map(t => (
                  <span key={t} style={{ padding: "0.375rem 0.875rem", background: "#f0fce4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "100px", fontSize: "0.8125rem", fontWeight: 600 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Motivo + Notas */}
          {(apt?.reason || notes) && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.375rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {apt?.reason && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                    <FileText size={13} /> Motivo de consulta
                  </div>
                  <p style={{ fontSize: "0.9375rem", color: "#374151", lineHeight: 1.65, borderLeft: "3px solid #d1fae5", paddingLeft: "1rem", margin: 0 }}>
                    {apt.reason}
                  </p>
                </div>
              )}
              {notes && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                    <StickyNote size={13} /> Notas de la atención
                  </div>
                  <p style={{ fontSize: "0.9375rem", color: "#374151", lineHeight: 1.7, margin: 0, background: "#fafafa", borderRadius: "10px", padding: "1rem", borderLeft: "3px solid #39a900" }}>
                    {notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Objetivos trabajados */}
          {objectives.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
                <Target size={13} /> Objetivos trabajados
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {objectives.map(o => (
                  <div key={o} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.625rem 0.875rem", background: "#f0fce4", borderRadius: "10px", border: "1px solid #d1fae5" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={12} color="white" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: "0.9375rem", color: "#166534", fontWeight: 500 }}>{o}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Resultado observaciones */}
          {obs.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                Resultado
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {obs.map(o => (
                  <div key={o} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0.875rem", background: o === "follow" ? "#fffbeb" : "#f0fce4", borderRadius: "10px", border: `1px solid ${o === "follow" ? "#fde68a" : "#bbf7d0"}` }}>
                    <Check size={14} color={o === "follow" ? "#d97706" : "#39a900"} />
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: o === "follow" ? "#92400e" : "#166534" }}>
                      {OBS_LABELS[o]}
                    </span>
                  </div>
                ))}
              </div>
              {hasFollow && (
                <div style={{ marginTop: "1rem", padding: "0.875rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <AlertCircle size={14} color="#d97706" />
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400e" }}>Seguimiento recomendado</span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#b45309", lineHeight: 1.55, margin: 0 }}>
                    Se recomienda agendar una nueva cita en las próximas 2 semanas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
              Acciones
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {[
                { label: "Ver historial del aprendiz", icon: User,      action: () => apt?.user_id && navigate(`/aprendiz/${apt.user_id}/historial`) },
                { label: "Ver agenda semanal",            icon: Calendar,  action: () => navigate("/professional/agenda") },
                { label: "Volver al panel",              icon: ArrowLeft, action: () => navigate("/professional") },
              ].map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 0.75rem", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "0.9375rem", color: "#374151", textAlign: "left", borderRadius: "8px", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color="#6b7280" />
                  </div>
                  <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
                  <ChevronRight size={14} color="#d1d5db" />
                </button>
              ))}
            </div>
          </div>

          {/* Reconocimiento institucional */}
          <div style={{ background: "linear-gradient(to bottom, #f0fce4, #ecfdf5)", borderRadius: "14px", padding: "1.375rem 1.5rem", border: "1px solid #bbf7d0" }}>
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.875rem" }}>
              <SenaLogo size={30} />
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#166534", marginBottom: "0.25rem" }}>
              Gracias por tu dedicación
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#15803d", lineHeight: 1.6 }}>
              Tu trabajo contribuye directamente al bienestar y desarrollo de los aprendices SENA.
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .result-layout { max-width: 1000px; margin: 0 auto; padding: 1.75rem 2rem; display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; align-items: start; }
        @media (max-width: 768px) { .result-layout { grid-template-columns: 1fr; padding: 1rem; } }
      `}</style>
    </div>
  );
}
