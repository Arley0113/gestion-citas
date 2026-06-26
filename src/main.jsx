import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./providers/AuthProvider";
import { AppointmentModalProvider } from "./providers/AppointmentModalContext";
import App from "./App";
import "./shared/styles/global.css";

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
