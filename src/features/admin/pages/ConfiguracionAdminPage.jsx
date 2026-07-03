import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

const SETTINGS = [
  { key: "max_appointments_per_day", label: "Máx. citas por día (por profesional)", type: "number", default: 8 },
  { key: "appointment_duration_min", label: "Duración de cita (minutos)", type: "number", default: 30 },
  { key: "allow_same_day_booking",   label: "Permitir citas en el mismo día", type: "boolean", default: true },
  { key: "require_cancel_reason",    label: "Requerir motivo al cancelar", type: "boolean", default: false },
  { key: "notification_emails",      label: "Notificaciones por email", type: "boolean", default: true },
];

const DEFAULTS = Object.fromEntries(SETTINGS.map(s => [s.key, s.default]));

function parseRow({ key, value }) {
  const meta = SETTINGS.find(s => s.key === key);
  if (!meta) return [key, value];
  if (meta.type === "boolean") return [key, value === "true"];
  if (meta.type === "number")  return [key, Number(value)];
  return [key, value];
}

export default function ConfiguracionAdminPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("system_settings")
      .select("key, value")
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setValues(prev => ({ ...prev, ...Object.fromEntries(data.map(parseRow)) }));
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const rows = SETTINGS.map(s => ({
      key: s.key,
      value: String(values[s.key]),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("system_settings")
      .upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error("Error al guardar la configuración"); return; }
    toast.success("Configuración guardada");
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "linear-gradient(to bottom, #f9fafb, #f5f7fa)", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 2rem 1.5rem" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: "1rem", padding: 0 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings size={20} color="#6b7280" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Configuración general</h1>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>Parámetros del sistema</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.75rem 2rem 2rem" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!loading && <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {SETTINGS.map((s, i) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.5rem", borderBottom: i < SETTINGS.length - 1 ? "1px solid #f9fafb" : "none", gap: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>{s.label}</div>
              </div>
              {s.type === "boolean" ? (
                <button
                  onClick={() => setValues(v => ({ ...v, [s.key]: !v[s.key] }))}
                  style={{ flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: "none", background: values[s.key] ? "#39a900" : "#d1d5db", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: "white", position: "absolute", top: 3, left: values[s.key] ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              ) : (
                <input
                  type="number"
                  value={values[s.key]}
                  onChange={e => setValues(v => ({ ...v, [s.key]: Number(e.target.value) }))}
                  style={{ width: 80, padding: "0.375rem 0.625rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-sans)", textAlign: "center", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#39a900"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              )}
            </div>
          ))}
        </div>}

        {!loading && <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", background: saving ? "#9ca3af" : "#39a900", color: "white", border: "none", borderRadius: 9, fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(57,169,0,0.25)" }}
          >
            <Save size={15} /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>}
      </div>
    </div>
  );
}
