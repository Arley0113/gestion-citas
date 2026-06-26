import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, ChevronDown } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { SenaLogo } from "../../../shared/components/SenaLogo";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 21 21">
    <rect x="1"  y="1"  width="9" height="9" fill="#F35325"/>
    <rect x="11" y="1"  width="9" height="9" fill="#81BC06"/>
    <rect x="1"  y="11" width="9" height="9" fill="#05A6F0"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFBA08"/>
  </svg>
);

export default function Login() {
  const [showEmail, setShowEmail] = useState(false);
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(null);

  const handleOAuth = async (provider) => {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { toast.error("Error al iniciar sesión"); setLoading(null); }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Completa todos los campos"); return; }
    setLoading("email");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message.includes("Invalid") ? "Correo o contraseña incorrectos" : "Error al iniciar sesión");
      setLoading(null);
    }
  };

  return (
    <>
      {/* ─── Fuentes ─── */}
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

        /* Patrón de fondo sutil */
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
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #39a900;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(57,169,0,0.35);
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

        .btn-oauth {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          width: 100%;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          position: relative;
        }

        .btn-google {
          background: #39a900;
          color: white;
          border: none;
          box-shadow: 0 1px 3px rgba(57,169,0,0.3), 0 4px 12px rgba(57,169,0,0.2);
        }

        .btn-google:hover:not(:disabled) {
          background: #2d8600;
          box-shadow: 0 2px 6px rgba(57,169,0,0.35), 0 8px 20px rgba(57,169,0,0.25);
          transform: translateY(-1px);
        }

        .btn-microsoft {
          background: #ffffff;
          color: #24292f;
          border: 1.5px solid #d0d7de;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .btn-microsoft:hover:not(:disabled) {
          border-color: #b0b7be;
          background: #f6f8fa;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .btn-oauth:active { transform: translateY(0); }
        .btn-oauth:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .btn-oauth-label { flex: 1; }

        .divider {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          margin: 1.25rem 0;
          color: #8b949e;
          font-size: 0.8125rem;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #eaecf0;
        }

        .email-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          width: 100%;
          padding: 0.625rem;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: #8b949e;
          transition: color 0.12s;
          margin-bottom: 0.25rem;
        }
        .email-toggle:hover { color: #39a900; }

        .email-form {
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease;
        }
        .email-form.open  { max-height: 320px; opacity: 1; }
        .email-form.closed { max-height: 0; opacity: 0; }

        .input-group {
          margin-bottom: 0.875rem;
        }
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
          padding: 0.8125rem;
          background: #0d1117;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.12s;
          margin-top: 0.25rem;
        }
        .btn-submit:hover { background: #161b22; transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

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

          {/* ─── Brand ─── */}
          <div className="login-brand">
            <div className="login-brand-logo">
              <SenaLogo size={26} />
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

          {/* ─── Título ─── */}
          <div style={{ textAlign: "center", margin: "0.25rem 0 2rem" }}>
            <h1 className="login-title">
              ¡Bienvenido a<br />
              <span style={{ color: "#39a900" }}>Bienestar SENA</span>!
            </h1>
            <p className="login-subtitle" style={{ marginBottom: 0 }}>
              Agenda tus citas de bienestar de forma fácil y rápida.
            </p>
          </div>

          {/* ─── Google ─── */}
          <button
            className="btn-oauth btn-google"
            onClick={() => handleOAuth("google")}
            disabled={loading !== null}
          >
            <GoogleIcon />
            <span className="btn-oauth-label">
              {loading === "google" ? "Conectando…" : "Continuar con Google"}
            </span>
            <ArrowRight size={16} style={{ opacity: 0.7 }} />
          </button>

          <div className="divider">o</div>

          {/* ─── Microsoft ─── */}
          <button
            className="btn-oauth btn-microsoft"
            onClick={() => handleOAuth("azure")}
            disabled={loading !== null}
          >
            <MicrosoftIcon />
            <span className="btn-oauth-label">
              {loading === "azure" ? "Conectando…" : "Continuar con Microsoft"}
            </span>
            <ArrowRight size={16} style={{ opacity: 0.4 }} />
          </button>

          {/* ─── Email collapsible ─── */}
          <button className="email-toggle" onClick={() => setShowEmail(v => !v)}>
            <Mail size={14} />
            Ingresar con correo electrónico
            <ChevronDown
              size={14}
              style={{ transition: "transform 0.25s", transform: showEmail ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          <div className={`email-form ${showEmail ? "open" : "closed"}`}>
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
                  />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Contraseña</label>
                  <button type="button" style={{ fontSize: "0.8125rem", color: "#39a900", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', system-ui", fontWeight: 500 }}>
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

              <button
                type="submit"
                className="btn-submit"
                disabled={loading === "email"}
              >
                {loading === "email" ? "Iniciando sesión…" : "Iniciar sesión"}
              </button>
            </form>
          </div>

          {/* ─── Seguridad ─── */}
          <div className="security-note">
            <div className="security-icon">
              <Shield size={15} color="#2da44e" />
            </div>
            <div className="security-text">
              <strong>Seguro y confiable</strong>
              <p>Tu información está protegida y solo se utiliza para mejorar tu experiencia en Bienestar SENA.</p>
            </div>
          </div>

          {/* ─── Registro aprendiz ─── */}
          <div style={{ textAlign: "center", marginTop: "1.125rem", fontSize: "0.875rem", color: "#6e7681" }}>
            ¿Eres aprendiz?{" "}
            <Link to="/register" style={{ color: "#39a900", fontWeight: 600, textDecoration: "none" }}>
              Regístrate aquí
            </Link>
          </div>

          {/* ─── Links ─── */}
          <div className="login-footer-links">
            <a href="#">Términos de uso</a>
            <a href="#">Política de privacidad</a>
          </div>
        </div>

        <div className="login-bottom">
          Sistema diseñado para el bienestar de la comunidad SENA.
        </div>
      </div>
    </>
  );
}
