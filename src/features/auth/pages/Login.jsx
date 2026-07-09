import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield, X } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { normalizeDocNumber } from "../../../lib/normalizeDoc";
import { toast } from "sonner";
import { SenaLogo } from "../../../shared/components/SenaLogo";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [forgotOpen,  setForgotOpen]  = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Ingresa tu correo"); return; }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) { toast.error("No se pudo enviar el correo"); return; }
    toast.success("Revisa tu correo para restablecer tu contraseña");
    setForgotOpen(false);
    setForgotEmail("");
  };

  const { signIn, user: authUser, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && authUser && profile && location.pathname === "/login") {
      navigate(`/${location.search || ""}`, { replace: true });
    }
  }, [authLoading, authUser, profile, location.pathname, location.search, navigate]);

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Completa todos los campos"); return; }
    setLoading(true);

    const { success, error } = await signIn(email.trim().toLowerCase(), password);
    if (!success) {
      setLoading(false);
      toast.error(error);
      return;
    }

    // Validar whitelist solo para aprendices — best-effort con timeout de 5s
    try {
      const withTimeout = (promise, ms = 5000) =>
        Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

      const { data: { session } } = await withTimeout(supabase.auth.getSession());
      if (session?.user) {
        const { data: wlSetting } = await withTimeout(
          supabase.from("system_settings").select("value").eq("key", "whitelist_enabled").single()
        );

        if (wlSetting?.value === "true") {
          const { data: wlProfile } = await withTimeout(
            supabase.from("profiles").select("document_number, ficha_number, roles(name)").eq("id", session.user.id).single()
          );

          if (wlProfile?.roles?.name === "APRENDIZ") {
            const { data: found } = await withTimeout(
              supabase.from("aprendiz_whitelist").select("id")
                .eq("document_number", normalizeDocNumber(wlProfile.document_number))
                .eq("ficha_number",    wlProfile.ficha_number    || "")
                .maybeSingle()
            );

            if (!found) {
              await Promise.race([supabase.auth.signOut(), new Promise(r => setTimeout(r, 2000))]);
              toast.error(
                "Tu cédula o número de ficha no aparecen en la base de datos activa del SENA. Contacta al equipo de Bienestar SENA.",
                { duration: 7000 }
              );
              setLoading(false);
              return;
            }
          }
        }
      }
    } catch {
      // Si la validación falla o hace timeout, dejamos entrar (best-effort)
    }

    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f0f7e6;
          background-image:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(57,169,0,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(57,169,0,0.10) 0%, transparent 60%);
          padding: 2rem 1rem;
          font-family: 'DM Sans', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(57,169,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(57,169,0,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(57,169,0,0.12),
            0 4px 6px rgba(0,0,0,0.04),
            0 12px 40px rgba(0,0,0,0.09),
            0 32px 64px rgba(0,0,0,0.06);
          padding: 2.5rem 2.5rem 2rem;
          animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .login-brand-logo {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-title {
          font-family: 'Sora', system-ui, sans-serif;
          font-size: 1.75rem;
          font-weight: 800;
          color: #0d1117;
          letter-spacing: -0.035em;
          line-height: 1.15;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .login-subtitle {
          font-size: 0.9375rem;
          color: #6e7681;
          line-height: 1.55;
          margin-bottom: 2rem;
          text-align: center;
        }

        .input-group { margin-bottom: 0.875rem; }

        .input-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #24292f;
          margin-bottom: 0.375rem;
        }

        .input-wrap { position: relative; }

        .input-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: #8b949e;
          pointer-events: none;
        }

        .text-input {
          width: 100%;
          padding: 0.75rem 0.875rem 0.75rem 2.5rem;
          border: 1.5px solid #d0d7de;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #0d1117;
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .text-input:focus {
          border-color: #39a900;
          box-shadow: 0 0 0 3px rgba(57,169,0,0.15);
        }

        .pwd-toggle {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #8b949e;
          display: flex;
          padding: 0;
        }

        .btn-submit {
          width: 100%;
          padding: 0.875rem;
          background: #39a900;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.12s;
          margin-top: 0.5rem;
          box-shadow: 0 2px 8px rgba(57,169,0,0.3);
        }

        .btn-submit:hover:not(:disabled) { background: #2d8600; transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .security-note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: #f6f8fa;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          padding: 0.875rem 1rem;
          margin-top: 1.5rem;
        }

        .security-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #dafbe1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .security-text strong {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #24292f;
          margin-bottom: 0.125rem;
        }

        .security-text p {
          font-size: 0.8125rem;
          color: #6e7681;
          line-height: 1.5;
          margin: 0;
        }

        .login-footer-links {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.25rem;
        }

        .login-footer-links a {
          font-size: 0.8125rem;
          color: #8b949e;
          text-decoration: none;
          transition: color 0.12s;
        }

        .login-footer-links a:hover { color: #39a900; }

        .login-bottom {
          position: relative;
          z-index: 1;
          margin-top: 1.5rem;
          font-size: 0.8125rem;
          color: #8b949e;
          text-align: center;
        }

        @media (max-width: 520px) {
          .login-card { padding: 2rem 1.5rem 1.75rem; border-radius: 20px; }
          .login-title { font-size: 1.5rem; }
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-logo">
              <SenaLogo size={34} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora', system-ui", fontWeight: 700, fontSize: "0.9375rem", color: "#0d1117", letterSpacing: "-0.01em" }}>
                Bienestar SENA
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8b949e", fontWeight: 400 }}>
                Sistema de citas institucional
              </div>
            </div>
          </div>

          {/* Título */}
          <div style={{ textAlign: "center", margin: "0.25rem 0 2rem" }}>
            <h1 className="login-title">
              ¡Bienvenido a<br />
              <span style={{ color: "#39a900" }}>Bienestar SENA</span>!
            </h1>
            <p className="login-subtitle" style={{ marginBottom: 0 }}>
              Agenda tus citas de bienestar de forma fácil y rápida.
            </p>
          </div>

          {/* Formulario email */}
          <form onSubmit={handleEmail}>
            <div className="input-group">
              <label className="input-label">Correo electrónico</label>
              <div className="input-wrap">
                <Mail size={15} className="input-icon" />
                <input
                  className="text-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@sena.edu.co"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Contraseña</label>
                <button
                  type="button"
                  onClick={() => { setForgotOpen(true); setForgotEmail(email); }}
                  style={{ fontSize: "0.8125rem", color: "#39a900", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', system-ui", fontWeight: 500 }}
                >
                  ¿Olvidaste?
                </button>
              </div>
              <div className="input-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  className="text-input"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: "2.75rem" }}
                />
                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>

          {/* Seguridad */}
          <div className="security-note">
            <div className="security-icon">
              <Shield size={15} color="#2da44e" />
            </div>
            <div className="security-text">
              <strong>Seguro y confiable</strong>
              <p>Tu información está protegida y solo se utiliza para mejorar tu experiencia en Bienestar SENA.</p>
            </div>
          </div>

          {/* Registro aprendiz */}
          <div style={{ textAlign: "center", marginTop: "1.125rem", fontSize: "0.875rem", color: "#6e7681" }}>
            ¿Eres aprendiz?{" "}
            <Link to="/register" style={{ color: "#39a900", fontWeight: 600, textDecoration: "none" }}>
              Regístrate aquí
            </Link>
          </div>


          {/* Modal olvidé contraseña */}
          {forgotOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
              <div style={{ background: "white", borderRadius: 20, padding: "2rem", width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", position: "relative", animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
                <button onClick={() => setForgotOpen(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#8b949e", display: "flex" }}>
                  <X size={18} />
                </button>
                <div style={{ fontFamily: "'Sora', system-ui", fontWeight: 800, fontSize: "1.25rem", color: "#0d1117", marginBottom: "0.375rem" }}>Restablecer contraseña</div>
                <p style={{ fontSize: "0.875rem", color: "#6e7681", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
                <form onSubmit={handleForgot}>
                  <div className="input-group">
                    <label className="input-label">Correo electrónico</label>
                    <div className="input-wrap">
                      <Mail size={15} className="input-icon" />
                      <input
                        className="text-input"
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="tu@sena.edu.co"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(false)}
                      style={{ flex: 1, padding: "0.75rem", background: "white", border: "1.5px solid #d0d7de", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', system-ui", color: "#374151" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="btn-submit"
                      style={{ flex: 2, marginTop: 0 }}
                    >
                      {forgotLoading ? "Enviando…" : "Enviar enlace"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="login-bottom">
          Sistema diseñado para el bienestar de la comunidad SENA.
        </div>
      </div>
    </>
  );
}
