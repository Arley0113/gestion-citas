// Solo activo en modo desarrollo (Vite: import.meta.env.DEV = true en `vite dev`, false en `vite build`)
export const DEV_ROLE = import.meta.env.DEV
  ? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null)
  : null;
