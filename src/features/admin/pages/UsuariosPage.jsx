import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Trash2, Search, ShieldCheck, User, AlertTriangle, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { ROLE_LABELS } from "../../../shared/rbac/permissions";
import { toast } from "sonner";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const MOCK_USERS = [
  { id: "u1", full_name: "Carolina Ruiz",   document_number: "9876543", onboarding_completed: true,  roles: { name: "PSICOLOGIA" },      dependencies: { name: "Psicología" } },
  { id: "u2", full_name: "Dr. Gómez",       document_number: "1111111", onboarding_completed: true,  roles: { name: "ENFERMERIA" },      dependencies: { name: "Enfermería" } },
  { id: "u3", full_name: "Coordinadora",    document_number: "2222222", onboarding_completed: true,  roles: { name: "COORDINACION" },    dependencies: null },
  { id: "u4", full_name: "Admin SENA",      document_number: "3333333", onboarding_completed: true,  roles: { name: "ADMINISTRADOR" },   dependencies: null },
  { id: "u5", full_name: "Juan Pérez",      document_number: "1234567", onboarding_completed: true,  roles: { name: "APRENDIZ" },        dependencies: null },
  { id: "u6", full_name: "María Torres",    document_number: "7654321", onboarding_completed: false, roles: { name: "TRABAJO_SOCIAL" },  dependencies: { name: "Trabajo Social" } },
];

const ROLE_COLOR = {
  SUPERADMIN:    { bg: "#fdf4ff", text: "#7e22ce", border: "#e9d5ff" },
  ADMINISTRADOR: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  COORDINACION:  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  PSICOLOGIA:    { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  ENFERMERIA:    { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  TRABAJO_SOCIAL:{ bg: "#fefce8", text: "#92400e", border: "#fde68a" },
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

export default function UsuariosPage() {
  const navigate = useNavigate();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const isSuperAdmin = currentProfile?.roles?.name === "SUPERADMIN";

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmUser, setConfirmUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (DEV_ROLE) { setUsers(MOCK_USERS); setLoading(false); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, document_number, onboarding_completed, roles(name), dependencies(name)")
      .order("full_name")
      .limit(500);
    if (error) { toast.error("Error cargando usuarios"); setLoading(false); return; }
    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: confirmUser.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al eliminar");
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
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              style={{ width: "100%", padding: "0.625rem 0.75rem 0.625rem 2rem", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.875rem", fontFamily: "var(--font-sans)", outline: "none", background: "white" }}
              onFocus={e => e.target.style.borderColor = "#39a900"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}>
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
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              <div style={{ width: 28, height: 28, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 0.75rem" }} />
              Cargando usuarios...
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
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
              const initials = (u.full_name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

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
                      {u.dependencies?.name && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{u.dependencies.name}</span>}
                      {u.document_number && <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>CC {u.document_number}</span>}
                      {!u.onboarding_completed && <span style={{ fontSize: "0.6875rem", color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 4, padding: "0.125rem 0.375rem" }}>Sin completar perfil</span>}
                    </div>
                  </div>
                  {/* Acción */}
                  {canDelete && (
                    <button
                      onClick={() => setConfirmUser(u)}
                      title="Eliminar usuario"
                      style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", flexShrink: 0, transition: "all 0.12s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff5f5"; e.currentTarget.style.borderColor = "#fecaca"; }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isSuperAdmin && (
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center", marginTop: "1.25rem" }}>
            Solo SUPERADMIN puede eliminar usuarios.
          </p>
        )}
      </div>
    </div>
  );
}
