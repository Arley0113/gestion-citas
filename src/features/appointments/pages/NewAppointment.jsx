import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Brain, Heart, Users, Check, ChevronLeft, ChevronRight, Info, Clock, Calendar, MapPin } from "lucide-react";
import {
  addDays, format, isWeekend, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  addMonths, subMonths, isBefore, startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { useAppointments } from "../hooks/useAppointments";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

const SERVICES = [
  { id: null, key: "PSICOLOGIA",    icon: Brain, label: "Psicología",    desc: "Apoyo emocional y bienestar mental",  color: "var(--psi-color)", bg: "var(--psi-bg)" },
  { id: null, key: "ENFERMERIA",    icon: Heart, label: "Enfermería",    desc: "Atención en salud y orientación médica", color: "var(--enf-color)", bg: "var(--enf-bg)" },
  { id: null, key: "TRABAJO_SOCIAL",icon: Users, label: "Trabajo Social",desc: "Apoyo social y acompañamiento",        color: "var(--ts-color)",  bg: "var(--ts-bg)"  },
];

const HOURS = ["08:00","09:00","10:00","11:00","14:00","15:00","16:00","17:00"];
const WEEK_DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function formatHour(h) {
  const [hr] = h.split(":").map(Number);
  return hr < 12 ? `${hr}:00 a.m.` : hr === 12 ? "12:00 p.m." : `${hr - 12}:00 p.m.`;
}

function buildCalendarDays(month) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days  = [];
  let d = start;
  while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }
  return days;
}

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

