import { useState } from "react";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { User, FileText, BookOpen, Hash, Mail, Save, Camera, Shield, CheckCircle2 } from "lucide-react";
import { ROLE_LABELS } from "../../../shared/rbac/permissions";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const DOC_TYPES = [
  { value: "CC",  label: "Cédula de Ciudadanía" },
  { value: "TI",  label: "Tarjeta de Identidad" },
  { value: "CE",  label: "Cédula de Extranjería" },
  { value: "PA",  label: "Pasaporte" },
];

export default function ProfilePage() {
  const { profile, user } = useAuth();

  const [form, setForm] = useState({
    full_name:       profile?.full_name       || "",
    document_type:   profile?.document_type   || "CC",
    document_number: profile?.document_number || "",
    ficha_number:    profile?.ficha_number    || "",
    program:         profile?.program         || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const email   = IS_DEV ? "juan.perez@sena.edu.co" : (user?.email || "—");
  const initial = form.full_name?.charAt(0)?.toUpperCase() || "?";

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (IS_DEV) { toast.success("Perfil actualizado (demo)"); setSaved(true); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name:       form.full_name.trim(),
          document_type:   form.document_type,
          document_number: form.document_number.trim() || null,
          ficha_number:    form.ficha_number.trim()    || null,
          program:         form.program.trim()          || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Perfil actualizado correctamente");
      setSaved(true);
    } catch {
      toast.error("No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Mi cuenta
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
            Mi perfil
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Mantén tus datos actualizados para recibir atención personalizada.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 2rem" }}>

        {/* Avatar + info básica */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: "1.75rem", marginBottom: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #39a900, #2d8600)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.875rem", fontWeight: 800, color: "white",
                fontFamily: "var(--font-display)",
                boxShadow: "0 4px 16px rgba(57,169,0,0.3)",
              }}>
                {initial}
              </div>
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: "50%",
                background: "white", border: "2px solid #e5e7eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <Camera size={11} color="#6b7280" />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "#111827" }}>
                {form.full_name || "Sin nombre"}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.25rem" }}>
                <Mail size={12} />
                {email}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                marginTop: "0.5rem", padding: "0.2rem 0.625rem",
                background: "rgba(57,169,0,0.1)", borderRadius: 20,
                fontSize: "0.6875rem", fontWeight: 700, color: "#39a900",
              }}>
                <Shield size={10} /> {ROLE_LABELS[profile?.roles?.name] || "Aprendiz SENA"}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
              <User size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Nombre completo
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => set("full_name", e.target.value)}
              placeholder="Ej. Juan Carlos Pérez González"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "0.625rem 0.875rem",
                border: "1.5px solid #e5e7eb", borderRadius: 9,
                fontSize: "0.9375rem", color: "#111827",
                outline: "none", fontFamily: "var(--font-sans)",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#39a900"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>

          {/* Documento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.875rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Tipo de documento
              </label>
              <select
                value={form.document_type}
                onChange={e => set("document_type", e.target.value)}
                style={{
                  width: "100%", padding: "0.625rem 0.875rem",
                  border: "1.5px solid #e5e7eb", borderRadius: 9,
                  fontSize: "0.875rem", color: "#111827",
                  outline: "none", fontFamily: "var(--font-sans)",
                  background: "white", cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#39a900"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              >
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.value} — {d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                <FileText size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Número de documento
              </label>
              <input
                type="text"
                value={form.document_number}
                onChange={e => set("document_number", e.target.value)}
                placeholder="Ej. 1001234567"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.625rem 0.875rem",
                  border: "1.5px solid #e5e7eb", borderRadius: 9,
                  fontSize: "0.9375rem", color: "#111827",
                  outline: "none", fontFamily: "var(--font-sans)",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#39a900"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
          </div>

          {/* Ficha + Programa */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.875rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                <Hash size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Número de ficha
              </label>
              <input
                type="text"
                value={form.ficha_number}
                onChange={e => set("ficha_number", e.target.value)}
                placeholder="Ej. 2847193"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.625rem 0.875rem",
                  border: "1.5px solid #e5e7eb", borderRadius: 9,
                  fontSize: "0.9375rem", color: "#111827",
                  outline: "none", fontFamily: "var(--font-sans)",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#39a900"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                <BookOpen size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                Programa de formación
              </label>
              <input
                type="text"
                value={form.program}
                onChange={e => set("program", e.target.value)}
                placeholder="Ej. Desarrollo de Software"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.625rem 0.875rem",
                  border: "1.5px solid #e5e7eb", borderRadius: 9,
                  fontSize: "0.9375rem", color: "#111827",
                  outline: "none", fontFamily: "var(--font-sans)",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = "#39a900"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
          </div>

          {/* Botón guardar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.875rem" }}>
            {saved && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "#39a900", fontWeight: 600 }}>
                <CheckCircle2 size={15} /> Cambios guardados
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.625rem 1.25rem",
                background: saving ? "#9ca3af" : "#39a900",
                color: "white", border: "none", borderRadius: 9,
                fontSize: "0.9375rem", fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#2d8600"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#39a900"; }}
            >
              <Save size={15} />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* Info de cuenta (solo lectura) */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.875rem" }}>
            Información de cuenta
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[
              { label: "Correo electrónico", value: email,    note: "Asociado a tu cuenta Google/Microsoft" },
              { label: "Rol en el sistema",  value: ROLE_LABELS[profile?.roles?.name] || "Aprendiz SENA", note: "Asignado por Bienestar institucional" },
            ].map(({ label, value, note }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.625rem 0", borderBottom: "1px solid #f9fafb" }}>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem" }}>{note}</div>
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
