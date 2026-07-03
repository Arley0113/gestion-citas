import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../providers/AuthProvider";
import { Layout } from "../shared/components/Layout";

const Login        = lazy(() => import("../features/auth/pages/Login"));
const Onboarding   = lazy(() => import("../features/auth/pages/Onboarding"));
const Unauthorized = lazy(() => import("../shared/components/Unauthorized"));

const AprendizDashboard     = lazy(() => import("../features/appointments/pages/AprendizDashboard"));
const AppointmentConfirmed  = lazy(() => import("../features/appointments/pages/AppointmentConfirmed"));
const AppointmentDetail     = lazy(() => import("../features/appointments/pages/AppointmentDetail"));
const AttentionInProgress   = lazy(() => import("../features/appointments/pages/AttentionInProgress"));
const AttentionResult       = lazy(() => import("../features/appointments/pages/AttentionResult"));
const AprendizHistory       = lazy(() => import("../features/appointments/pages/AprendizHistory"));

const ProfessionalDashboard = lazy(() => import("../features/appointments/pages/ProfessionalDashboard"));
const CoordinationDashboard = lazy(() => import("../features/dashboard/pages/CoordinationDashboard"));
const AdminDashboard        = lazy(() => import("../features/admin/pages/AdminDashboard"));
const AprendicesList        = lazy(() => import("../features/appointments/pages/AprendicesList"));
const ProfilePage           = lazy(() => import("../features/auth/pages/ProfilePage"));
const NotificationsPage     = lazy(() => import("../features/auth/pages/NotificationsPage"));
const RegisterPage          = lazy(() => import("../features/auth/pages/RegisterPage"));
const ResetPasswordPage     = lazy(() => import("../features/auth/pages/ResetPasswordPage"));
const CompleteProfilePage   = lazy(() => import("../features/auth/pages/CompleteProfilePage"));
const StaffInvitePage          = lazy(() => import("../features/admin/pages/StaffInvitePage"));
const DependenciasPage         = lazy(() => import("../features/admin/pages/DependenciasPage"));
const ActividadPage            = lazy(() => import("../features/admin/pages/ActividadPage"));
const RolesPage                = lazy(() => import("../features/admin/pages/RolesPage"));
const ConfiguracionAdminPage   = lazy(() => import("../features/admin/pages/ConfiguracionAdminPage"));
const ReportsDashboard      = lazy(() => import("../features/reports/pages/ReportsDashboard"));

// Aprendiz — páginas nuevas
const MisCitasPage         = lazy(() => import("../features/appointments/pages/MisCitasPage"));
const MiExpedientePage     = lazy(() => import("../features/appointments/pages/MiExpedientePage"));
const DocumentosPage       = lazy(() => import("../features/aprendiz/pages/DocumentosPage"));
const ConfiguracionPage    = lazy(() => import("../features/aprendiz/pages/ConfiguracionPage"));
const AyudaPage            = lazy(() => import("../features/shared/pages/AyudaPage"));

// Profesional — páginas nuevas
const ProfessionalAgendaPage = lazy(() => import("../features/professional/pages/ProfessionalAgendaPage"));
const ProfessionalNotesPage  = lazy(() => import("../features/professional/pages/ProfessionalNotesPage"));
const ProfessionalStatsPage  = lazy(() => import("../features/professional/pages/ProfessionalStatsPage"));
const HorariosPage           = lazy(() => import("../features/professional/pages/HorariosPage"));

const ALL_STAFF = ["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL","COORDINACION","ADMINISTRADOR","SUPERADMIN"];

