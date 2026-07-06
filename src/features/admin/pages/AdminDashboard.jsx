import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Settings, Building2, ChevronRight, Shield, Activity, Database, Check, Minus, Lock, ChevronDown, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { supabase } from "../../../lib/supabase";
import { ROLE_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_LABELS, ALL_ROLES, P } from "../../../shared/rbac/permissions";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const MODULES = [
  { icon: Users,     title: "Invitar staff",         desc: "Crear cuentas de profesionales",  accent: "#3b82f6", bg: "#eff6ff", permission: P.USERS_MANAGE_ROLES,    path: "/admin/invitar" },
  { icon: Users,     title: "Usuarios registrados",  desc: "Ver y eliminar usuarios",         accent: "#dc2626", bg: "#fef2f2", permission: P.USERS_READ,            path: "/admin/usuarios" },
  { icon: Building2, title: "Dependencias",          desc: "Administrar áreas de bienestar",  accent: "#8b5cf6", bg: "#f5f3ff", permission: P.DEPS_MANAGE,           path: "/admin/dependencias" },
  { icon: Shield,    title: "Roles y permisos",      desc: "Ver matriz de acceso del sistema", accent: "#39a900", bg: "#f0fce4", permission: P.USERS_READ,            path: "/admin/roles" },
  { icon: Activity,  title: "Registro de actividad", desc: "Logs y auditoría del sistema",    accent: "#f59e0b", bg: "#fffbeb", permission: P.APPOINTMENTS_READ_ALL, path: "/admin/actividad" },
  { icon: Database,  title: "Exportar datos",        desc: "Reportes y exportación de datos", accent: "#ef4444", bg: "#fef2f2", permission: P.REPORTS_EXPORT,        path: "/reportes" },
  { icon: Settings,  title: "Configuración general", desc: "Parámetros del sistema",          accent: "#6b7280", bg: "#f9fafb", permission: P.SYSTEM_CONFIG,         path: "/admin/configuracion" },
  { icon: Database,  title: "Fichas activas",         desc: "Lista blanca de aprendices SENA", accent: "#0ea5e9", bg: "#f0f9ff", permission: P.USERS_MANAGE_ROLES,    path: "/admin/fichas" },
];

const STATUS_META = {
  pending:     { icon: Calendar,     color: "#f59e0b", bg: "#fef3c7", label: "Pendiente" },
  confirmed:   { icon: CheckCircle2, color: "#39a900", bg: "#f0fce4", label: "Confirmada" },
  cancelled:   { icon: AlertCircle,  color: "#ef4444", bg: "#fef2f2", label: "Cancelada" },
  in_progress: { icon: Activity,     color: "#3b82f6", bg: "#eff6ff", label: "En atención" },
  completed:   { icon: CheckCircle2, color: "#8b5cf6", bg: "#f5f3ff", label: "Completada" },
  no_show:     { icon: AlertCircle,  color: "#6b7280", bg: "#f9fafb", label: "No asistió" },
};

function useAdminStats() {
  const [stats, setStats] = useState({ users: null, deps: null, monthApts: null, uptime: "99.9%" });

  useEffect(() => {
    if (IS_DEV) {
      setStats({ users: 128, deps: 3, monthApts: 47, uptime: "99.9%" });
      return;
    }
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("dependencies").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }).gte("scheduled_date", firstOfMonth),
    ]).then(([users, deps, apts]) => {
      setStats({ users: users.count ?? "—", deps: deps.count ?? "—", monthApts: apts.count ?? "—", uptime: "99.9%" });
    }).catch(() => {
      setStats({ users: "—", deps: "—", monthApts: "—", uptime: "99.9%" });
    });
  }, []);

  return stats;
}

