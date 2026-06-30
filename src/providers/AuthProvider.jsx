import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ROLE_PERMISSIONS } from "../shared/rbac/permissions";
import { toast } from "sonner";

const AUTH_LOCK_MAX_RETRIES = 3;
const AUTH_LOCK_BASE_DELAY = 250;

const isAuthLockError = (err) => {
  const msg = err?.message || "";
  return msg.includes("Lock \"lock:sb-") && msg.includes("auth-token") && msg.includes("stole it");
};

const retryAuthRequest = async (fn) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= AUTH_LOCK_MAX_RETRIES || !isAuthLockError(err)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, AUTH_LOCK_BASE_DELAY * attempt));
    }
  }
};

const withTimeout = async (promise, ms, label = "operation") => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const AuthContext = createContext(null);
let pendingSessionCheck = null;

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

  // Hooks siempre en el mismo orden — sin retorno condicional antes de hooks
  const [user,    setUser]    = useState(devUser);
  const [profile, setProfile] = useState(devProfile);
  const [loading, setLoading] = useState(!isDev);
  const [error,   setError]   = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (isDev) return devProfile;
    try {
      const { data, error } = await retryAuthRequest(() =>
        supabase
          .from("profiles")
          .select("*, roles(name), dependencies(name)")
          .eq("id", userId)
          .single()
      );
      if (error) throw error;
      if (!data) throw new Error("Perfil no encontrado");
      setProfile(data);
      return data;
    } catch (err) {
      console.error("Error cargando perfil:", err);
      setProfile(null);
      const isMissingProfile = err.message.includes("Perfil no encontrado");
      const message = isMissingProfile
        ? "No se encontró tu perfil en Bienestar SENA. Contacta al administrador."
        : "No se pudo cargar tu perfil. Intenta de nuevo.";
      setError(message);
      toast.error(message);
      return null;
    }
  }, [isDev, devProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user || isDev) return;
    return fetchProfile(user.id);
  }, [user, isDev, fetchProfile]);

  useEffect(() => {
    if (isDev) return; // modo DEV — no conectar Supabase

    let mounted = true;
    const TIMEOUT = 7_000;
    const FAST_FALLBACK = 2_000;
    const fallbackTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, FAST_FALLBACK);

    const checkSession = async () => {
      try {
        const { data, error } = await withTimeout(
          retryAuthRequest(() => supabase.auth.getUser()),
          TIMEOUT,
          "cached user"
        );
        if (error) throw error;

        const authUser = data?.user || null;
        if (authUser) {
          setUser(authUser);
          const profileData = await fetchProfile(authUser.id);
          if (!profileData) {
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn("Session init failed:", err.message);
        setUser(null);
        setProfile(null);
        setError(null);
      } finally {
        clearTimeout(fallbackTimer);
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        window.location.href = "/reset-password" + window.location.hash;
        return;
      }
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (!profileData) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setProfile(null);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [isDev, fetchProfile]);

  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await retryAuthRequest(() =>
        supabase.auth.signInWithPassword({ email, password })
      );
      if (error) throw error;
      const sessionUser = data?.user || data?.session?.user;
      if (sessionUser) {
        setUser(sessionUser);
        const profileData = await fetchProfile(sessionUser.id);
        if (!profileData) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setProfile(null);
          return { success: false, error: "No se encontró tu perfil en Bienestar SENA. Contacta al administrador." };
        }
      }
      return { success: true, data };
    } catch (err) {
      const msg = err.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos"
        : err.message;
      setError(msg);
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
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      setError(err.message);
    }
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
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center", fontFamily: "var(--font-sans)" }}>Iniciando sesión...</p>
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
