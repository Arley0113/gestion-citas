import { useLocation, useNavigate } from "react-router-dom";
import { Check, Calendar, Clock, MapPin, Bell, Shield, Printer, Home, ChevronRight, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { SenaLogo } from "../../../shared/components/SenaLogo";

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const timeLabel = (t) => {
  if (!t) return "—";
  const [h] = t.split(":").map(Number);
  return h < 12 ? `${h}:00 a. m.` : h === 12 ? "12:00 p. m." : `${h-12}:00 p. m.`;
};

export default function AppointmentConfirmed() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const apt       = state?.appointment;

  const depName  = apt?.dependencies?.name || "Psicología";
  const dateStr  = apt?.scheduled_date
    ? format(parseISO(apt.scheduled_date), "EEEE d 'de' MMMM, yyyy", { locale: es })
    : "Jueves 10 de julio, 2026";
  const timeStr  = timeLabel(apt?.scheduled_time || "09:00");
  const radicado = apt?.id ? `APT-${String(apt.id).padStart(6, "0")}` : "APT-2026-0847";

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column" }}>

      {/* ─── Header institucional ─── */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: "8px", background: "#39a900", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SenaLogo size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1a202c", letterSpacing: "-0.01em" }}>
                Bienestar SENA
              </div>
              <div style={{ fontSize: "0.625rem", color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Servicio Nacional de Aprendizaje
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(DEV_ROLE ? `/dashboard?preview=${DEV_ROLE}` : "/")}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.8125rem", fontWeight: 500, color: "#4a5568", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            <ArrowLeft size={13} />
            Inicio
          </button>
        </div>
      </div>

      {/* ─── Contenido ─── */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "2.5rem 1.5rem 4rem" }}>
        <div style={{ width: "100%", maxWidth: 600 }}>

          {/* Tarjeta comprobante */}
          <div style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)" }}>

            {/* ─── Encabezado verde comprobante ─── */}
            <div style={{ background: "linear-gradient(135deg, #1a6b00 0%, #39a900 100%)", padding: "2rem 2.25rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", bottom: -40, right: 60, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={22} color="white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.375rem", fontWeight: 800, color: "white", letterSpacing: "-0.025em", fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
                      Cita confirmada
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.75)", marginTop: "0.25rem" }}>
                      Tu solicitud fue registrada exitosamente
                    </div>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "0.625rem 1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={13} color="rgba(255,255,255,0.7)" />
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", fontWeight: 500, letterSpacing: "0.02em" }}>Radicado:</span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "white", letterSpacing: "0.05em", fontFamily: "monospace" }}>
                    {radicado}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Detalles ─── */}
            <div style={{ padding: "1.75rem 2.25rem" }}>
              <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                Detalles de la cita
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { icon: Calendar, label: "Servicio",  value: depName },
                  { icon: Calendar, label: "Fecha",     value: dateStr, cap: true },
                  { icon: Clock,    label: "Hora",      value: `${timeStr} — Duración 60 min` },
                  { icon: MapPin,   label: "Lugar",     value: "Bienestar — Bloque 1, Sede principal" },
                ].map(({ icon: Icon, label, value, cap }, i, arr) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.875rem 0", borderBottom: i < arr.length - 1 ? "1px solid #f7fafc" : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#f7faf0", border: "1px solid #e8f5e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color="#39a900" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.6875rem", color: "#a0aec0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.125rem" }}>{label}</div>
                      <div style={{ fontSize: "0.9375rem", color: "#2d3748", fontWeight: 500, textTransform: cap ? "capitalize" : "none" }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Separador ticket */}
              <div style={{ margin: "1.5rem -2.25rem", borderTop: "2px dashed #e8f5e0", position: "relative" }}>
                <div style={{ position: "absolute", left: -10, top: -10, width: 20, height: 20, borderRadius: "50%", background: "#f0f4f8" }} />
                <div style={{ position: "absolute", right: -10, top: -10, width: 20, height: 20, borderRadius: "50%", background: "#f0f4f8" }} />
              </div>

              {/* Aviso */}
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "1rem 1.25rem", display: "flex", gap: "0.875rem", marginBottom: "1.5rem" }}>
                <Bell size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400e", marginBottom: "0.25rem" }}>
                    Presentar este comprobante
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#b45309", lineHeight: 1.55 }}>
                    Muestra este radicado o tu documento de identidad al inicio de la atención. Llega 5 minutos antes de tu hora.
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  onClick={() => navigate(DEV_ROLE ? `/dashboard?preview=${DEV_ROLE}` : "/")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.875rem", background: "#39a900", color: "white", border: "none", borderRadius: "10px", fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2d8600"}
                  onMouseLeave={e => e.currentTarget.style.background = "#39a900"}
                >
                  <Home size={16} /> Ir al inicio
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                  <button
                    onClick={() => navigate(DEV_ROLE ? `/dashboard?preview=${DEV_ROLE}` : "/dashboard")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", padding: "0.75rem", background: "white", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, color: "#4a5568", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#39a900"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                  >
                    <Calendar size={14} /> Agendar otra
                  </button>
                  <button
                    onClick={() => window.print()}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", padding: "0.75rem", background: "white", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, color: "#4a5568", cursor: "pointer", fontFamily: "var(--font-sans)", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#a0aec0"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                  >
                    <Printer size={14} /> Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Footer institucional */}
            <div style={{ background: "#f7faf0", borderTop: "1px solid #e8f5e0", padding: "1rem 2.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "0.6875rem", color: "#718096", lineHeight: 1.5 }}>
                SENA · Bienestar Institucional<br />
                República de Colombia
              </div>
              <div style={{ fontSize: "0.625rem", color: "#a0aec0", textAlign: "right" }}>
                Documento oficial del sistema<br />
                No requiere firma para validación
              </div>
            </div>
          </div>

          {/* Próximo paso */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem 1.5rem", marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f7faf0", border: "1px solid #e8f5e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ChevronRight size={16} color="#39a900" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#2d3748" }}>Revisa tus citas programadas</div>
              <div style={{ fontSize: "0.8125rem", color: "#718096", marginTop: "0.125rem" }}>
                Consulta el historial y estado de tus citas desde tu panel de inicio.
              </div>
            </div>
            <button
              onClick={() => navigate(DEV_ROLE ? `/dashboard?preview=${DEV_ROLE}` : "/")}
              style={{ padding: "0.5rem 0.875rem", background: "#f7faf0", border: "1px solid #d4edda", borderRadius: "7px", fontSize: "0.8125rem", fontWeight: 600, color: "#39a900", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
            >
              Ver panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
