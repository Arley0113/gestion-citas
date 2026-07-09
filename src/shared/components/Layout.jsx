import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Calendar, Users, BarChart2,
  LogOut, Plus, Heart, UserCircle, Bell,
  CalendarDays, ClipboardList, FileText, Settings, HelpCircle,
  CalendarRange, Clock, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { useAppointmentModal } from "../../providers/AppointmentModalContext";
import { SenaLogo } from "./SenaLogo";
import { AppointmentModal } from "../../features/appointments/components/AppointmentModal";
import { supabase } from "../../lib/supabase";

const ROLE_LABELS = {
  APRENDIZ:       "Aprendiz",
  PSICOLOGIA:     "Psicología",
  ENFERMERIA:     "Enfermería",
  TRABAJO_SOCIAL: "Trabajo Social",
  COORDINACION:   "Coordinación",
  ADMINISTRADOR:  "Administrador",
  SUPERADMIN:     "Super Admin",
};

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined";

function NavGroup({ label }) {
  return (
    <div style={{
      padding: "0.875rem 0.875rem 0.25rem",
      fontSize: "0.5625rem",
      fontWeight: 700,
      color: "#4b5563",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    }}>
      {label}
    </div>
  );
}

function NavLink({ to, icon: Icon, label, active, badge }) {
  return (
    <Link
      to={to}
      className={`sidebar-nav-item ${active ? "active" : ""}`}
      style={{ position: "relative" }}
    >
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} strokeWidth={active ? 2.25 : 1.75} />
        {badge != null && badge > 0 && (
          <span style={{
            position: "absolute",
            top: -6, right: -8,
            minWidth: 16, height: 16,
            borderRadius: 8,
            background: "#ef4444",
            color: "white",
            fontSize: "0.5625rem",
            fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
            lineHeight: 1,
            border: "1.5px solid #0d1117",
          }}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span>{label}</span>
    </Link>
  );
}

export function Layout({ children }) {
  const location = useLocation();
  const { isProfessional, isCoordination, isAdmin, isAprendiz, profile, user, signOut } = useAuth();
  const { openModal } = useAppointmentModal();
  const [notifCount, setNotifCount] = useState(0);
  // No mostrar badge cuando el usuario ya está viendo las notificaciones
  const onNotifPage = location.pathname === "/notificaciones";
  const notifBadge  = IS_DEV ? 0 : (onNotifPage ? 0 : notifCount);

  const role     = profile?.roles?.name;
  const fullName = profile?.full_name || "Usuario";
  const initial  = fullName.charAt(0).toUpperCase();
  const roleName = ROLE_LABELS[role] || role || "Usuario";
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  useEffect(() => {
    if (!user || !isAprendiz?.()) return;
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed"])
      .gte("scheduled_date", today)
      .then(({ count }) => { if (!cancelled) setNotifCount(count || 0); });
    return () => { cancelled = true; };
  }, [user, location.pathname]);

  const renderNav = () => {
    if (isAdmin?.()) {
      return (
        <>
          <NavGroup label="Panel" />
          <NavLink to="/admin"          icon={LayoutDashboard} label="Panel admin"    active={location.pathname === "/admin"} />
          <NavLink to="/coordination"   icon={Calendar}        label="Citas"          active={isActive("/coordination")} />
          <NavGroup label="Gestión" />
          <NavLink to="/reportes"       icon={BarChart2}       label="Reportes"       active={isActive("/reportes")} />
          <NavLink to="/aprendices"     icon={Users}           label="Aprendices"     active={isActive("/aprendices")} />
          <NavLink to="/admin/usuarios" icon={Users}           label="Usuarios"       active={isActive("/admin/usuarios")} />
          <NavLink to="/admin/fichas"   icon={ShieldCheck}     label="Fichas activas" active={isActive("/admin/fichas")} />
          <NavGroup label="Mi cuenta" />
          <NavLink to="/perfil"         icon={UserCircle}      label="Mi perfil"      active={isActive("/perfil")} />
          <NavGroup label="Soporte" />
          <NavLink to="/ayuda"          icon={HelpCircle}      label="Ayuda"          active={isActive("/ayuda")} />
        </>
      );
    }
    if (isCoordination?.()) {
      return (
        <>
          <NavGroup label="Panel" />
          <NavLink to="/coordination"  icon={LayoutDashboard} label="Dashboard"      active={isActive("/coordination")} />
          <NavLink to="/reportes"      icon={BarChart2}       label="Reportes"       active={isActive("/reportes")} />
          <NavGroup label="Gestión" />
          <NavLink to="/aprendices"    icon={Users}           label="Aprendices"     active={isActive("/aprendices")} />
          <NavLink to="/admin/fichas"  icon={ShieldCheck}     label="Fichas activas" active={isActive("/admin/fichas")} />
          <NavGroup label="Mi cuenta" />
          <NavLink to="/perfil"        icon={UserCircle}      label="Mi perfil"      active={isActive("/perfil")} />
          <NavGroup label="Soporte" />
          <NavLink to="/ayuda"         icon={HelpCircle}      label="Ayuda"          active={isActive("/ayuda")} />
        </>
      );
    }
    if (isProfessional?.()) {
      return (
        <>
          <NavGroup label="Panel" />
          <NavLink to="/professional"              icon={LayoutDashboard} label="Inicio"           active={isActive("/professional") && !isActive("/professional/agenda") && !isActive("/professional/notas") && !isActive("/professional/estadisticas") && !isActive("/professional/horarios")} />
          <NavLink to="/professional/agenda"       icon={CalendarRange}   label="Mi agenda"        active={isActive("/professional/agenda")} />
          <NavGroup label="Gestión" />
          <NavLink to="/aprendices"                icon={Users}           label="Aprendices"       active={isActive("/aprendices")} />
          <NavLink to="/professional/notas"        icon={ClipboardList}   label="Mis notas"        active={isActive("/professional/notas")} />
          <NavGroup label="Análisis" />
          <NavLink to="/professional/estadisticas" icon={BarChart2}       label="Mis estadísticas" active={isActive("/professional/estadisticas")} />
          <NavGroup label="Mi cuenta" />
          <NavLink to="/perfil"                    icon={UserCircle}      label="Mi perfil"        active={isActive("/perfil")} />
          <NavLink to="/professional/horarios"     icon={Clock}           label="Horarios"         active={isActive("/professional/horarios")} />
          <NavGroup label="Soporte" />
          <NavLink to="/ayuda"                     icon={HelpCircle}      label="Ayuda"            active={isActive("/ayuda")} />
        </>
      );
    }
    // APRENDIZ
    return (
      <>
        <div style={{ padding: "0.5rem 0.75rem 0.625rem" }}>
          <button
            onClick={() => openModal()}
            style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.625rem 0.875rem",
              borderRadius: 9, border: "none",
              background: "#39a900", color: "white",
              cursor: "pointer", fontFamily: "var(--font-sans)",
              fontSize: "0.875rem", fontWeight: 700,
              width: "100%", textAlign: "left",
              boxShadow: "0 2px 8px rgba(57,169,0,0.3)",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#2d8600"}
            onMouseLeave={e => e.currentTarget.style.background = "#39a900"}
          >
            <Plus size={16} />
            <span>Agendar cita</span>
          </button>
        </div>
        <NavGroup label="Principal" />
        <NavLink to="/dashboard"      icon={LayoutDashboard} label="Mi espacio"     active={isActive("/dashboard")} />
        <NavLink to="/mis-citas"      icon={CalendarDays}    label="Mis citas"      active={isActive("/mis-citas")} />
        <NavGroup label="Bienestar" />
        <NavLink to="/mi-expediente"  icon={ClipboardList}   label="Mi expediente"  active={isActive("/mi-expediente")} />
        <NavLink to="/documentos"     icon={FileText}        label="Documentos"     active={isActive("/documentos")} />
        <NavGroup label="Mi cuenta" />
        <NavLink to="/perfil"         icon={UserCircle}      label="Mi perfil"      active={isActive("/perfil")} />
        <NavLink to="/notificaciones" icon={Bell}            label="Notificaciones" active={isActive("/notificaciones")} badge={notifBadge} />
        <NavLink to="/configuracion"  icon={Settings}        label="Configuración"  active={isActive("/configuracion")} />
        <NavGroup label="Soporte" />
        <NavLink to="/ayuda"          icon={HelpCircle}      label="Ayuda"          active={isActive("/ayuda")} />
      </>
    );
  };

  const renderMobileNav = () => {
    if (isAdmin?.()) {
      return [
        { to: "/admin",          icon: LayoutDashboard, label: "Admin" },
        { to: "/coordination",   icon: Calendar,        label: "Citas" },
        { to: "/reportes",       icon: BarChart2,       label: "Reportes" },
        { to: "/admin/usuarios", icon: Users,           label: "Usuarios" },
      ];
    }
    if (isCoordination?.()) {
      return [
        { to: "/coordination", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/aprendices",   icon: Users,           label: "Aprendices" },
        { to: "/reportes",     icon: BarChart2,       label: "Reportes" },
        { to: "/admin/fichas", icon: ShieldCheck,     label: "Fichas" },
      ];
    }
    if (isProfessional?.()) {
      return [
        { to: "/professional",              icon: LayoutDashboard, label: "Inicio" },
        { to: "/professional/agenda",       icon: CalendarRange,   label: "Agenda" },
        { to: "/aprendices",                icon: Users,           label: "Aprendices" },
        { to: "/professional/estadisticas", icon: BarChart2,       label: "Stats" },
      ];
    }
    return [
      { to: "/dashboard",      icon: LayoutDashboard, label: "Inicio" },
      { to: "/mis-citas",      icon: CalendarDays,    label: "Mis citas" },
      { to: "/notificaciones", icon: Bell,            label: "Avisos", badge: notifBadge },
      { to: "/perfil",         icon: UserCircle,      label: "Perfil" },
    ];
  };

  const mobileItems = renderMobileNav();

  return (
    <div className="app-wrapper">
      <style>{`
        @media (max-width: 768px) {
          .kpi-grid-4    { grid-template-columns: repeat(2, 1fr) !important; }
          .kpi-grid-2    { grid-template-columns: 1fr !important; }
          .main-two-col  { flex-direction: column !important; }
          .chart-row     { flex-direction: column !important; }
          .hide-mobile   { display: none !important; }
          .full-mobile   { width: 100% !important; max-width: 100% !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .stats-grid    { grid-template-columns: repeat(2, 1fr) !important; }
          .app-main      { padding-bottom: 70px; }
        }
        @media (max-width: 480px) {
          .kpi-grid-4  { grid-template-columns: 1fr 1fr !important; }
          .stats-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (min-width: 769px) {
          .bottom-nav  { display: none !important; }
        }
      `}</style>

      {/* ─── Sidebar desktop ─── */}
      <aside className="sidebar">

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <SenaLogo size={26} />
          </div>
          <div>
            <div className="sidebar-brand-name">Bienestar SENA</div>
            <div className="sidebar-brand-sub">Sistema de citas</div>
          </div>
        </div>

        {/* Rol badge */}
        <div style={{ padding: "0.625rem 0.75rem 0" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            padding: "0.25rem 0.625rem",
            background: "rgba(57,169,0,0.12)",
            borderRadius: 20,
            fontSize: "0.6875rem", fontWeight: 700,
            color: "#39a900",
          }}>
            <Heart size={10} fill="#39a900" />
            {roleName}
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" style={{ marginTop: "0.5rem" }}>
          {renderNav()}
        </nav>

        {/* Footer / User */}
        <div className="sidebar-footer">
          <div style={{ marginBottom: "0.5rem", padding: "0 0.25rem" }}>
            <hr style={{ border: "none", borderTop: "1px solid #1f2937", margin: "0 0 0.5rem" }} />
            <button
              onClick={signOut}
              style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.5rem 0.625rem",
                borderRadius: 7, border: "none",
                background: "transparent", color: "#6b7280",
                cursor: "pointer", fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem", fontWeight: 500,
                width: "100%", textAlign: "left",
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#9ca3af"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; }}
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{fullName}</div>
              <div className="sidebar-user-role">{roleName}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="app-main">
        {children}
      </main>

      {/* ─── Bottom nav mobile ─── */}
      <nav className="bottom-nav">
        {mobileItems.map(({ to, icon: Icon, label, badge }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              style={{ position: "relative" }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={21} strokeWidth={active ? 2.5 : 1.75} />
                {badge != null && badge > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -7,
                    minWidth: 15, height: 15, borderRadius: 8,
                    background: "#ef4444", color: "white",
                    fontSize: "0.5rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 2px",
                  }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Botón especial "+" para APRENDIZ en mobile */}
        {isAprendiz?.() && (
          <button
            onClick={() => openModal()}
            className="bottom-nav-item"
            style={{
              border: "none", cursor: "pointer",
              background: "transparent",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#39a900",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(57,169,0,0.35)",
              marginBottom: 2,
            }}>
              <Plus size={20} color="white" />
            </div>
            <span style={{ color: "#39a900", fontWeight: 700, fontSize: "0.625rem" }}>Agendar</span>
          </button>
        )}
      </nav>

      {/* ─── Modal global ─── */}
      <AppointmentModal />
    </div>
  );
}
