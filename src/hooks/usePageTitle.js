import { useEffect } from "react";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Bienestar SENA` : "Bienestar SENA";
    return () => { document.title = "Bienestar SENA"; };
  }, [title]);
}
