import { useAuth } from "../../providers/AuthProvider";
import { ROLE_PERMISSIONS, ROLE_LABELS } from "./permissions";

export function usePermissions() {
  const { profile } = useAuth();
  const roleName = profile?.roles?.name;
  const perms    = ROLE_PERMISSIONS[roleName] || [];

  const can    = (permission) => perms.includes(permission);
  const cannot = (permission) => !perms.includes(permission);

  // Acepta array o múltiples args: hasAny("a","b") o hasAny(["a","b"])
  const hasAny = (...args) => args.flat().some(p => perms.includes(p));
  const hasAll = (...args) => args.flat().every(p => perms.includes(p));

  // Verificación de rol exacto
  const isRole = (role) => {
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(roleName);
  };

  // Helpers semánticos
  const isAprendiz     = () => roleName === "APRENDIZ";
  const isProfessional = () => ["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"].includes(roleName);
  const isCoordination = () => roleName === "COORDINACION";
  const isAdmin        = () => ["ADMINISTRADOR","SUPERADMIN"].includes(roleName);
  const isSuperAdmin   = () => roleName === "SUPERADMIN";

  const roleLabel = ROLE_LABELS[roleName] || roleName || "—";

  return {
    can,
    cannot,
    hasAny,
    hasAll,
    isRole,
    isAprendiz,
    isProfessional,
    isCoordination,
    isAdmin,
    isSuperAdmin,
    permissions: perms,
    role: roleName,
    roleLabel,
  };
}