function useRecentActivity() {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (IS_DEV) return;
    supabase
      .from("appointments")
      .select("id, status, created_at, profiles!user_id(full_name), dependencies(name)")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setActivity(data); })
      .catch(() => {});
  }, []);

  return activity;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { can } = usePermissions();
  const stats = useAdminStats();
  const name  = profile?.full_name?.split(" ")[0] || "Admin";
  const now   = new Date();
  const roleName = ROLE_LABELS[profile?.roles?.name] || profile?.roles?.name || "Admin";

  const recentActivity = useRecentActivity();
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (label) => setCollapsedGroups(p => ({ ...p, [label]: !p[label] }));

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* ─── Header ─── */}
      <div style={{ background: "linear-gradient(to bottom, #f0fce4 0%, #f5f7fa 100%)", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 2rem 1.75rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
                Panel de Administración
              </div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.2, fontFamily: "var(--font-display)" }}>
                {name}
              </h1>
              <p style={{ fontSize: "0.875rem", color: "#4b5563", marginTop: "0.25rem" }}>
                {now.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 1rem", background: "#f0fce4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <Shield size={16} color="#39a900" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#166534" }}>{roleName}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "1.5rem" }}>
            {[
              { label: "Usuarios totales",   value: stats.users,     color: "#3b82f6", bg: "#eff6ff" },
              { label: "Dependencias",        value: stats.deps,      color: "#8b5cf6", bg: "#f5f3ff" },
              { label: "Citas este mes",      value: stats.monthApts, color: "#39a900", bg: "#f0fce4" },
              { label: "Tiempo de actividad", value: stats.uptime,    color: "#16a34a", bg: "#f0fce4" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: "white", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "0.6875rem", color: "#9ca3af", fontWeight: 500, marginBottom: "0.5rem" }}>{label}</div>
                <div style={{ fontSize: "1.875rem", fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.03em", fontFamily: "var(--font-display)" }}>
                  {value === null ? (
                    <div style={{ width: 32, height: 32, border: "2px solid #e5e7eb", borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  ) : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Matriz RBAC colapsable ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.75rem 2rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>
              Control de Acceso
            </div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2, fontFamily: "var(--font-display)" }}>
              Matriz de permisos por rol
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem", color: "#9ca3af" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 16, height: 16, borderRadius: "4px", background: "#f0fce4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={10} color="#39a900" />
              </div>
              Permitido
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 16, height: 16, borderRadius: "4px", background: "#f9fafb", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Minus size={10} color="#d1d5db" />
              </div>
              Denegado
            </div>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", overflowX: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: "1.75rem" }}>
          {/* Cabecera de roles */}
          <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${ALL_ROLES.length}, 1fr)`, borderBottom: "2px solid #f3f4f6", minWidth: 700 }}>
            <div style={{ padding: "0.875rem 1.25rem", fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Permiso
            </div>
            {ALL_ROLES.map(role => (
              <div key={role} style={{ padding: "0.875rem 0.5rem", textAlign: "center", borderLeft: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>{ROLE_LABELS[role]}</div>
                <div style={{ fontSize: "0.5625rem", color: "#9ca3af", marginTop: "0.125rem" }}>
                  {(ROLE_PERMISSIONS[role] || []).length} permisos
                </div>
              </div>
            ))}
          </div>

          {/* Grupos y permisos colapsables */}
          {PERMISSION_GROUPS.map((group, gi) => {
            const isCollapsed = !!collapsedGroups[group.label];
            return (
              <div key={group.label}>
                {/* Cabecera de grupo — clickeable */}
                <div
                  onClick={() => toggleGroup(group.label)}
                  style={{ display: "grid", gridTemplateColumns: `220px repeat(${ALL_ROLES.length}, 1fr)`, background: "#fafafa", borderTop: gi > 0 ? "1px solid #f3f4f6" : "none", cursor: "pointer", minWidth: 700 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fafafa"}
                >
                  <div style={{ padding: "0.625rem 1.25rem", fontSize: "0.6875rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Lock size={10} color="#39a900" />
                    {group.label}
                    <span style={{ fontSize: "0.5625rem", color: "#9ca3af", fontWeight: 500, marginLeft: "0.25rem" }}>({group.permissions.length} permisos)</span>
                    <ChevronDown
                      size={13}
                      color="#9ca3af"
                      style={{ marginLeft: "auto", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                    />
                  </div>
                  {ALL_ROLES.map(role => (
                    <div key={role} style={{ borderLeft: "1px solid #f3f4f6" }} />
                  ))}
                </div>

                {/* Filas de permisos — ocultas si colapsado */}
                {!isCollapsed && group.permissions.map((perm) => (
                  <div key={perm} style={{ display: "grid", gridTemplateColumns: `220px repeat(${ALL_ROLES.length}, 1fr)`, borderTop: "1px solid #f9fafb", minWidth: 700 }}>
                    <div style={{ padding: "0.625rem 1.25rem", fontSize: "0.8125rem", color: "#4b5563", display: "flex", alignItems: "center" }}>
                      {PERMISSION_LABELS[perm]}
                    </div>
                    {ALL_ROLES.map(role => {
                      const granted = (ROLE_PERMISSIONS[role] || []).includes(perm);
                      return (
                        <div key={role} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.625rem 0.5rem", borderLeft: "1px solid #f9fafb", background: granted ? "rgba(57,169,0,0.03)" : "transparent" }}>
                          <div style={{ width: 22, height: 22, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: granted ? "#f0fce4" : "#f9fafb", border: `1px solid ${granted ? "#bbf7d0" : "#e5e7eb"}` }}>
                            {granted
                              ? <Check size={12} color="#39a900" strokeWidth={2.5} />
                              : <Minus size={12} color="#d1d5db" />
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Módulos (todos visibles) ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem 1.75rem" }}>
        <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>
          Módulos del sistema
        </div>

        <div className="modules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {MODULES.map(({ icon: Icon, title, desc, accent, bg, permission, path }) => {
            const hasAccess = !permission || can(permission);
            return (
              <div
                key={title}
                onClick={() => hasAccess && path && navigate(path)}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  cursor: hasAccess && path ? "pointer" : "default",
                  transition: "box-shadow 0.15s, border-color 0.15s, transform 0.1s",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  opacity: hasAccess ? 1 : 0.55,
                }}
                onMouseEnter={e => { if (hasAccess && path) { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} color={accent} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111827" }}>{title}</span>
                    {!hasAccess && (
                      <span style={{ fontSize: "0.6875rem", background: "#f3f4f6", color: "#9ca3af", padding: "0.125rem 0.5rem", borderRadius: 20, fontWeight: 600 }}>
                        Próximamente
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>{desc}</div>
                </div>
                {hasAccess
                  ? <ChevronRight size={16} color="#d1d5db" style={{ marginTop: "0.25rem", flexShrink: 0 }} />
                  : <Lock size={14} color="#d1d5db" style={{ marginTop: "0.25rem", flexShrink: 0 }} />
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Actividad reciente ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem 1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Actividad reciente
          </div>
          <button onClick={() => navigate("/admin/actividad")} style={{ fontSize: "0.75rem", color: "#39a900", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Ver todo →
          </button>
        </div>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {(IS_DEV ? [
            { id: 1, status: "confirmed",   profiles: { full_name: "Juan Pérez" },   dependencies: { name: "Psicología" },     created_at: new Date(Date.now()-7200000).toISOString() },
            { id: 2, status: "completed",   profiles: { full_name: "María Torres" },  dependencies: { name: "Enfermería" },     created_at: new Date(Date.now()-14400000).toISOString() },
            { id: 3, status: "cancelled",   profiles: { full_name: "Carlos Ruiz" },   dependencies: { name: "Trabajo Social" }, created_at: new Date(Date.now()-86400000).toISOString() },
            { id: 4, status: "pending",     profiles: { full_name: "Ana Gómez" },     dependencies: { name: "Psicología" },     created_at: new Date(Date.now()-172800000).toISOString() },
            { id: 5, status: "no_show",     profiles: { full_name: "Luis Martínez" }, dependencies: { name: "Enfermería" },     created_at: new Date(Date.now()-259200000).toISOString() },
          ] : recentActivity).map((row, i, arr) => {
            const meta = STATUS_META[row.status] || STATUS_META.pending;
            const Ic = meta.icon;
            const elapsed = Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000);
            const timeStr = elapsed < 60 ? `Hace ${elapsed} min` : elapsed < 1440 ? `Hace ${Math.round(elapsed/60)} h` : `Hace ${Math.round(elapsed/1440)} día(s)`;
            return (
              <div
                key={row.id}
                onClick={() => !IS_DEV && navigate(`/cita/${row.id}`)}
                style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", borderBottom: i < arr.length - 1 ? "1px solid #f9fafb" : "none", cursor: IS_DEV ? "default" : "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}
              >
                <div style={{ width: 36, height: 36, borderRadius: "9px", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ic size={16} color={meta.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Cita {meta.label.toLowerCase()} — {row.dependencies?.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.125rem" }}>{row.profiles?.full_name} · {timeStr}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Status del sistema ─── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem 2rem" }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#39a900", boxShadow: "0 0 0 3px #f0fce4", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>Sistema operativo · </span>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Bienestar SENA v1.0 — Todos los servicios en línea</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
            {now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
