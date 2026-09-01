import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./providers/AuthProvider";
import { AppointmentModalProvider } from "./providers/AppointmentModalContext";
import App from "./App";
import "./shared/styles/global.css";

// Tras un deploy, una pestaña ya abierta con el index.html viejo puede pedir
// un chunk (import() de una ruta lazy) cuyo nombre con hash ya no existe en
// el servidor. Vercel reescribe esa ruta a index.html (SPA rewrite), el
// navegador rechaza el HTML como módulo ES, y Vite dispara este evento en
// vez de dejar el error sin capturar — antes eso significaba pantalla en
// blanco. La solución es recargar una vez para traer el index.html nuevo;
// el guard en sessionStorage evita un loop si algo más sigue fallando.
window.addEventListener("vite:preloadError", () => {
  const key = "vite-preload-reloaded";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppointmentModalProvider>
          <App />
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: { fontFamily: "var(--font-sans)", fontSize: "0.875rem" },
            }}
          />
        </AppointmentModalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Si esto carga bien, liberar el guard — así un fallo genuino más adelante
// en la misma pestaña (no relacionado con el deploy que causó el primero)
// todavía dispara un reintento.
setTimeout(() => sessionStorage.removeItem("vite-preload-reloaded"), 10_000);
