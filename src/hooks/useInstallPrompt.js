import { useEffect, useState, useCallback } from "react";

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

// Captura el evento beforeinstallprompt (Chrome/Edge) para mostrar un botón propio
// de "Instalar app" en vez de depender de que el usuario note el ícono del navegador.
// En navegadores que no disparan este evento (Safari/iOS, Firefox) canInstall
// simplemente nunca es true — no hay fallback, el usuario instala desde el menú nativo.
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredEvent(e);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredEvent) return;
    deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  }, [deferredEvent]);

  return { canInstall: !installed && !!deferredEvent, install };
}
