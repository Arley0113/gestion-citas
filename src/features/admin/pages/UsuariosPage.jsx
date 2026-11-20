import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Trash2, Search, ShieldCheck, User, AlertTriangle, X, Mail, UserCog } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { ROLE_LABELS } from "../../../shared/rbac/permissions";
import { toast } from "sonner";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const MOCK_USERS = [
  { id: "u1", full_name: "Carolina Ruiz",   document_number: "9876543", onboarding_completed: true,  roles: { name: "PSICOLOGIA" },      dependency_id: 10, dependencies: { name: "Psicología" }, sede_id: 1, sedes: { name: "Maicao" } },
  { id: "u2", full_name: "Dr. Gómez",       document_number: "1111111", onboarding_completed: true,  roles: { name: "ENFERMERIA" },      dependency_id: 11, dependencies: { name: "Enfermería" }, sede_id: null, sedes: null },
  { id: "u3", full_name: "Coordinadora",    document_number: "2222222", onboarding_completed: true,  roles: { name: "COORDINACION" },    dependency_id: null, dependencies: null, sede_id: null, sedes: null },
  { id: "u4", full_name: "Admin SENA",      document_number: "3333333", onboarding_completed: true,  roles: { name: "ADMINISTRADOR" },   dependency_id: null, dependencies: null, sede_id: null, sedes: null },
  { id: "u5", full_name: "Juan Pérez",      document_number: "1234567", onboarding_completed: true,  roles: { name: "APRENDIZ" },        dependency_id: null, dependencies: null, sede_id: 2, sedes: { name: "Comercio y Servicios" } },
  { id: "u6", full_name: "María Torres",    document_number: "7654321", onboarding_completed: false, roles: { name: "TRABAJO_SOCIAL" },  dependency_id: 12, dependencies: { name: "Trabajo Social" }, sede_id: 3, sedes: { name: "Industrial" } },
];
const MOCK_SEDES = [
  { id: 1, name: "Maicao" },
  { id: 2, name: "Comercio y Servicios" },
  { id: 3, name: "Industrial" },
];
const MOCK_ROLES = Object.keys(ROLE_LABELS).map((name, i) => ({ id: i + 1, name, label: ROLE_LABELS[name] }));
const MOCK_DEPS = [
  { id: 10, name: "Psicología" },
  { id: 11, name: "Enfermería" },
  { id: 12, name: "Trabajo Social" },
  { id: 13, name: "Apoyos" },
];

// Roles que necesitan dependencia asignada para ver/atender citas.
const DEP_REQUIRED_ROLES = ["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL", "APOYO"];

