import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ROLE_PERMISSIONS } from "../shared/rbac/permissions";
import { toast } from "sonner";

const AuthContext = createContext(null);

// DEV preview — constante de módulo (no cambia durante el ciclo de vida)
const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

const DEV_PROFILES = {
  aprendiz:     { full_name: "Juan Pérez",     document_number: "1234567", dependency_id: 1,    onboarding_completed: true, roles: { name: "APRENDIZ" },       dependencies: { name: "Psicología" } },
  professional: { full_name: "Carolina R.",    document_number: "9876543", dependency_id: 1,    onboarding_completed: true, roles: { name: "PSICOLOGIA" },      dependencies: { name: "Psicología" } },
  coordination: { full_name: "Coordinadora",   document_number: "1111111", dependency_id: null, onboarding_completed: true, roles: { name: "COORDINACION" },    dependencies: null },
  admin:        { full_name: "Admin SENA",     document_number: "2222222", dependency_id: null, onboarding_completed: true, roles: { name: "ADMINISTRADOR" },   dependencies: null },
  superadmin:   { full_name: "Super Admin",    document_number: "3333333", dependency_id: null, onboarding_completed: true, roles: { name: "SUPERADMIN" },      dependencies: null },
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

export function AuthProvider({ children }) {
  const isDev     = !!(DEV_ROLE && DEV_PROFILES[DEV_ROLE]);
  const devProfile = isDev ? DEV_PROFILES[DEV_ROLE] : null;
  const devUser    = isDev ? { id: "dev-user", email: "dev@sena.edu.co" } : null;

  const [user,    setUser]    = useState(devUser);
  const [profile, setProfile] = useState(devProfile);
  const [loading, setLoading] = useState(!isDev);
  const [error,   setError]   = useState(null);

  const fetchProfile = useCallback(async (userId, isRetry = false) => {
    if (isDev) return devProfile;
    try {
      const { data, error } = await Promise.race([
        supabase
          .from("profiles")
          .select("*, roles(name, label), dependencies(name)")
          .eq("id", userId)
          .maybeSingle(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12000)
        ),
      ]);
      if (error) throw error;
      if (!data) throw new Error("Perfil no encontrado");
      setProfile(data);
      return data;
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error cargando perfil:", err);
      const isMissing = err.message?.includes("Perfil no encontrado");

      if (!isMissing) {
        // Timeout o cualquier otro error transitorio (red, hipo del servidor, etc.)
        // — reintentamos una vez antes de rendirnos. Sin esto, `profile` se quedaba
        // en null y el timer de "atascado" en ProtectedRoute terminaba cerrando la
        // sesión igual a los 7s, aunque aquí ya no forcemos el signOut directamente.
        if (!isRetry) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          return fetchProfile(userId, true);
        }
        toast.error("Conexión lenta. Si ves problemas, recarga la página.", { duration: 6000 });
        return "timeout"; // señal: no hacer signOut
      }

      // Perfil confirmadamente inexistente (la consulta respondió sin error y sin fila).
      setProfile(null);
      const message = "No se encontró tu perfil en Bienestar SENA. Contacta al administrador.";
      setError(message);
      toast.error(message, { duration: 5000 });
      return null; // señal: perfil inexistente → sí hacer signOut
    }
  }, [isDev, devProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user || isDev) return;
    return fetchProfile(user.id);
  }, [user, isDev, fetchProfile]);

  useEffect(() => {
    if (isDev) return;

    let mounted = true;
    const hasAuthHash = typeof window !== "undefined" && (
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("type=invite") ||
      window.location.hash.includes("type=recovery")
    );
    // Fallback de seguridad por si el evento INITIAL_SESSION tarda
    const fallbackTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, hasAuthHash ? 8_000 : 3_000);

    // onAuthStateChange es la única fuente de verdad — elimina competencia de locks
    // supabase-js dispara INITIAL_SESSION al suscribirse y luego los eventos subsiguientes
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        clearTimeout(fallbackTimer);
        if (mounted) setLoading(false);
        window.location.href = "/reset-password" + window.location.hash;
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // TOKEN_REFRESHED solo actualiza el token; el perfil no cambia
        if (event !== "TOKEN_REFRESHED") {
          const profileData = await fetchProfile(session.user.id);
          if (!mounted) return;
          // Solo cerrar sesión si el perfil definitivamente no existe (null).
          // "timeout" = red lenta → dejar al usuario activo.
          if (profileData === null) {
            await Promise.race([
              supabase.auth.signOut().catch(() => {}),
              new Promise(resolve => setTimeout(resolve, 2000)),
            ]);
            setUser(null);
            setProfile(null);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }

      clearTimeout(fallbackTimer);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      listener.subscription.unsubscribe();
    };
  }, [isDev, fetchProfile]);

  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Establecer user inmediatamente para UX fluida; profile carga vía SIGNED_IN event
      const sessionUser = data?.user || data?.session?.user;
      if (sessionUser) setUser(sessionUser);
      return { success: true, data };
    } catch (err) {
      const msg = err.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos"
        : err.message || "No se pudo iniciar sesión. Intenta de nuevo.";
      setError(msg);
      if (import.meta.env.DEV) console.error("signIn error:", err);
      return { success: false, error: msg };
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name?.trim(),
            document_number: userData.document_number?.trim(),
          },
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      if (import.meta.env.DEV) console.warn("signOut:", err.message);
    }
    window.location.href = "/login";
  };

  const hasRole = (requiredRoles) => {
    if (!profile?.roles?.name) return false;
    return Array.isArray(requiredRoles)
      ? requiredRoles.includes(profile.roles.name)
      : profile.roles.name === requiredRoles;
  };

  const can = (permission) =>
    (ROLE_PERMISSIONS[profile?.roles?.name] || []).includes(permission);

  const isAdmin        = () => hasRole(["SUPERADMIN", "ADMINISTRADOR"]);
  const isCoordination = () => hasRole(["COORDINACION", "SUPERADMIN", "ADMINISTRADOR"]);
  const isProfessional = () => hasRole(["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL"]);
  const isAprendiz     = () => hasRole("APRENDIZ");

  const needsOnboarding = () =>
    !isDev && user && profile && !profile.onboarding_completed && isAprendiz();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9f7" }}>
        <div>
          <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 0.875rem" }} />
          <p style={{ fontSize: "0.8125rem", color: "#6b7280", textAlign: "center", fontFamily: "var(--font-sans)" }}>Iniciando sesión...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, error,
      signIn, signUp, signOut, refreshProfile,
      hasRole, can,
      isAdmin, isCoordination, isProfessional, isAprendiz,
      needsOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
