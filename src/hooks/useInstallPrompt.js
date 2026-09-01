import { useEffect, useState, useCallback } from "react";

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const isIOS = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isAndroid = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

// Captura el evento beforeinstallprompt (Chrome/Edge) para mostrar un botón propio
// de "Instalar app" en vez de depender de que el usuario note el ícono del navegador.
// En navegadores que no disparan este evento (Safari/iOS siempre; Chrome/Android
// también puede no dispararlo si ya se descartó antes o no se cumplió su heurística
// de "engagement") canInstall nunca llega a true — Layout.jsx debe mostrar
// instrucciones manuales (needsManualInstall) en ese caso, no esconder la opción.
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

  return {
    canInstall: !installed && !!deferredEvent,
    install,
    installed,
    // El navegador nunca ofreció (o nunca ofrecerá) el prompt propio, pero la app
    // sigue sin estar instalada — hay que mostrar instrucciones manuales en vez
    // de no mostrar nada.
    needsManualInstall: !installed && !deferredEvent,
  };
}
