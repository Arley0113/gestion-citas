import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight, ChevronLeft, Check, BookOpen, Award } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { toast } from "sonner";
import { SenaLogo } from "../../../shared/components/SenaLogo";
import { normalizeDocNumber } from "../../../lib/normalizeDoc";

const PROGRAMS_FALLBACK = [
  "Tecnología en Análisis y Desarrollo de Software",
  "Gestión Empresarial",
  "Contabilidad y Finanzas",
  "Salud Ocupacional",
  "Electrónica",
  "Mecánica Industrial",
  "Cocina",
  "Otro",
];

const DOC_TYPES = ["Cédula de ciudadanía", "Tarjeta de identidad", "Pasaporte", "Cédula de extranjería"];

const STEPS = [
  { n: 1, label: "Datos personales", sub: "Nombre completo" },
  { n: 2, label: "Información académica", sub: "Documento y programa" },
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState(PROGRAMS_FALLBACK);
  const [programSearch, setProgramSearch] = useState("");

  useEffect(() => {
    supabase.from("programs").select("name").eq("active", true).order("name")
      .then(({ data }) => { if (data?.length) setPrograms(data.map(p => p.name)); });
  }, []);

  const [form, setForm] = useState({
    first_name: user?.user_metadata?.full_name?.split(" ")[0] || "",
    last_name:  user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
    doc_type:   "",
    doc_number: "",
    ficha:      "",
    program:    "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.doc_type || !form.doc_number || !form.ficha || !form.program) {
      toast.error("Completa todos los campos");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        document_type: form.doc_type,
        document_number: normalizeDocNumber(form.doc_number),
        ficha_number: form.ficha.trim(),
        program: form.program,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Error guardando datos. Intenta de nuevo.");
      setSaving(false);
      return;
    }
    await refreshProfile();
    navigate("/");
  };

  const step1Valid = form.first_name.trim() && form.last_name.trim();
  const step2Valid = form.doc_type && form.doc_number && form.ficha && form.program;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <style>{`
        @media (max-width: 768px) { .onb-sidebar { display: none !important; } }
        @media (max-width: 480px) {
          .onb-topbar, .onb-footer { padding-left: 1.25rem !important; padding-right: 1.25rem !important; flex-wrap: wrap; gap: 0.5rem; }
          .onb-formwrap { padding: 1.5rem 1rem !important; }
          .onb-card { padding: 1.5rem !important; }
        }
      `}</style>

      {/* ─── Panel izquierdo institucional (oculto en móvil) ─── */}
      <div className="onb-sidebar" style={{
        width: 360, flexShrink: 0, position: "relative", overflow: "hidden",
        background: "linear-gradient(170deg, #0d4500 0%, #1a6b00 45%, #39a900 100%)",
        display: "flex", flexDirection: "column",
      }}>

        {/* Patrón de fondo */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.07,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.6) 40px, rgba(255,255,255,0.6) 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.6) 40px, rgba(255,255,255,0.6) 41px)`,
        }} />

        {/* Círculos decorativos */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: "2.5rem 2.25rem" }}>

          {/* Logo y nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "2.75rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SenaLogo size={26} />
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "white", letterSpacing: "-0.01em", fontFamily: "var(--font-display)" }}>
                SENA
              </div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Servicio Nacional de Aprendizaje
              </div>
            </div>
          </div>

          {/* Sello / escudo institucional */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "2.5rem" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
              <Award size={28} color="white" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
              Bienestar<br />Institucional
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>
              Sistema de gestión de citas para la comunidad SENA. Accede a servicios de Psicología, Enfermería y Trabajo Social.
            </p>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
              Proceso de registro
            </div>
            {STEPS.map((s, i) => {
              const done    = s.n < step;
              const current = s.n === step;
              return (
                <div key={s.n} style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: done ? "white" : current ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                      border: `2px solid ${done ? "white" : current ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}`,
                      color: done ? "#39a900" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 700,
                    }}>
                      {done ? <Check size={13} strokeWidth={3} /> : s.n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 1.5, height: 44, background: done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)", margin: "3px 0" }} />
                    )}
                  </div>
                  <div style={{ paddingTop: "0.25rem", paddingBottom: i < STEPS.length - 1 ? "2.75rem" : 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: current ? 700 : 500, color: current ? "white" : done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: current ? "rgba(255,255,255,0.6)" : "transparent", marginTop: "0.125rem" }}>
                      {s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer institucional */}
          <div style={{ marginTop: "auto", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
              <Shield size={13} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                Información protegida y confidencial
              </span>
            </div>
            <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
              República de Colombia · Ministerio de Trabajo<br />
              SENA · Centro de Formación
            </div>
          </div>
        </div>
      </div>

      {/* ─── Panel derecho (formulario) ─── */}
      <div style={{ flex: 1, background: "#f7f8fc", display: "flex", flexDirection: "column" }}>

        {/* Barra superior */}
        <div className="onb-topbar" style={{ background: "white", borderBottom: "1px solid #eaecf0", padding: "1rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BookOpen size={14} color="#39a900" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#6b7280" }}>
              Configuración inicial de cuenta
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ width: s.n <= step ? 28 : 8, height: 6, borderRadius: 3, background: s.n < step ? "#39a900" : s.n === step ? "#39a900" : "#e5e7eb", transition: "all 0.3s ease", opacity: s.n < step ? 0.5 : 1 }} />
            ))}
          </div>
        </div>

        {/* Contenido del formulario */}
        <div className="onb-formwrap" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 2.5rem" }}>
          <div className="onb-card" style={{ width: "100%", maxWidth: 460, background: "white", borderRadius: "16px", padding: "2.5rem", border: "1px solid #eaecf0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>

            {/* Paso indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.5rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#39a900", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                {step}
              </div>
              <div>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Paso {step} de {STEPS.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.0625rem" }}>
                  {STEPS[step - 1].label}
                </div>
              </div>
            </div>

            {step === 1 ? (
              <>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", marginBottom: "0.375rem", fontFamily: "var(--font-display)" }}>
                  Cuéntanos quién eres
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                  Ingresa tu nombre completo tal como aparece en tu documento de identidad.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                  {[
                    { key: "first_name", label: "Nombre(s)", placeholder: "Ej: Juan Carlos" },
                    { key: "last_name",  label: "Apellido(s)", placeholder: "Ej: Pérez González" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
                        {label}
                      </label>
                      <input
                        type="text" value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder={placeholder}
                        style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9375rem", color: "#111827", fontFamily: "var(--font-sans)", outline: "none", background: "#fff", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
                        onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.boxShadow = "0 0 0 3px rgba(57,169,0,0.12)"; }}
                        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", marginBottom: "0.375rem", fontFamily: "var(--font-display)" }}>
                  Información académica
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                  Datos requeridos para identificarte en el sistema SENA.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                  {[
                    { key: "doc_type", label: "Tipo de documento", type: "select", options: DOC_TYPES, placeholder: "Selecciona el tipo" },
                    { key: "doc_number", label: "Número de documento", type: "text", placeholder: "Ej: 1234567890" },
                    { key: "ficha", label: "Número de ficha", type: "text", placeholder: "Ej: 2672345" },
                    { key: "program", label: "Programa de formación", type: "select", options: programs, placeholder: "Selecciona tu programa" },
                  ].map(({ key, label, type, options, placeholder }) => (
                    <div key={key}>
                      <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
                        {label}
                      </label>
                      {type === "select" ? (
                        <select
                          value={form[key]} onChange={e => set(key, e.target.value)}
                          style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9375rem", color: form[key] ? "#111827" : "#9ca3af", fontFamily: "var(--font-sans)", outline: "none", background: "#fff", boxSizing: "border-box", appearance: "none", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                          onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.boxShadow = "0 0 0 3px rgba(57,169,0,0.12)"; }}
                          onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                        >
                          <option value="">{placeholder}</option>
                          {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text" value={form[key]}
                          onChange={e => set(key, e.target.value)}
                          placeholder={placeholder}
                          style={{ width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9375rem", color: "#111827", fontFamily: "var(--font-sans)", outline: "none", background: "#fff", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
                          onFocus={e => { e.target.style.borderColor = "#39a900"; e.target.style.boxShadow = "0 0 0 3px rgba(57,169,0,0.12)"; }}
                          onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Botones */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
              {step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.8125rem 1.125rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#9ca3af"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <ChevronLeft size={15} /> Atrás
                </button>
              )}
              <button
                onClick={step === 1 ? () => setStep(2) : handleSubmit}
                disabled={step === 1 ? !step1Valid : !step2Valid || saving}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  padding: "0.875rem", background: "#39a900", color: "white", border: "none",
                  borderRadius: "8px", fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-sans)", transition: "background 0.15s, transform 0.1s",
                  opacity: (step === 1 ? !step1Valid : !step2Valid || saving) ? 0.45 : 1,
                }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#2d8600"; }}
                onMouseLeave={e => e.currentTarget.style.background = "#39a900"}
              >
                {step === 1 ? (
                  <><span>Continuar</span><ChevronRight size={16} /></>
                ) : saving ? "Guardando..." : (
                  <><span>Completar registro</span><Check size={16} /></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="onb-footer" style={{ padding: "1rem 2.5rem", borderTop: "1px solid #eaecf0", background: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>
            © SENA · Servicio Nacional de Aprendizaje · República de Colombia
          </span>
          <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>
            v1.0 · Bienestar Institucional
          </span>
        </div>
      </div>
    </div>
  );
}
