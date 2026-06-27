import { useState, useEffect, useCallback } from "react";
import { UserPlus, Send, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const STAFF_ROLES = [
  { value: "PSICOLOGIA",     label: "Psicólogo/a",       dep: true  },
  { value: "ENFERMERIA",     label: "Enfermero/a",        dep: true  },
  { value: "TRABAJO_SOCIAL", label: "Trabajador/a Social", dep: true  },
  { value: "COORDINACION",   label: "Coordinación",       dep: false },
  { value: "ADMINISTRADOR",  label: "Administrador/a",    dep: false },
];

const STATUS_CFG = {
  pending:   { label: "Pendiente",  color: "#d97706", bg: "#fef3c7", icon: Clock },
  accepted:  { label: "Aceptada",   color: "#16a34a", bg: "#dcfce7", icon: CheckCircle2 },
  expired:   { label: "Expirada",   color: "#9ca3af", bg: "#f3f4f6", icon: XCircle },
  cancelled: { label: "Cancelada",  color: "#ef4444", bg: "#fee2e2", icon: AlertCircle },
};

export default function StaffInvitePage() {
  const [form, setForm]         = useState({ email: "", role_name: "", dependency_id: "" });
  const [roles, setRoles]       = useState([]);
  const [deps, setDeps]         = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [sending, setSending]   = useState(false);
  const [loadingInv, setLoadingInv] = useState(true);

  const selectedRoleMeta = STAFF_ROLES.find(r => r.value === form.role_name);
  const requiresDep      = selectedRoleMeta?.dep ?? false;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Cargar roles y dependencias
  useEffect(() => {
    Promise.all([
      supabase.from("roles").select("id, name, label").in("name", STAFF_ROLES.map(r => r.value)),
      supabase.from("dependencies").select("id, name"),
    ]).then(([rolesRes, depsRes]) => {
      setRoles(rolesRes.data || []);
      setDeps(depsRes.data || []);
    });
  }, []);

  const fetchInvitations = useCallback(async () => {
    setLoadingInv(true);
    try {
      const { data } = await supabase
        .from("staff_invitations_full")
        .select("*")
        .order("created_at", { ascending: false });
      setInvitations(data || []);
    } catch {
      toast.error("No se pudieron cargar las invitaciones");
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => { fetchInvitations(); }, [fetchInvitations]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.email)      { toast.error("Ingresa el correo del staff"); return; }
    if (!form.role_name)  { toast.error("Selecciona el rol"); return; }
    if (requiresDep && !form.dependency_id) { toast.error("Selecciona la dependencia"); return; }

    const roleRow = roles.find(r => r.name === form.role_name);
    if (!roleRow) { toast.error("Rol no encontrado"); return; }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-staff", {
        body: {
          email:         form.email.trim().toLowerCase(),
          role_id:       roleRow.id,
          dependency_id: form.dependency_id ? parseInt(form.dependency_id) : null,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Error al enviar la invitación");
        return;
      }

      toast.success(`Invitación enviada a ${form.email}`);
      setForm({ email: "", role_name: "", dependency_id: "" });
      fetchInvitations();
    } catch {
      toast.error("Error de conexión al enviar la invitación");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Cancelar esta invitación? El enlace enviado dejará de funcionar.")) return;
    const { error } = await supabase
      .from("staff_invitations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "pending");
    if (error) { toast.error("No se pudo cancelar"); return; }
    toast.success("Invitación cancelada");
    fetchInvitations();
  };

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.75rem 2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
            Gestión de usuarios
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", margin: 0, fontFamily: "var(--font-display)" }}>
            Invitar staff
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Envía invitaciones por correo al personal de Bienestar SENA con su rol asignado.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "1.25rem", alignItems: "start" }}>

        {/* ─── Formulario de invitación ─── */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={17} color="#39a900" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>Nueva invitación</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>El staff recibirá un link por correo</div>
            </div>
          </div>

          <form onSubmit={handleSend}>
            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="profesional@sena.edu.co"
                required
                style={{ width: "100%", boxSizing: "border-box", padding: "0.65rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9375rem", color: "#111827", outline: "none", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "#39a900"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            {/* Rol */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
                Rol en el sistema
              </label>
              <select
                value={form.role_name}
                onChange={e => { set("role_name", e.target.value); set("dependency_id", ""); }}
                required
                style={{ width: "100%", padding: "0.65rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9375rem", color: form.role_name ? "#111827" : "#9ca3af", background: "white", outline: "none", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "#39a900"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              >
                <option value="">Seleccionar rol…</option>
                {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Dependencia (solo para profesionales) */}
            {requiresDep && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}>
                  Dependencia
                </label>
                <select
                  value={form.dependency_id}
                  onChange={e => set("dependency_id", e.target.value)}
                  required={requiresDep}
                  style={{ width: "100%", padding: "0.65rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9375rem", color: form.dependency_id ? "#111827" : "#9ca3af", background: "white", outline: "none", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = "#39a900"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                >
                  <option value="">Seleccionar dependencia…</option>
                  {deps.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.75rem", background: sending ? "#9ca3af" : "#39a900", color: "white", border: "none", borderRadius: 9, fontSize: "0.9375rem", fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!sending) e.currentTarget.style.background = "#2d8600"; }}
              onMouseLeave={e => { if (!sending) e.currentTarget.style.background = "#39a900"; }}
            >
              <Send size={15} />
              {sending ? "Enviando…" : "Enviar invitación"}
            </button>
          </form>

          {/* Info */}
          <div style={{ marginTop: "1rem", padding: "0.875rem", background: "#f9fafb", borderRadius: 9, border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.6 }}>
              <strong style={{ color: "#374151" }}>¿Cómo funciona?</strong><br />
              El staff recibe un correo con un link de acceso. Al hacer clic, completa sus datos y entra directamente con el rol asignado. El link expira en 7 días.
            </div>
          </div>
        </div>

        {/* ─── Lista de invitaciones ─── */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "1.125rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>
              Invitaciones enviadas
            </div>
            <button
              onClick={fetchInvitations}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: "0.8125rem", color: "#6b7280", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              <RefreshCw size={13} /> Actualizar
            </button>
          </div>

          {loadingInv ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2.5rem 0" }}>
              <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            </div>
          ) : invitations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
              <UserPlus size={32} color="#e5e7eb" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>Sin invitaciones aún</div>
              <div style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>Envía la primera desde el formulario</div>
            </div>
          ) : (
            <div>
              {invitations.map((inv, i) => {
                const cfg = STATUS_CFG[inv.status] || STATUS_CFG.pending;
                const Ic  = cfg.icon;
                return (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1.5rem", borderBottom: i < invitations.length - 1 ? "1px solid #f9fafb" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ic size={16} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.email}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span>{inv.role_label || inv.role_name}</span>
                        {inv.dependency_name && <><span>·</span><span>{inv.dependency_name}</span></>}
                        <span>· {format(parseISO(inv.created_at), "d MMM yyyy", { locale: es })}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "0.2rem 0.5rem", borderRadius: 20 }}>
                        {cfg.label}
                      </span>
                      {inv.status === "pending" && (
                        <button
                          onClick={() => handleCancel(inv.id)}
                          title="Cancelar invitación"
                          style={{ padding: "0.25rem 0.5rem", background: "white", border: "1px solid #fecaca", borderRadius: 6, fontSize: "0.75rem", color: "#ef4444", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
