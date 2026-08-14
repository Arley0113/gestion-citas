import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { toast } from "sonner";
import { SenaLogo } from "../../../shared/components/SenaLogo";

const DOC_TYPES = [
  { value: "CC", label: "CC — Cédula de Ciudadanía" },
  { value: "TI", label: "TI — Tarjeta de Identidad" },
  { value: "CE", label: "CE — Cédula de Extranjería" },
  { value: "PA", label: "PA — Pasaporte" },
];

const ROLE_HOME = {
  PSICOLOGIA:     "/professional",
  ENFERMERIA:     "/professional",
  TRABAJO_SOCIAL: "/professional",
  COORDINACION:   "/coordination",
  ADMINISTRADOR:  "/admin",
  SUPERADMIN:     "/admin",
};

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const roleName  = profile?.roles?.name || "";
  const roleLabel = profile?.roles?.label || roleName;
  const depName   = profile?.dependencies?.name || "";

  const [form, setForm] = useState({
    full_name:       profile?.full_name       || "",
    document_type:   profile?.document_type   || "CC",
    document_number: profile?.document_number || "",
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (profile?.onboarding_completed && roleName) {
      navigate(ROLE_HOME[roleName] || "/dashboard", { replace: true });
    }
  }, [profile, roleName, navigate]);

  // Show spinner while profile/role hasn't loaded yet
  if (!profile || !roleName) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f7e6", fontFamily: "var(--font-sans)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 0.875rem" }} />
          <p style={{ fontSize: "0.8125rem", color: "#6b7280" }}>Cargando tu información...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim())       { toast.error("Ingresa tu nombre completo"); return; }
    if (!form.document_number.trim()) { toast.error("Ingresa tu número de documento"); return; }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name:            form.full_name.trim(),
          document_type:        form.document_type,
          document_number:      form.document_number.trim(),
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      setDone(true);
      toast.success("¡Perfil completado! Bienvenido/a al sistema.");
      setTimeout(() => {
        navigate(ROLE_HOME[roleName] || "/dashboard");
      }, 1500);
    } catch {
      toast.error("No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f7e6", fontFamily: "var(--font-sans)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <CheckCircle2 size={32} color="#39a900" />
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "#111827" }}>¡Todo listo!</div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>Redirigiendo a tu panel…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .cp-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: #f0f7e6;
          background-image: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(57,169,0,0.18) 0%, transparent 60%);
          padding: 2rem 1rem; font-family: 'DM Sans', system-ui, sans-serif;
        }
        .cp-card {
          width: 100%; max-width: 480px; background: white; border-radius: 24px;
          box-shadow: 0 0 0 1px rgba(57,169,0,0.12), 0 12px 40px rgba(0,0,0,0.09);
          padding: 2.25rem 2.5rem 2rem;
          animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .cp-input {
          width: 100%; padding: 0.7rem 0.875rem 0.7rem 2.5rem;
          border: 1.5px solid #d0d7de; border-radius: 10px;
          font-size: 0.9375rem; font-family: 'DM Sans', system-ui, sans-serif;
          color: #0d1117; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
        }
        .cp-input:focus { border-color: #39a900; box-shadow: 0 0 0 3px rgba(57,169,0,0.15); }
        .cp-select {
          width: 100%; padding: 0.7rem 0.875rem; border: 1.5px solid #d0d7de;
          border-radius: 10px; font-size: 0.9375rem; font-family: 'DM Sans', system-ui, sans-serif;
          color: #0d1117; background: white; outline: none; cursor: pointer;
          transition: border-color 0.15s; box-sizing: border-box;
        }
        .cp-select:focus { border-color: #39a900; }
        .cp-btn {
          width: 100%; padding: 0.8125rem; background: #39a900; color: white;
          border: none; border-radius: 10px; font-size: 0.9375rem;
          font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .cp-btn:hover:not(:disabled) { background: #2d8600; }
        .cp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cp-2col-grid > * { min-width: 0; }
        @media (max-width: 380px) {
          .cp-2col-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="cp-root">
        <div className="cp-card">

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SenaLogo size={30} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora',system-ui", fontWeight: 700, fontSize: "0.9375rem", color: "#0d1117" }}>Bienestar SENA</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Completar perfil</div>
            </div>
          </div>

          {/* Rol asignado */}
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "0.875rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <CheckCircle2 size={18} color="#39a900" />
            <div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#166534" }}>
                Invitación aceptada — {roleLabel}
              </div>
              {depName && (
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.125rem" }}>
                  Dependencia: {depName}
                </div>
              )}
            </div>
          </div>

          <h2 style={{ fontFamily: "'Sora',system-ui", fontWeight: 800, fontSize: "1.375rem", color: "#0d1117", letterSpacing: "-0.03em", margin: "0 0 0.375rem" }}>
            Completa tu perfil
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6e7681", margin: "0 0 1.5rem" }}>
            Necesitamos algunos datos para finalizar tu registro en el sistema.
          </p>

          <form onSubmit={handleSave}>
            {/* Nombre completo */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>
                Nombre completo
              </label>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
                <input className="cp-input" type="text" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Ej. Carolina Ruiz Vargas" required />
              </div>
            </div>

            {/* Documento */}
            <div className="cp-2col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>
                  Tipo de doc.
                </label>
                <select className="cp-select" value={form.document_type} onChange={e => set("document_type", e.target.value)}>
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>
                  Número
                </label>
                <div style={{ position: "relative" }}>
                  <FileText size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
                  <input className="cp-input" type="text" value={form.document_number} onChange={e => set("document_number", e.target.value)} placeholder="Ej. 52987654" required />
                </div>
              </div>
            </div>

            <button type="submit" className="cp-btn" disabled={saving}>
              {saving ? "Guardando…" : <><span>Ingresar al sistema</span> <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