function DateCalendar({ selected, onChange }) {
  const today = startOfDay(new Date());
  const minDate = addDays(today, 1);
  const [month, setMonth] = useState(startOfMonth(minDate));
  const days = buildCalendarDays(month);

  const isDisabled = (d) => isBefore(d, minDate) || isWeekend(d) || !isSameMonth(d, month);
  const isAvailable = (d) => !isBefore(d, minDate) && !isWeekend(d) && isSameMonth(d, month);
  const isSelected  = (d) => selected && isSameDay(d, selected);
  const isToday     = (d) => isSameDay(d, today);

  return (
    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", maxWidth: 360 }}>
      {/* Navegación mes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          style={{ width: 32, height: 32, borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>
          {format(month, "MMMM yyyy", { locale: es })}
        </div>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          style={{ width: 32, height: 32, borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Días de la semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0.625rem 0.875rem 0.25rem" }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", padding: "0.25rem 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0.25rem 0.875rem 0.875rem", gap: "2px" }}>
        {days.map((d, i) => {
          const sel  = isSelected(d);
          const avl  = isAvailable(d);
          const dis  = isDisabled(d);
          const tod  = isToday(d);
          return (
            <button
              key={i}
              onClick={() => avl && onChange(d)}
              disabled={dis}
              style={{
                height: 38, borderRadius: "8px", border: "none",
                fontSize: "0.875rem", fontWeight: sel ? 700 : avl ? 500 : 400,
                cursor: avl ? "pointer" : "default",
                background: sel ? "#39a900" : "transparent",
                color: sel ? "white" : dis ? "#d1d5db" : "#111827",
                transition: "background 0.12s, color 0.12s",
                position: "relative",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={e => { if (avl && !sel) e.currentTarget.style.background = "#f0fce4"; }}
              onMouseLeave={e => { if (avl && !sel) e.currentTarget.style.background = "transparent"; }}
            >
              {format(d, "d")}
              {tod && !sel && (
                <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#39a900" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ padding: "0.625rem 1.25rem 0.875rem", borderTop: "1px solid #f9fafb", display: "flex", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <div style={{ width: 12, height: 12, borderRadius: "3px", background: "#39a900" }} />
          <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>Seleccionado</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#39a900" }} />
          <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>Hoy</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.6875rem", color: "#d1d5db", fontWeight: 500 }}>15</span>
          <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>No disponible</span>
        </div>
      </div>
    </div>
  );
}

export default function NewAppointment() {
  const navigate = useNavigate();
  const { createAppointment, isCreating } = useAppointments();
  const [services, setServices] = useState(SERVICES);
  const [sel, setSel] = useState({ serviceKey: null, depId: null, date: null, time: null, reason: "" });

  useEffect(() => {
    if (DEV_ROLE) return;
    supabase.from("dependencies").select("*").then(({ data }) => {
      if (!data) return;
      const normalize = (str) => str.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
      setServices(SERVICES.map(s => {
        const keyword = normalize(s.key.split("_")[0]);
        const match = data.find(d => normalize(d.name).includes(keyword));
        return match ? { ...s, id: match.id } : s;
      }));
    });
  }, []);

  const set = (k, v) => setSel(s => ({ ...s, [k]: v }));
  const canSubmit = sel.serviceKey && sel.date && sel.time && !isCreating;
  const selSvc = services.find(s => s.key === sel.serviceKey);

  const steps = [
    { label: "Servicio",  done: !!sel.serviceKey },
    { label: "Fecha",     done: !!sel.date },
    { label: "Hora",      done: !!sel.time },
    { label: "Confirmar", done: canSubmit },
  ];

  const handleSubmit = async () => {
    if (DEV_ROLE) {
      toast.success("Cita agendada (modo demo)");
      navigate(`/cita-confirmada?preview=${DEV_ROLE}`, { state: { appointment: { id: "demo-2026", dependency_id: 1, dependencies: { name: selSvc?.label || "Psicología" }, scheduled_date: sel.date ? format(sel.date, "yyyy-MM-dd") : "2026-07-10", scheduled_time: sel.time || "09:00:00" } } });
      return;
    }
    if (!selSvc?.id) { toast.error("Servicio no disponible. Contacta al administrador."); return; }
    const result = await createAppointment({
      dependency_id: selSvc.id,
      scheduled_date: format(sel.date, "yyyy-MM-dd"),
      scheduled_time: sel.time,
      reason: sel.reason || "Sin especificar",
    });
    if (result.success) navigate("/cita-confirmada", { state: { appointment: result.data } });
  };

  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>

      {/* ─── Header ─── */}
      <div style={{ background: "var(--white)", borderBottom: "2px solid var(--sena-green)", padding: "1rem 1.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 8px rgba(57,169,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn-back" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
          <div>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
              Agendar cita
            </h1>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", marginTop: "0.125rem" }}>
              Bienestar SENA · Servicios estudiantiles
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>
          <Lock size={14} color="var(--sena-green)" />
          Tus datos están protegidos
        </div>
      </div>

      <div className="new-apt-layout">
        {/* ─── Sidebar de progreso ─── */}
        <aside className="new-apt-sidebar">
          <div style={{ padding: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.6875rem", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>
              Progreso
            </div>

            {steps.map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: i < 3 ? "1.5rem" : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "var(--text-sm)", flexShrink: 0, background: step.done ? "var(--sena-green)" : "var(--gray-100)", color: step.done ? "white" : "var(--gray-400)", border: step.done ? "none" : "2px solid var(--gray-200)" }}>
                    {step.done ? <Check size={14} /> : i + 1}
                  </div>
                  {i < 3 && (
                    <div style={{ width: 2, flex: 1, minHeight: 24, background: step.done ? "var(--sena-green)" : "var(--gray-200)", marginTop: 4 }} />
                  )}
                </div>
                <div style={{ paddingTop: "0.375rem" }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: step.done ? 600 : 400, color: step.done ? "var(--gray-900)" : "var(--gray-400)" }}>
                    {step.label}
                  </div>
                  {step.done && i === 0 && sel.serviceKey && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--sena-green)", marginTop: "0.125rem" }}>{selSvc?.label}</div>
                  )}
                  {step.done && i === 1 && sel.date && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--sena-green)", marginTop: "0.125rem", textTransform: "capitalize" }}>
                      {format(sel.date, "EEEE d MMM", { locale: es })}
                    </div>
                  )}
                  {step.done && i === 2 && sel.time && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--sena-green)", marginTop: "0.125rem" }}>{formatHour(sel.time)}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Resumen */}
            {canSubmit && (
              <div style={{ marginTop: "2rem", background: "var(--green-50)", borderRadius: "var(--radius-md)", padding: "1rem", border: "1px solid var(--green-100)" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--sena-green)", marginBottom: "0.75rem" }}>
                  Resumen de tu cita
                </div>
                {[
                  { icon: selSvc?.icon, label: "Servicio", value: selSvc?.label },
                  { icon: Calendar,     label: "Fecha",    value: format(sel.date, "d 'de' MMMM", { locale: es }), cap: true },
                  { icon: Clock,        label: "Hora",     value: formatHour(sel.time) },
                  { icon: MapPin,       label: "Lugar",    value: "Bloque B, Piso 2" },
                ].map(({ icon: Ic, label, value, cap }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
                    {Ic && <Ic size={14} color="var(--sena-green)" style={{ flexShrink: 0 }} />}
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>{label}:</span>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--gray-800)", textTransform: cap ? "capitalize" : "none" }}>{value}</span>
                  </div>
                ))}
                <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit} style={{ marginTop: "1rem" }}>
                  {isCreating ? "Agendando..." : "Confirmar cita"}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ─── Contenido principal ─── */}
        <div className="new-apt-content">

          {/* 1. Servicio */}
          <div className="apt-form-section">
            <div className="apt-form-section-header">
              <div className="apt-step-num" style={{ background: sel.serviceKey ? "var(--sena-green)" : "var(--gray-200)", color: sel.serviceKey ? "white" : "var(--gray-500)" }}>
                {sel.serviceKey ? <Check size={14} /> : "1"}
              </div>
              <div>
                <h2>Selecciona el servicio</h2>
                <p>¿Con qué área de bienestar necesitas una cita?</p>
              </div>
            </div>
            <div className="service-grid-desktop">
              {services.map(svc => {
                const Ic = svc.icon;
                const isSel = sel.serviceKey === svc.key;
                return (
                  <button
                    key={svc.key}
                    className={`service-card-desktop ${isSel ? "selected" : ""}`}
                    style={{ borderColor: isSel ? svc.color : "var(--gray-200)" }}
                    onClick={() => set("serviceKey", svc.key)}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", background: isSel ? svc.color : svc.bg, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                      <Ic size={24} color={isSel ? "white" : svc.color} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: isSel ? svc.color : "var(--gray-900)", marginBottom: "0.25rem" }}>{svc.label}</h3>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: 1.5 }}>{svc.desc}</p>
                    </div>
                    {isSel && (
                      <div style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: "50%", background: svc.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={13} color="white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fecha — CALENDARIO */}
          <div className="apt-form-section">
            <div className="apt-form-section-header">
              <div className="apt-step-num" style={{ background: sel.date ? "var(--sena-green)" : "var(--gray-200)", color: sel.date ? "white" : "var(--gray-500)" }}>
                {sel.date ? <Check size={14} /> : "2"}
              </div>
              <div>
                <h2>Selecciona la fecha</h2>
                <p>
                  {sel.date
                    ? <span style={{ color: "var(--sena-green)", fontWeight: 600, textTransform: "capitalize" }}>
                        {format(sel.date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    : "Elige el día que mejor te convenga (días hábiles)"}
                </p>
              </div>
            </div>
            <DateCalendar selected={sel.date} onChange={d => set("date", d)} />
          </div>

          {/* 3. Hora */}
          <div className="apt-form-section">
            <div className="apt-form-section-header">
              <div className="apt-step-num" style={{ background: sel.time ? "var(--sena-green)" : "var(--gray-200)", color: sel.time ? "white" : "var(--gray-500)" }}>
                {sel.time ? <Check size={14} /> : "3"}
              </div>
              <div>
                <h2>Selecciona la hora</h2>
                <p>Horarios disponibles · Duración: 60 minutos</p>
              </div>
            </div>
            <div className="time-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {HOURS.map(h => (
                <button
                  key={h}
                  className={`time-chip ${sel.time === h ? "selected" : ""}`}
                  onClick={() => set("time", h)}
                >
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Motivo */}
          <div className="apt-form-section">
            <div className="apt-form-section-header">
              <div className="apt-step-num" style={{ background: "var(--gray-200)", color: "var(--gray-500)" }}>4</div>
              <div>
                <h2>Motivo de consulta <span style={{ fontWeight: 400, color: "var(--gray-500)", fontSize: "var(--text-sm)" }}>(opcional)</span></h2>
                <p>Describe brevemente el motivo para agilizar la atención</p>
              </div>
            </div>
            <textarea
              className="notes-textarea"
              placeholder="Ej: Tengo dificultades para concentrarme y sentimiento de ansiedad antes de los exámenes..."
              value={sel.reason}
              onChange={e => e.target.value.length <= 250 && set("reason", e.target.value)}
              rows={4}
            />
            <div className="notes-char-count">{sel.reason.length}/250</div>
            <div className="info-banner" style={{ marginTop: "1rem" }}>
              <Info size={16} color="var(--sena-green)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p><strong>Importante:</strong> Llega 10 minutos antes de tu cita y lleva tu documento de identidad y carné del SENA.</p>
            </div>
          </div>

          {/* Submit mobile */}
          <div className="new-apt-submit-mobile">
            <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
              <Clock size={18} /> {isCreating ? "Agendando..." : "Confirmar cita"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .new-apt-layout {
          display: flex;
          min-height: calc(100vh - 73px);
        }
        .new-apt-sidebar {
          width: 280px;
          flex-shrink: 0;
          background: var(--white);
          border-right: 1px solid var(--gray-100);
          position: sticky;
          top: 73px;
          height: calc(100vh - 73px);
          overflow-y: auto;
        }
        .new-apt-content {
          flex: 1;
          padding: 2rem 2.5rem;
          max-width: 760px;
          margin: 0 auto;
        }
        .apt-form-section {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          border: 1px solid var(--gray-100);
        }
        .apt-form-section-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .apt-form-section-header h2 {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--gray-900);
          line-height: 1.3;
        }
        .apt-form-section-header p {
          font-size: var(--text-sm);
          color: var(--gray-500);
          margin-top: 0.25rem;
        }
        .apt-step-num {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: var(--text-sm);
          flex-shrink: 0;
        }
        .service-grid-desktop {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .service-card-desktop {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.125rem 1.25rem;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-md);
          background: var(--white);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.1s;
          text-align: left;
          font-family: var(--font-sans);
          width: 100%;
        }
        .service-card-desktop:hover {
          background: var(--gray-50);
          border-color: var(--gray-300);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .service-card-desktop.selected {
          background: var(--green-20);
          border-width: 2px;
          box-shadow: 0 0 0 4px rgba(57,169,0,0.08);
        }
        .new-apt-submit-mobile { display: none; }
        @media (max-width: 768px) {
          .new-apt-layout { flex-direction: column; }
          .new-apt-sidebar { display: none; }
          .new-apt-content { padding: 1rem; max-width: 100%; }
          .new-apt-submit-mobile { display: block; margin-top: 1rem; }
          .service-grid-desktop { gap: 0.625rem; }
          .apt-form-section { padding: 1.25rem; }
        }
      `}</style>
    </div>
  );
}
