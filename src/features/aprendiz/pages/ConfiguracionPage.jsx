import { useState, useEffect } from "react";
import { Bell, Shield, Lock, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { DEV_ROLE } from "../../../lib/devMode";

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: value ? "#39a900" : "#d1d5db",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s",
        padding: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "white",
        position: "absolute", top: 3,
        left: value ? 23 : 3,
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function ToggleRow({ label, description, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 0", borderBottom: "1px solid #f9fafb" }}>
      <div style={{ flex: 1, marginRight: "1rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#111827" }}>{label}</div>
        {description && <div style={{ fontSize: "0.8125rem", color: "#9ca3af", marginTop: "0.125rem" }}>{description}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SectionCard({ icon: Icon, iconColor, iconBg, title, children }) {
  return (
    <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={iconColor} />
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

const DEFAULT_NOTIFS = { reminder24h: true, confirmacion: true, cancelacion: true, novedades: false };
const DEFAULT_PRIVACY = { historialProfesional: true, correosSeguimiento: true };

async function upsertSettings(userId, notifs, privacy) {
  return supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, settings: { notifs, privacy } },
      { onConflict: "user_id" }
    );
}

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    if (!user || DEV_ROLE) return;
    supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          setNotifs(s => ({ ...s, ...data.settings.notifs }));
          setPrivacy(s => ({ ...s, ...data.settings.privacy }));
        }
      });
  }, [user]);

  const setNotif = (key) => (val) => {
    const next = { ...notifs, [key]: val };
    setNotifs(next);
    if (user && !DEV_ROLE) upsertSettings(user.id, next, privacy);
    toast.success("Preferencia guardada");
  };

  const setPriv = (key) => (val) => {
    const next = { ...privacy, [key]: val };
    setPrivacy(next);
    if (user && !DEV_ROLE) upsertSettings(user.id, notifs, next);
    toast.success("Preferencia guardada");
  };

  const handleSave = async () => {
    if (user) {
      const { error } = await upsertSettings(user.id, notifs, privacy);
      if (error) { toast.error("Error al guardar"); return; }
    }
    toast.success("Configuración guardada correctamente");
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Configuración
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
            Ajustes
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Personaliza tu experiencia en Bienestar SENA
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 2rem" }}>

        {/* Notificaciones */}
        <SectionCard icon={Bell} iconColor="#39a900" iconBg="#f0fce4" title="Notificaciones">
          <ToggleRow
            label="Recordatorio 24h antes"
            description="Recibe un aviso el día anterior a tu cita"
            value={notifs.reminder24h}
            onChange={setNotif("reminder24h")}
          />
          <ToggleRow
            label="Confirmación de cita"
            description="Notificación cuando el profesional confirme tu cita"
            value={notifs.confirmacion}
            onChange={setNotif("confirmacion")}
          />
          <ToggleRow
            label="Cancelación de cita"
            description="Aviso cuando una cita sea cancelada"
            value={notifs.cancelacion}
            onChange={setNotif("cancelacion")}
          />
          <ToggleRow
            label="Novedades del sistema"
            description="Actualizaciones y mejoras de Bienestar SENA"
            value={notifs.novedades}
            onChange={setNotif("novedades")}
          />
        </SectionCard>

        {/* Privacidad */}
        <SectionCard icon={Shield} iconColor="#3b82f6" iconBg="#eff6ff" title="Privacidad">
          <ToggleRow
            label="Historial visible para profesionales"
            description="Permite que el equipo de bienestar vea tu historial completo"
            value={privacy.historialProfesional}
            onChange={setPriv("historialProfesional")}
          />
          <ToggleRow
            label="Correos de seguimiento"
            description="Recibir comunicaciones del equipo de bienestar por correo"
            value={privacy.correosSeguimiento}
            onChange={setPriv("correosSeguimiento")}
          />
        </SectionCard>

        {/* Cuenta */}
        <SectionCard icon={Lock} iconColor="#6b7280" iconBg="#f9fafb" title="Cuenta">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <button
              onClick={async () => {
                if (!user?.email) return;
                const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                  redirectTo: "https://gestion-citas-nu.vercel.app/reset-password",
                });
                if (error) toast.error("No se pudo enviar el correo");
                else toast.success("Revisa tu correo para cambiar la contraseña");
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem 1rem", background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "var(--font-sans)", width: "fit-content" }}
            >
              <Lock size={15} /> Cambiar contraseña
            </button>
            <button
              onClick={() => toast.info("Para eliminar tu cuenta, contacta al administrador del sistema")}
              style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem 1rem", background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: "var(--font-sans)", width: "fit-content" }}
            >
              <Trash2 size={15} /> Eliminar cuenta
            </button>
          </div>
        </SectionCard>

        <button
          onClick={handleSave}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.8125rem 1.75rem", background: "#39a900", color: "white", border: "none", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          <Save size={15} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}
