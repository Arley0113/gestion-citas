import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, X, Target, Paperclip, CheckSquare, Square, Clock, Info, Activity, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

const TAGS    = ["Ansiedad", "Estrés", "Autoestima", "Motivación", "Rendimiento académico", "Apoyo familiar"];
const OBJECTIVES = [
  "Explorar causas de la ansiedad académica",
  "Identificar estrategias de afrontamiento",
  "Establecer plan de acción",
  "Realizar seguimiento y recomendaciones",
];
const OBSERVATIONS = [
  { key: "done",   label: "Cita cumplida" },
  { key: "follow", label: "Requiere seguimiento" },
  { key: "refer",  label: "Remitir a otro servicio" },
];

const timeLabel = (t) => {
  if (!t) return "—";
  const [h] = t.split(":").map(Number);
  return h < 12 ? `${h}:00 a. m.` : h === 12 ? "12:00 p. m." : `${h-12}:00 p. m.`;
};

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const MOCK_APT = {
  id: "mock-detail",
  status: "in_progress",
  scheduled_date: "2026-06-28",
  scheduled_time: "14:00:00",
  reason: "Estrés y dificultades de concentración antes de los exámenes del trimestre",
  dependencies: { name: "Psicología" },
  profiles: { full_name: "Juan Pérez", document_number: "1034567890", program: "Tecnología en Desarrollo de Software" },
};

function useElapsed(scheduledTime) {
  const getElapsed = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    const now = new Date();
    const start = new Date(now);
    start.setHours(h, m, 0, 0);
    return Math.max(0, Math.floor((now - start) / 60000));
  };
  const [elapsed, setElapsed] = useState(() => getElapsed(scheduledTime));
  const ref = useRef(null);
  useEffect(() => {
    setElapsed(getElapsed(scheduledTime));
    ref.current = setInterval(() => setElapsed(getElapsed(scheduledTime)), 60000);
    return () => clearInterval(ref.current);
  }, [scheduledTime]);
  return elapsed;
}

