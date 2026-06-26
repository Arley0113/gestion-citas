import { usePermissions } from "./usePermissions";

/**
 * Renders children only when the current user has the required permission(s).
 *
 * @param {string|string[]} requires - One permission or array of permissions
 * @param {"all"|"any"} mode - "all" requires every permission, "any" requires at least one
 * @param {ReactNode} fallback - What to render when permission is denied (default: null)
 */
export function Permission({ requires, mode = "all", fallback = null, children }) {
  const { can } = usePermissions();
  const list = Array.isArray(requires) ? requires : [requires];
  const ok   = mode === "any" ? list.some(can) : list.every(can);
  return ok ? children : fallback;
}