const ROLE_COLOR = {
  SUPERADMIN:    { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
  ADMINISTRADOR: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  COORDINACION:  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  PSICOLOGIA:    { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  ENFERMERIA:    { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  TRABAJO_SOCIAL:{ bg: "#fefce8", text: "#92400e", border: "#fde68a" },
  APOYO:         { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  APRENDIZ:      { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" },
};

function ConfirmModal({ user, onConfirm, onCancel, loading }) {
  if (!user) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 420, width: "100%", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={20} color="#dc2626" />
          </div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Eliminar usuario</h3>
        </div>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
          Vas a eliminar permanentemente a:
        </p>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.9375rem" }}>{user.full_name || "Sin nombre"}</div>
          <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
            {ROLE_LABELS[user.roles?.name] || user.roles?.name}
            {user.dependencies?.name ? ` · ${user.dependencies.name}` : ""}
          </div>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem", marginBottom: "1.5rem" }}>
          Esta acción eliminará su cuenta, perfil y todas sus citas. No se puede deshacer.
        </p>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: "0.625rem 1.125rem", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "white", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#374151", fontFamily: "var(--font-sans)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: "0.625rem 1.25rem", border: "none", borderRadius: 9, background: loading ? "#d1d5db" : "#dc2626", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 700, color: "white", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
            {loading ? "Eliminando..." : <><Trash2 size={14} /> Eliminar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeEmailModal({ user, value, onChange, onConfirm, onCancel, loading }) {
  if (!user) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 420, width: "100%", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={20} color="#2563eb" />
          </div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Cambiar correo</h3>
        </div>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.75rem" }}>
          Vas a actualizar el correo de <strong>{user.full_name || "Sin nombre"}</strong>
          {user.email ? <> (actual: {user.email})</> : null}.
        </p>
        <input
          type="email"
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="nuevo.correo@sena.edu.co"
          style={{
            width: "100%", boxSizing: "border-box", padding: "0.625rem 0.875rem",
            border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9375rem",
            color: "#111827", outline: "none", fontFamily: "var(--font-sans)", marginBottom: "0.75rem",
          }}
          onFocus={e => e.target.style.borderColor = "#39a900"}
          onBlur={e => e.target.style.borderColor = "#e5e7eb"}
        />
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          El cambio aplica de inmediato: la persona podrá iniciar sesión con el nuevo correo y las notificaciones se enviarán allí.
        </p>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: "0.625rem 1.125rem", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "white", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#374151", fontFamily: "var(--font-sans)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: "0.625rem 1.25rem", border: "none", borderRadius: 9, background: loading ? "#d1d5db" : "#2563eb", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 700, color: "white", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
            {loading ? "Guardando..." : <><Mail size={14} /> Guardar correo</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeRoleModal({ user, roles, deps, roleValue, depValue, onRoleChange, onDepChange, onConfirm, onCancel, loading, allowSuper }) {
  if (!user) return null;
  const requiresDep = DEP_REQUIRED_ROLES.includes(roleValue);
  const roleOptions = allowSuper ? roles : roles.filter(r => r.name !== "SUPERADMIN");
  const currentRoleLabel = ROLE_LABELS[user.roles?.name] || user.roles?.name;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 420, width: "100%", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCog size={20} color="#7c3aed" />
          </div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Cambiar rol</h3>
        </div>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.75rem" }}>
          Vas a actualizar el rol de <strong>{user.full_name || "Sin nombre"}</strong> (actual: {currentRoleLabel}).
        </p>
        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Nuevo rol</label>
        <select
          value={roleValue}
          onChange={e => onRoleChange(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "0.625rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9375rem", color: "#111827", outline: "none", fontFamily: "var(--font-sans)", background: "white", cursor: "pointer", marginBottom: "0.75rem" }}
          onFocus={e => e.target.style.borderColor = "#7c3aed"}
          onBlur={e => e.target.style.borderColor = "#e5e7eb"}
        >
          {roleOptions.map(r => <option key={r.id} value={r.name}>{r.label || ROLE_LABELS[r.name] || r.name}</option>)}
        </select>
        {requiresDep && (
          <>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Dependencia</label>
            <select
              value={depValue}
              onChange={e => onDepChange(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.625rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9375rem", color: depValue ? "#111827" : "#9ca3af", outline: "none", fontFamily: "var(--font-sans)", background: "white", cursor: "pointer", marginBottom: "0.75rem" }}
              onFocus={e => e.target.style.borderColor = "#7c3aed"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            >
              <option value="">Selecciona la dependencia</option>
              {deps.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </>
        )}
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          El permiso cambia de inmediato en el servidor; el usuario verá la nueva navegación al recargar la página.
        </p>
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: "0.625rem 1.125rem", border: "1.5px solid #e5e7eb", borderRadius: 9, background: "white", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#374151", fontFamily: "var(--font-sans)" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: "0.625rem 1.25rem", border: "none", borderRadius: 9, background: loading ? "#d1d5db" : "#7c3aed", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 700, color: "white", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: "0.375rem" }}>
            {loading ? "Guardando..." : <><ShieldCheck size={14} /> Guardar rol</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const navigate = useNavigate();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const isSuperAdmin = currentProfile?.roles?.name === "SUPERADMIN";
  const canEditSede   = ["ADMINISTRADOR", "SUPERADMIN"].includes(currentProfile?.roles?.name);

  const [users, setUsers]     = useState([]);
  const [sedes, setSedes]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [deps, setDeps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmUser, setConfirmUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [savingSedeFor, setSavingSedeFor] = useState(null);
  const [emailUser, setEmailUser]     = useState(null);
  const [emailDraft, setEmailDraft]   = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [roleUser, setRoleUser]       = useState(null);
  const [roleDraft, setRoleDraft]     = useState("");
  const [roleDepDraft, setRoleDepDraft] = useState("");
  const [roleSaving, setRoleSaving]   = useState(false);

  const fetchUsers = useCallback(async () => {
    if (DEV_ROLE) { setUsers(MOCK_USERS); setSedes(MOCK_SEDES); setRoles(MOCK_ROLES); setDeps(MOCK_DEPS); setLoading(false); return; }
    const [usersRes, sedesRes, rolesRes, depsRes] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, email, document_number, onboarding_completed, dependency_id, roles(name), dependencies(name), sede_id, sedes(name)")
        .order("full_name")
        .limit(500),
      supabase.from("sedes").select("id, name").eq("active", true).order("name"),
      supabase.from("roles").select("id, name, label").order("id"),
      supabase.from("dependencies").select("id, name").order("name"),
    ]);
    if (usersRes.error) { toast.error("Error cargando usuarios"); setLoading(false); return; }
    setUsers(usersRes.data || []);
    setSedes(sedesRes.data || []);
    setRoles(rolesRes.data || []);
    setDeps(depsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSedeChange = async (userId, sedeValue) => {
    const sede_id = sedeValue ? parseInt(sedeValue) : null;
    setSavingSedeFor(userId);
    if (DEV_ROLE) {
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, sede_id, sedes: sedes.find(s => s.id === sede_id) || null }
        : u));
      toast.success("Sede actualizada (demo)");
      setSavingSedeFor(null);
      return;
    }
    const { error } = await supabase.from("profiles").update({ sede_id }).eq("id", userId);
    if (error) { toast.error("No se pudo actualizar la sede"); setSavingSedeFor(null); return; }
    setUsers(prev => prev.map(u => u.id === userId
      ? { ...u, sede_id, sedes: sedes.find(s => s.id === sede_id) || null }
      : u));
    toast.success("Sede actualizada");
    setSavingSedeFor(null);
  };

  const handleEmailSave = async () => {
    if (!emailUser) return;
    const next = emailDraft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) { toast.error("Ingresa un correo válido"); return; }
    if (next === (emailUser.email || "").toLowerCase()) { toast.error("Es el mismo correo actual"); return; }
    setEmailSaving(true);
    try {
      if (DEV_ROLE) {
        setUsers(prev => prev.map(u => u.id === emailUser.id ? { ...u, email: next } : u));
        toast.success("Correo actualizado (demo)");
        setEmailUser(null);
        setEmailSaving(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("update-user-email", {
        body: { user_id: emailUser.id, email: next },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Error al actualizar el correo");
      setUsers(prev => prev.map(u => u.id === emailUser.id ? { ...u, email: next } : u));
      toast.success("Correo actualizado correctamente");
      setEmailUser(null);
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el correo");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleRoleSave = async () => {
    if (!roleUser) return;
    const target = users.find(u => u.id === roleUser.id) || roleUser;
    const currentRoleName = target.roles?.name;

    // Guardas: no cambiar tu propio rol, no tocar a otro SUPERADMIN salvo que
    // seas SUPERADMIN, y solo SUPERADMIN puede asignar SUPERADMIN.
    if (target.id === currentUser?.id) { toast.error("No puedes cambiar tu propio rol"); return; }
    if (currentRoleName === "SUPERADMIN" && !isSuperAdmin) { toast.error("No puedes cambiar el rol de otro Super Admin"); return; }
    if (roleDraft === "SUPERADMIN" && !isSuperAdmin) { toast.error("Solo Super Admin puede asignar el rol Super Admin"); return; }
    if (roleDraft === currentRoleName && String(target.dependency_id ?? "") === roleDepDraft) {
      toast.error("No hay cambios que guardar");
      return;
    }

    const roleRow = roles.find(r => r.name === roleDraft);
    if (!roleRow) { toast.error("Rol no encontrado"); return; }
    const requiresDep = DEP_REQUIRED_ROLES.includes(roleDraft);
    if (requiresDep && !roleDepDraft) { toast.error("Selecciona la dependencia"); return; }

    setRoleSaving(true);
    try {
      const patch = { role_id: roleRow.id };
      if (requiresDep) patch.dependency_id = parseInt(roleDepDraft, 10);
      if (DEV_ROLE) {
        setUsers(prev => prev.map(u => u.id === target.id
          ? { ...u, roles: { name: roleDraft }, dependency_id: patch.dependency_id ?? u.dependency_id, dependencies: requiresDep ? (deps.find(d => d.id === patch.dependency_id) || null) : u.dependencies }
          : u));
        toast.success(`Rol actualizado a ${ROLE_LABELS[roleDraft] || roleDraft} (demo)`);
        setRoleUser(null);
        setRoleSaving(false);
        return;
      }
      const { error } = await supabase.from("profiles").update(patch).eq("id", target.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === target.id
        ? { ...u, roles: { name: roleDraft }, dependency_id: patch.dependency_id ?? u.dependency_id, dependencies: requiresDep ? (deps.find(d => d.id === patch.dependency_id) || null) : u.dependencies }
        : u));
      toast.success(`Rol actualizado a ${ROLE_LABELS[roleDraft] || roleDraft}`);
      setRoleUser(null);
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el rol");
    } finally {
      setRoleSaving(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || (u.full_name || "").toLowerCase().includes(search.toLowerCase()) || (u.document_number || "").includes(search);
    const matchRole = roleFilter === "all" || u.roles?.name === roleFilter;
    return matchSearch && matchRole;
  });

  const handleDelete = async () => {
    if (!confirmUser) return;
    setDeleting(true);
    try {
      if (DEV_ROLE) {
        await new Promise(r => setTimeout(r, 800));
        setUsers(prev => prev.filter(u => u.id !== confirmUser.id));
        toast.success("Usuario eliminado (demo)");
        setConfirmUser(null);
        setDeleting(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: confirmUser.id },
      });
      if (error || data?.error) throw new Error(data?.error || "Error al eliminar");
      setUsers(prev => prev.filter(u => u.id !== confirmUser.id));
      toast.success("Usuario eliminado correctamente");
      setConfirmUser(null);
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el usuario");
    } finally {
      setDeleting(false);
    }
  };

  const allRoles = [...new Set(users.map(u => u.roles?.name).filter(Boolean))];

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <ConfirmModal user={confirmUser} onConfirm={handleDelete} onCancel={() => setConfirmUser(null)} loading={deleting} />
      <ChangeEmailModal user={emailUser} value={emailDraft} onChange={setEmailDraft} onConfirm={handleEmailSave} onCancel={() => setEmailUser(null)} loading={emailSaving} />
      <ChangeRoleModal
        user={roleUser}
        roles={roles}
        deps={deps}
        roleValue={roleDraft}
        depValue={roleDepDraft}
        onRoleChange={v => { setRoleDraft(v); if (!DEP_REQUIRED_ROLES.includes(v)) setRoleDepDraft(""); }}
        onDepChange={setRoleDepDraft}
        onConfirm={handleRoleSave}
        onCancel={() => setRoleUser(null)}
        loading={roleSaving}
        allowSuper={isSuperAdmin}
      />

      {/* Header */}
      <div style={{ background: "linear-gradient(to bottom, #f0fce4, #f5f7fa)", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 2rem 1.5rem" }}>
          <button onClick={() => navigate("/admin")} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: "1rem", padding: 0 }}>
            <ArrowLeft size={14} /> Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} color="#39a900" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Gestión de usuarios</h1>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>{users.length} usuarios registrados</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.75rem 2rem 2rem" }}>
        {/* Filtros */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 2rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", fontFamily: "var(--font-sans)", outline: "none", background: "white" }}
              onFocus={e => e.target.style.borderColor = "#39a900"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: "0.625rem 0.875rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", fontFamily: "var(--font-sans)", background: "white", color: "#374151", cursor: "pointer", outline: "none" }}>
            <option value="all">Todos los roles</option>
            {allRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 0.75rem" }} />
              Cargando usuarios...
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              <User size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
              No se encontraron usuarios
            </div>
          ) : (
            filtered.map((u, i) => {
              const roleName = u.roles?.name;
              const rc = ROLE_COLOR[roleName] || ROLE_COLOR.APRENDIZ;
              const isSelf = u.id === currentUser?.id;
              const isOtherSuperAdmin = roleName === "SUPERADMIN" && !isSelf;
              const canDelete = isSuperAdmin && !isSelf && !isOtherSuperAdmin;
              const canChangeEmail = !isOtherSuperAdmin;
              const canChangeRole = !isSelf && !(isOtherSuperAdmin && !isSuperAdmin);
              const initials = (u.full_name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
              const isProfessional = ["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL", "APOYO"].includes(roleName);
              const isAprendiz     = roleName === "APRENDIZ";

              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.25rem", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}>
                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: rc.bg, border: `1px solid ${rc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.875rem", color: rc.text, flexShrink: 0 }}>
                    {initials}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.9375rem" }}>{u.full_name || "Sin nombre"}</span>
                      {isSelf && <span style={{ fontSize: "0.6875rem", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 4, padding: "0.125rem 0.375rem", fontWeight: 600 }}>Tú</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: rc.text, background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: 5, padding: "0.125rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <ShieldCheck size={11} /> {ROLE_LABELS[roleName] || roleName}
                      </span>
                      {u.email && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{u.email}</span>}
                      {u.dependencies?.name && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{u.dependencies.name}</span>}
                      {u.document_number && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>CC {u.document_number}</span>}
                      {!u.onboarding_completed && <span style={{ fontSize: "0.6875rem", color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 4, padding: "0.125rem 0.375rem" }}>Sin completar perfil</span>}
                      {isAprendiz && (
                        <span style={{ fontSize: "0.75rem", color: u.sedes?.name ? "#0ea5e9" : "#9ca3af" }}>
                          {u.sedes?.name || "Sin sede"}
                        </span>
                      )}
                      {isProfessional && (
                        canEditSede ? (
                          <select
                            value={u.sede_id ?? ""}
                            onChange={e => handleSedeChange(u.id, e.target.value)}
                            disabled={savingSedeFor === u.id}
                            style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem", border: "1.5px solid #e5e7eb", borderRadius: 6, color: "#0ea5e9", background: "white", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            <option value="">Todas las sedes</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#0ea5e9" }}>
                            {u.sedes?.name || "Todas las sedes"}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  {/* Acciones */}
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    {canChangeRole && (
                      <button
                        onClick={() => { setRoleUser(u); setRoleDraft(roleName); setRoleDepDraft(u.dependency_id != null ? String(u.dependency_id) : ""); }}
                        title="Cambiar rol"
                        style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid #ddd6fe", background: "#f5f3ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", transition: "all 0.12s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#ede9fe"; e.currentTarget.style.borderColor = "#c4b5fd"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.borderColor = "#ddd6fe"; }}
                      >
                        <UserCog size={15} />
                      </button>
                    )}
                    {canChangeEmail && (
                      <button
                        onClick={() => { setEmailUser(u); setEmailDraft(u.email || ""); }}
                        title="Cambiar correo"
                        style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", transition: "all 0.12s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                      >
                        <Mail size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setConfirmUser(u)}
                        title="Eliminar usuario"
                        style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", transition: "all 0.12s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#fff5f5"; e.currentTarget.style.borderColor = "#fecaca"; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isSuperAdmin && (
          <p style={{ fontSize: "0.8125rem", color: "#6b7280", textAlign: "center", marginTop: "1.25rem" }}>
            Solo SUPERADMIN puede eliminar usuarios.
          </p>
        )}
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", textAlign: "center", marginTop: "0.5rem" }}>
          Con el botón de rol (ícono de usuario con engranaje) puedes cambiar el rol y la dependencia de un usuario.
        </p>
      </div>
    </div>
  );
}