export default function AttentionInProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [apt, setApt]             = useState(DEV_ROLE ? MOCK_APT : null);
  const [notes, setNotes]         = useState("");
  const [selectedTags, setTags]   = useState([]);
  const [checkedObjs, setObjs]    = useState([]);
  const [selectedObs, setObs]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const elapsed = useElapsed(apt?.scheduled_time);

  useEffect(() => {
    if (DEV_ROLE) return;
    supabase
      .from("appointments")
      .select("*, dependencies(name), profiles!user_id(full_name,document_number,program)")
      .eq("id", id)
      .single()
      .then(({ data }) => setApt(data));
  }, [id]);

  const toggleTag = t => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleObj = o => setObjs(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o]);
  const toggleObs = o => setObs(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o]);

  const finish = async () => {
    setSaving(true);
    if (DEV_ROLE) {
      toast.success("Atención finalizada (demo)");
      navigate(`/cita/${id}/resultado${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`, { state: { apt, notes, tags: selectedTags, objectives: checkedObjs, obs: selectedObs } });
      return;
    }
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed", notes, tags: selectedTags, objectives_checked: checkedObjs, observations: selectedObs, updated_at: new Date() })
      .eq("id", id);
    if (error) { toast.error("Error guardando"); setSaving(false); return; }
    toast.success("Atención finalizada");
    navigate(`/cita/${id}/resultado`, { state: { apt, notes, tags: selectedTags, objectives: checkedObjs, obs: selectedObs } });
  };

  const markNoShow = async () => {
    if (!DEV_ROLE) await supabase.from("appointments").update({ status: "no_show", updated_at: new Date() }).eq("id", id);
    toast.info("Marcada como no asistió");
    navigate(`/professional${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`);
  };

  if (!apt) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#9ca3af", fontFamily: "var(--font-sans)" }}>
      Cargando...
    </div>
  );

  const initials = apt.profiles?.full_name?.split(" ").slice(0, 2).map(w => w[0]).join("") || "?";

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Top bar ─── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "white", borderBottom: "2px solid #39a900", boxShadow: "0 1px 8px rgba(57,169,0,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => navigate(-1)}
              style={{ width: 36, height: 36, borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ width: 1, height: 28, background: "#e5e7eb" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#39a900", boxShadow: "0 0 0 3px rgba(57,169,0,0.2)", animation: "pulse 2s infinite" }} />
              <div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111827" }}>Atención en curso</div>
                <div style={{ fontSize: "0.6875rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <Clock size={11} />
                  {timeLabel(apt.scheduled_time)} · {apt.dependencies?.name}
                  {elapsed > 0 && <span style={{ color: "#39a900", fontWeight: 600 }}>· {elapsed} min transcurridos</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.875rem", background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
              <Activity size={13} color="#39a900" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>
                {checkedObjs.length}/{OBJECTIVES.length} objetivos
              </span>
            </div>
            <button
              onClick={markNoShow}
              style={{ padding: "0.5rem 1rem", background: "white", border: "1.5px solid #fecaca", borderRadius: "8px", fontSize: "0.8125rem", fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              No asistió
            </button>
            <button
              onClick={finish} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5625rem 1.25rem", background: "#39a900", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 700, color: "white", cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: saving ? 0.7 : 1, boxShadow: "0 1px 4px rgba(57,169,0,0.25)" }}
            >
              <Check size={15} /> {saving ? "Guardando..." : "Finalizar atención"}
            </button>
          </div>
        </div>
      </div>

      <div className="attention-layout">

        {/* ─── Columna principal ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Paciente */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.375rem 1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #39a900, #2d8600)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem", fontWeight: 800, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>
                {apt.profiles?.full_name || "Aprendiz"}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#6b7280", display: "flex", gap: "1.25rem" }}>
                {apt.profiles?.document_number && <span>Doc: {apt.profiles.document_number}</span>}
                {apt.profiles?.program && <span style={{ color: "#9ca3af" }}>{apt.profiles.program}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.75rem", background: "#f0fce4", border: "1px solid #bbf7d0", borderRadius: "99px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#39a900" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>En atención</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                {timeLabel(apt.scheduled_time)} · {apt.scheduled_date ? format(parseISO(apt.scheduled_date), "d MMM yyyy", { locale: es }) : ""}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Notas de la atención
              </div>
              <span style={{ fontSize: "0.6875rem", color: "#d1d5db" }}>{notes.length}/2000</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Escribe tus observaciones clínicas, interpretaciones y plan de acción..."
              rows={8}
              style={{ width: "100%", padding: "0.875rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "0.9375rem", fontFamily: "var(--font-sans)", color: "#111827", resize: "vertical", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s", lineHeight: 1.65, background: "#fafafa" }}
              onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.background = "white"; }}
              onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; }}
            />

            {/* Tags */}
            <div style={{ marginTop: "0.875rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                Etiquetas temáticas
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {TAGS.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    style={{
                      padding: "0.3rem 0.875rem", borderRadius: "100px", fontSize: "0.8125rem", fontWeight: selectedTags.includes(t) ? 600 : 400, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s",
                      background: selectedTags.includes(t) ? "#f0fce4" : "white",
                      color: selectedTags.includes(t) ? "#166534" : "#6b7280",
                      border: selectedTags.includes(t) ? "1.5px solid #86efac" : "1.5px solid #e5e7eb",
                    }}
                  >
                    {selectedTags.includes(t) ? <Check size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} /> : null}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Objetivos */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
              <div style={{ width: 30, height: 30, borderRadius: "8px", background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={15} color="#39a900" />
              </div>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>Objetivos de la sesión</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#9ca3af" }}>
                {checkedObjs.length} de {OBJECTIVES.length} completados
              </span>
            </div>

            {/* Barra de progreso */}
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: "99px", overflow: "hidden", marginBottom: "1rem" }}>
              <div style={{ height: "100%", width: `${(checkedObjs.length / OBJECTIVES.length) * 100}%`, background: "#39a900", borderRadius: "99px", transition: "width 0.3s" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {OBJECTIVES.map(o => (
                <label key={o} style={{ display: "flex", alignItems: "center", gap: "0.875rem", cursor: "pointer", padding: "0.75rem 1rem", borderRadius: "10px", background: checkedObjs.includes(o) ? "#f0fce4" : "#fafafa", border: checkedObjs.includes(o) ? "1px solid #bbf7d0" : "1px solid transparent", transition: "all 0.15s" }}>
                  <div onClick={() => toggleObj(o)} style={{ color: checkedObjs.includes(o) ? "#39a900" : "#d1d5db", cursor: "pointer", flexShrink: 0 }}>
                    {checkedObjs.includes(o) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <span style={{ fontSize: "0.9375rem", color: checkedObjs.includes(o) ? "#166534" : "#374151", fontWeight: checkedObjs.includes(o) ? 500 : 400 }}>{o}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Columna lateral ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Motivo */}
          {apt.reason && (
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.375rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                Motivo de consulta
              </div>
              <p style={{ fontSize: "0.9375rem", color: "#374151", lineHeight: 1.65, borderLeft: "3px solid #39a900", paddingLeft: "0.875rem", margin: 0 }}>
                {apt.reason}
              </p>
            </div>
          )}

          {/* Duración */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.375rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Tiempo de sesión
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.04em", lineHeight: 1 }}>60</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#9ca3af" }}>min</div>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#9ca3af", marginTop: "0.375rem" }}>
              Inicio: {timeLabel(apt.scheduled_time)}
            </div>
            <div style={{ marginTop: "0.875rem", height: 4, background: "#f3f4f6", borderRadius: "99px" }}>
              <div style={{ height: "100%", width: `${Math.min((elapsed / 60) * 100, 100)}%`, background: elapsed > 50 ? "#f59e0b" : "#39a900", borderRadius: "99px", transition: "width 0.5s" }} />
            </div>
          </div>

          {/* Observaciones */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.375rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <div style={{ width: 30, height: 30, borderRadius: "8px", background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Paperclip size={15} color="#39a900" />
              </div>
              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>Observaciones</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {OBSERVATIONS.map(o => (
                <button
                  key={o.key}
                  onClick={() => toggleObs(o.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0.875rem", borderRadius: "10px", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: selectedObs.includes(o.key) ? 600 : 400, transition: "all 0.15s", textAlign: "left",
                    background: selectedObs.includes(o.key) ? "#f0fce4" : "#fafafa",
                    border: selectedObs.includes(o.key) ? "1.5px solid #86efac" : "1.5px solid #e5e7eb",
                    color: selectedObs.includes(o.key) ? "#166534" : "#374151",
                  }}
                >
                  {selectedObs.includes(o.key)
                    ? <CheckSquare size={16} color="#39a900" />
                    : <Square size={16} color="#d1d5db" />}
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nota informativa */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "1rem 1.125rem", display: "flex", gap: "0.75rem" }}>
            <Info size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: "0.8125rem", color: "#1d4ed8", lineHeight: 1.6, margin: 0 }}>
              Las notas se guardan al finalizar la atención y son visibles solo para el profesional asignado.
            </p>
          </div>

          {/* Botones */}
          <button
            onClick={finish} disabled={saving}
            style={{ padding: "0.9375rem", background: "#39a900", color: "white", border: "none", borderRadius: "10px", fontSize: "0.9375rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 2px 8px rgba(57,169,0,0.25)" }}
          >
            <Check size={18} /> {saving ? "Guardando..." : "Finalizar atención"}
          </button>
          <button
            onClick={markNoShow}
            style={{ padding: "0.75rem", background: "white", color: "#ef4444", border: "1.5px solid #fecaca", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            No asistió a la cita
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(57,169,0,0.2)} 50%{box-shadow:0 0 0 6px rgba(57,169,0,0.08)} }
        .attention-layout { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; padding: 1.75rem 2rem; max-width: 1200px; margin: 0 auto; }
        @media (max-width: 768px) { .attention-layout { grid-template-columns: 1fr; padding: 1rem; } }
      `}</style>
    </div>
  );
}
