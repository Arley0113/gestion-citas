import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, FileText, Hash, BookOpen, ArrowRight, Shield, ChevronLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { SenaLogo } from "../../../shared/components/SenaLogo";

const DOC_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PA", label: "Pasaporte" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    email: "", password: "", confirm_password: "",
    first_name: "", last_name: "",
    document_type: "CC", document_number: "",
    ficha_number: "", program: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validateStep1 = () => {
    if (!form.email || !form.password || !form.confirm_password) return "Completa todos los campos";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Correo inválido";
    if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
    if (form.password !== form.confirm_password) return "Las contraseñas no coinciden";
    return null;
  };

  const validateStep2 = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return "Ingresa tu nombre y apellido";
    if (!form.document_number.trim()) return "Ingresa tu número de documento";
    return null;
  };

  const handleNext = () => {
    const err = step === 1 ? validateStep1() : null;
    if (err) { toast.error(err); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { toast.error(err); return; }

    setLoading(true);
    const full_name = `${form.first_name.trim()} ${form.last_name.trim()}`;
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options: {
          data: {
            full_name,
            document_type:   form.document_type,
            document_number: form.document_number.trim(),
            ficha_number:    form.ficha_number.trim()  || null,
            program:         form.program.trim()        || null,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este correo ya tiene una cuenta. Inicia sesión.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const newUser = data?.user;
      if (newUser) {
        await supabase.from("profiles").upsert({
          id: newUser.id,
          full_name,
          document_type:   form.document_type,
          document_number: form.document_number.trim(),
          ficha_number:    form.ficha_number.trim()  || null,
          program:         form.program.trim()        || null,
          onboarding_completed: true,
        }, { onConflict: "id" });
      }

      toast.success("¡Cuenta creada! Revisa tu correo para verificarla.");
      navigate("/login");
    } catch {
      toast.error("Error al crear la cuenta. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .reg-root {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #f0f7e6;
          background-image: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(57,169,0,0.18) 0%, transparent 60%);
          padding: 2rem 1rem;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .reg-root::before {
          content: ''; position: fixed; inset: 0;
          background-image: linear-gradient(rgba(57,169,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(57,169,0,0.04) 1px, transparent 1px);
          background-size: 48px 48px; pointer-events: none;
        }
        .reg-card {
          position: relative; z-index: 1; width: 100%; max-width: 480px;
          background: white; border-radius: 24px;
          box-shadow: 0 0 0 1px rgba(57,169,0,0.12), 0 12px 40px rgba(0,0,0,0.09);
          padding: 2.25rem 2.5rem 2rem;
          animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .reg-input {
          width: 100%; padding: 0.7rem 0.875rem 0.7rem 2.5rem;
          border: 1.5px solid #d0d7de; border-radius: 10px;
          font-size: 0.9375rem; font-family: 'DM Sans', system-ui, sans-serif;
          color: #0d1117; background: #fff; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
        }
        .reg-input:focus { border-color: #39a900; box-shadow: 0 0 0 3px rgba(57,169,0,0.15); }
        .reg-select {
          width: 100%; padding: 0.7rem 0.875rem;
          border: 1.5px solid #d0d7de; border-radius: 10px;
          font-size: 0.9375rem; font-family: 'DM Sans', system-ui, sans-serif;
          color: #0d1117; background: white; outline: none; cursor: pointer;
          transition: border-color 0.15s; box-sizing: border-box;
        }
        .reg-select:focus { border-color: #39a900; }
        .reg-btn {
          width: 100%; padding: 0.8125rem; background: #39a900; color: white;
          border: none; border-radius: 10px; font-size: 0.9375rem;
          font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700;
          cursor: pointer; transition: background 0.15s, transform 0.12s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .reg-btn:hover:not(:disabled) { background: #2d8600; transform: translateY(-1px); }
        .reg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .step-bar {
          display: flex; gap: 0.375rem; margin-bottom: 1.75rem;
        }
        .step-seg {
          flex: 1; height: 4px; border-radius: 2px; transition: background 0.3s;
        }
        @media (max-width: 520px) { .reg-card { padding: 1.75rem 1.5rem; } }
      `}</style>

      <div className="reg-root">
        <div className="reg-card">

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(57,169,0,0.35)" }}>
              <SenaLogo size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora',system-ui", fontWeight: 700, fontSize: "0.9375rem", color: "#0d1117" }}>Bienestar SENA</div>
              <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>Registro de aprendiz</div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="step-bar">
            <div className="step-seg" style={{ background: "#39a900" }} />
            <div className="step-seg" style={{ background: step >= 2 ? "#39a900" : "#e5e7eb" }} />
          </div>

          <h2 style={{ fontFamily: "'Sora',system-ui", fontWeight: 800, fontSize: "1.5rem", color: "#0d1117", letterSpacing: "-0.03em", margin: "0 0 0.375rem" }}>
            {step === 1 ? "Crea tu cuenta" : "Tus datos SENA"}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6e7681", margin: "0 0 1.5rem" }}>
            {step === 1 ? "Paso 1 de 2 — Acceso a la plataforma" : "Paso 2 de 2 — Información académica"}
          </p>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}>

            {step === 1 ? (
              <>
                {/* Email */}
                <div style={{ marginBottom: "0.875rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Correo electrónico</label>
                  <div style={{ position: "relative" }}>
                    <Mail size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                    <input className="reg-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="tu@correo.com" autoComplete="email" required />
                  </div>
                </div>

                {/* Contraseña */}
                <div style={{ marginBottom: "0.875rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Contraseña</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                    <input className="reg-input" type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 8 caracteres" style={{ paddingRight: "2.75rem" }} required />
                    <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8b949e", display: "flex" }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Confirmar contraseña</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                    <input className="reg-input" type={showPwd ? "text" : "password"} value={form.confirm_password} onChange={e => set("confirm_password", e.target.value)} placeholder="Repite la contraseña" required />
                  </div>
                </div>

                <button type="submit" className="reg-btn">
                  Continuar <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                {/* Nombre + Apellido */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.875rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Nombre(s)</label>
                    <div style={{ position: "relative" }}>
                      <User size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                      <input className="reg-input" type="text" value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Juan Carlos" required />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Apellido(s)</label>
                    <div style={{ position: "relative" }}>
                      <User size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                      <input className="reg-input" type="text" value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Pérez González" required />
                    </div>
                  </div>
                </div>

                {/* Documento */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "0.75rem", marginBottom: "0.875rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Tipo</label>
                    <select className="reg-select" value={form.document_type} onChange={e => set("document_type", e.target.value)}>
                      {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Número de documento</label>
                    <div style={{ position: "relative" }}>
                      <FileText size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                      <input className="reg-input" type="text" value={form.document_number} onChange={e => set("document_number", e.target.value)} placeholder="1001234567" required />
                    </div>
                  </div>
                </div>

                {/* Ficha + Programa */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Ficha</label>
                    <div style={{ position: "relative" }}>
                      <Hash size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                      <input className="reg-input" type="text" value={form.ficha_number} onChange={e => set("ficha_number", e.target.value)} placeholder="2847193" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#24292f", marginBottom: "0.375rem" }}>Programa de formación</label>
                    <div style={{ position: "relative" }}>
                      <BookOpen size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#8b949e", pointerEvents: "none" }} />
                      <input className="reg-input" type="text" value={form.program} onChange={e => set("program", e.target.value)} placeholder="Desarrollo de Software" />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="button" onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.8125rem 1rem", background: "white", border: "1.5px solid #d0d7de", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, color: "#6e7681", cursor: "pointer", fontFamily: "'DM Sans',system-ui", flexShrink: 0 }}>
                    <ChevronLeft size={16} /> Atrás
                  </button>
                  <button type="submit" className="reg-btn" disabled={loading}>
                    {loading ? "Creando cuenta…" : "Crear cuenta"}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Nota seguridad */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", background: "#f6f8fa", border: "1px solid #eaecf0", borderRadius: 12, padding: "0.875rem 1rem", marginTop: "1.25rem" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#dafbe1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Shield size={13} color="#2da44e" />
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#6e7681", margin: 0, lineHeight: 1.5 }}>
              Tus datos son confidenciales y solo los usa el equipo de Bienestar SENA para tu atención.
            </p>
          </div>

          {/* Link a login */}
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#8b949e", marginTop: "1.125rem", marginBottom: 0 }}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" style={{ color: "#39a900", fontWeight: 600, textDecoration: "none" }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
