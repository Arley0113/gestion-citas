import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Check, Minus } from "lucide-react";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_PERMISSIONS, ROLE_LABELS, ALL_ROLES } from "../../../shared/rbac/permissions";

export default function RolesPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "linear-gradient(to bottom, #f0fce4, #f5f7fa)", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 2rem 1.5rem" }}>
          <button
            onClick={() => navigate("/admin")}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: "1rem", padding: 0 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f0fce4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={20} color="#39a900" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", margin: 0, fontFamily: "var(--font-display)" }}>Roles y permisos</h1>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: 0 }}>Matriz completa de acceso por rol — {ALL_ROLES.length} roles, {Object.values(PERMISSION_LABELS).length} permisos</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.75rem 2rem 2rem" }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", overflowX: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${ALL_ROLES.length}, 1fr)`, borderBottom: "2px solid #f3f4f6", minWidth: 700, background: "#fafafa" }}>
            <div style={{ padding: "1rem 1.25rem", fontSize: "0.6875rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Permiso</div>
            {ALL_ROLES.map(role => (
              <div key={role} style={{ padding: "1rem 0.5rem", textAlign: "center", borderLeft: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>{ROLE_LABELS[role]}</div>
                <div style={{ fontSize: "0.5625rem", color: "#6b7280", marginTop: "0.125rem" }}>{(ROLE_PERMISSIONS[role] || []).length} permisos</div>
              </div>
            ))}
          </div>

          {PERMISSION_GROUPS.map((group, gi) => (
            <div key={group.label}>
              <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${ALL_ROLES.length}, 1fr)`, background: "#f9fafb", borderTop: gi > 0 ? "1px solid #f3f4f6" : "none", minWidth: 700 }}>
                <div style={{ padding: "0.5rem 1.25rem", fontSize: "0.625rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {group.label}
                </div>
                {ALL_ROLES.map(role => <div key={role} style={{ borderLeft: "1px solid #f3f4f6" }} />)}
              </div>
              {group.permissions.map((perm) => (
                <div key={perm} style={{ display: "grid", gridTemplateColumns: `220px repeat(${ALL_ROLES.length}, 1fr)`, borderTop: "1px solid #f9fafb", minWidth: 700 }}>
                  <div style={{ padding: "0.625rem 1.25rem", fontSize: "0.8125rem", color: "#4b5563", display: "flex", alignItems: "center" }}>
                    {PERMISSION_LABELS[perm]}
                  </div>
                  {ALL_ROLES.map(role => {
                    const granted = (ROLE_PERMISSIONS[role] || []).includes(perm);
                    return (
                      <div key={role} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.625rem 0.5rem", borderLeft: "1px solid #f9fafb", background: granted ? "rgba(57,169,0,0.03)" : "transparent" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: granted ? "#f0fce4" : "#f9fafb", border: `1px solid ${granted ? "#bbf7d0" : "#e5e7eb"}` }}>
                          {granted ? <Check size={12} color="#39a900" strokeWidth={2.5} /> : <Minus size={12} color="#d1d5db" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
