import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { SenaLogo } from "../../../shared/components/SenaLogo";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [validToken, setValidToken] = useState(null); // null=checking, true=ok, false=invalid

  useEffect(() => {
    // Supabase redirige con hash: #access_token=...&type=recovery
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    setValidToken(type === "recovery" && !!accessToken);
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirm) { toast.error("Las contraseñas no coinciden"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error("No se pudo actualizar la contraseña"); return; }
    toast.success("Contraseña actualizada correctamente");
    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        .rp-root {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #f0f7e6;
          background-image: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(57,169,0,0.18) 0%, transparent 60%);
          padding: 2rem 1rem; font-family: 'DM Sans', system-ui, sans-serif;
        }
        .rp-card {
          width: 100%; max-width: 440px; background: #fff; border-radius: 24px;
          box-shadow: 0 0 0 1px rgba(57,169,0,0.12), 0 12px 40px rgba(0,0,0,0.09);
          padding: 2.5rem; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .rp-input {
          width: 100%; padding: 0.75rem 0.875rem 0.75rem 2.5rem;
          border: 1.5px solid #d0d7de; border-radius: 10px;
          font-size: 0.9375rem; font-family: 'DM Sans', system-ui, sans-serif;
          color: #0d1117; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .rp-input:focus { border-color: #39a900; box-shadow: 0 0 0 3px rgba(57,169,0,0.15); }
        .rp-btn {
          width: 100%; padding: 0.875rem; background: #39a900; color: white; border: none;
          border-radius: 10px; font-size: 0.9375rem; font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 700; cursor: pointer; transition: background 0.15s;
          box-shadow: 0 2px 8px rgba(57,169,0,0.3); margin-top: 0.5rem;
        }
        .rp-btn:hover:not(:disabled) { background: #2d8600; }
        .rp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .rp-icon-wrap { position: relative; }
        .rp-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: #8b949e; pointer-events: none; }
        .rp-eye { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8b949e; display: flex; padding: 0; }
        .rp-label { display: block; font-size: 0.8125rem; font-weight: 600; color: #24292f; margin-bottom: 0.375rem; }
        .rp-group { margin-bottom: 0.875rem; }
      `}</style>

      <div className="rp-root">
        <div className="rp-card">

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(57,169,0,0.35)" }}>
              <SenaLogo size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora', system-ui", fontWeight: 700, fontSize: "0.9375rem", color: "#0d1117" }}>Bienestar SENA</div>
              <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>Sistema de citas institucional</div>
            </div>
          </div>

          {validToken === null && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {validToken === false && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <AlertCircle size={26} color="#ef4444" />
              </div>
              <div style={{ fontFamily: "'Sora', system-ui", fontWeight: 700, fontSize: "1.125rem", color: "#0d1117", marginBottom: "0.5rem" }}>Enlace inválido o expirado</div>
              <p style={{ fontSize: "0.875rem", color: "#6e7681", marginBottom: "1.5rem" }}>
                Este enlace ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="rp-btn"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}

          {validToken === true && (
            <>
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <CheckCircle2 size={24} color="#39a900" />
                </div>
                <h1 style={{ fontFamily: "'Sora', system-ui", fontWeight: 800, fontSize: "1.5rem", color: "#0d1117", textAlign: "center", letterSpacing: "-0.03em", margin: "0 0 0.375rem" }}>
                  Nueva contraseña
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#6e7681", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
                  Elige una contraseña segura para tu cuenta.
                </p>
              </div>

              <form onSubmit={handleReset}>
                <div className="rp-group">
                  <label className="rp-label">Nueva contraseña</label>
                  <div className="rp-icon-wrap">
                    <Lock size={15} className="rp-icon" />
                    <input
                      className="rp-input"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ paddingRight: "2.75rem" }}
                      autoFocus
                    />
                    <button type="button" className="rp-eye" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="rp-group">
                  <label className="rp-label">Confirmar contraseña</label>
                  <div className="rp-icon-wrap">
                    <Lock size={15} className="rp-icon" />
                    <input
                      className="rp-input"
                      type={showConf ? "text" : "password"}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      style={{ paddingRight: "2.75rem" }}
                    />
                    <button type="button" className="rp-eye" onClick={() => setShowConf(v => !v)}>
                      {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="rp-btn" disabled={loading}>
                  {loading ? "Guardando…" : "Guardar contraseña"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