const Fallback = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f5f7fa", fontFamily: "var(--font-sans)" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 0.875rem" }} />
      <p style={{ fontSize: "0.8125rem", color: "#9ca3af", margin: 0 }}>Cargando...</p>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export function AppRoutes() {
  const { isAdmin, isCoordination, isProfessional, isAprendiz, needsOnboarding } = useAuth();
  const location = useLocation();

  const getHomeRoute = () => {
    if (isAdmin())        return "/admin";
    if (isCoordination()) return "/coordination";
    if (isProfessional()) return "/professional";
    return "/dashboard";
  };

  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* PÚBLICAS */}
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized"   element={<Unauthorized />} />

        {/* ONBOARDING */}
        <Route path="/onboarding" element={
          <ProtectedRoute><Onboarding /></ProtectedRoute>
        } />

        {/* APRENDIZ */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Layout><AprendizDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/perfil" element={
          <ProtectedRoute requiredRoles={["APRENDIZ", ...ALL_STAFF]}>
            <Layout><ProfilePage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/notificaciones" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Layout><NotificationsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/mis-citas" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Layout><MisCitasPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/mi-expediente" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Layout><MiExpedientePage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/documentos" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Layout><DocumentosPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/configuracion" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Layout><ConfiguracionPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/ayuda" element={
          <ProtectedRoute requiredRoles={["APRENDIZ", ...ALL_STAFF]}>
            <Layout><AyudaPage /></Layout>
          </ProtectedRoute>
        } />
        {/* /nueva-cita redirige al dashboard donde se abre el modal */}
        <Route path="/nueva-cita" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <Navigate to={`/dashboard${location.search || ""}`} replace />
          </ProtectedRoute>
        } />
        <Route path="/cita-confirmada" element={
          <ProtectedRoute requiredRoles="APRENDIZ">
            <AppointmentConfirmed />
          </ProtectedRoute>
        } />

        {/* PROFESIONAL */}
        <Route path="/professional" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <Layout><ProfessionalDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/aprendices" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL","COORDINACION","ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><AprendicesList /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/professional/agenda" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <Layout><ProfessionalAgendaPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/professional/notas" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <Layout><ProfessionalNotesPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/professional/estadisticas" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <Layout><ProfessionalStatsPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/professional/horarios" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <Layout><HorariosPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/cita/:id/atencion" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <AttentionInProgress />
          </ProtectedRoute>
        } />
        <Route path="/cita/:id/resultado" element={
          <ProtectedRoute requiredRoles={["PSICOLOGIA","ENFERMERIA","TRABAJO_SOCIAL"]}>
            <AttentionResult />
          </ProtectedRoute>
        } />

        {/* CITA DETALLE — aprendiz (solo lectura) + staff */}
        <Route path="/cita/:id" element={
          <ProtectedRoute requiredRoles={["APRENDIZ", ...ALL_STAFF]}>
            <AppointmentDetail />
          </ProtectedRoute>
        } />

        {/* HISTORIAL APRENDIZ — solo staff */}
        <Route path="/aprendiz/:id/historial" element={
          <ProtectedRoute requiredRoles={ALL_STAFF}>
            <AprendizHistory />
          </ProtectedRoute>
        } />

        {/* COORDINACIÓN */}
        <Route path="/coordination" element={
          <ProtectedRoute requiredRoles={["COORDINACION","ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><CoordinationDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/reportes" element={
          <ProtectedRoute requiredRoles={["COORDINACION","ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><ReportsDashboard /></Layout>
          </ProtectedRoute>
        } />

        {/* COMPLETAR PERFIL — staff tras aceptar invitación */}
        <Route path="/completar-perfil" element={
          <ProtectedRoute>
            <CompleteProfilePage />
          </ProtectedRoute>
        } />

        {/* ADMIN */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRoles={["ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/invitar" element={
          <ProtectedRoute requiredRoles={["ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><StaffInvitePage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/dependencias" element={
          <ProtectedRoute requiredRoles={["ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><DependenciasPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/actividad" element={
          <ProtectedRoute requiredRoles={["ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><ActividadPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/roles" element={
          <ProtectedRoute requiredRoles={["ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><RolesPage /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/configuracion" element={
          <ProtectedRoute requiredRoles={["ADMINISTRADOR","SUPERADMIN"]}>
            <Layout><ConfiguracionAdminPage /></Layout>
          </ProtectedRoute>
        } />

        {/* HOME — redirige según rol */}
        <Route path="/" element={
          <ProtectedRoute>
            {needsOnboarding()
              ? <Navigate to={`/onboarding${location.search || ""}`} replace />
              : <Navigate to={`${getHomeRoute()}${location.search || ""}`} replace />
            }
          </ProtectedRoute>
        } />

        <Route path="*" element={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "var(--font-sans)", gap: "0.5rem" }}>
            <div style={{ fontSize: "3rem", fontWeight: 800, color: "#e5e7eb" }}>404</div>
            <div style={{ fontSize: "1rem", color: "#9ca3af" }}>Página no encontrada</div>
          </div>
        } />
      </Routes>
    </Suspense>
  );
}
