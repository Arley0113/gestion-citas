import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

const VALID_PREVIEWS = ["aprendiz","professional","coordination","admin","superadmin"];
const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;
const IS_VALID_DEV = DEV_ROLE && VALID_PREVIEWS.includes(DEV_ROLE);

export function ProtectedRoute({ children, requiredRoles = null, requiredPermissions = null, fallback = "/login" }) {
  const { user, profile, loading, hasRole, can } = useAuth();
  const location = useLocation();
  const redirectTo = `${fallback}${location.search || ""}`;

  // Modo DEV solo permite valores de preview válidos
  if (IS_VALID_DEV) return children;

  const spinner = (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--surface-base)", fontFamily: "var(--font-sans)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.65s linear infinite", margin: "0 auto 1rem" }} />
        <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Verificando sesión...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (loading) return spinner;

  if (!user) return <Navigate to={redirectTo} state={{ from: location }} replace />;
  // Si el usuario existe pero el perfil aún no cargó (p.ej. link de invitación),
  // mostrar spinner en vez de redirigir al login
  if (user && !profile) return spinner;

  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!hasRole(roles)) return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermissions) {
    const list = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    if (!list.every(can)) return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
