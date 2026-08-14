import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Brain, Heart, Users, Check, ChevronLeft, ChevronRight,
  Lock, Info, Clock, Calendar, MapPin, ArrowRight, Shield,
} from "lucide-react";
import {
  addDays, format, isWeekend, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  addMonths, subMonths, isBefore, startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { useAppointments } from "../hooks/useAppointments";
import { useAppointmentModal } from "../../../providers/AppointmentModalContext";
import { supabase } from "../../../lib/supabase";
import { notifyNewAppointment } from "../../../lib/notifications";
import { toast } from "sonner";

const IS_DEV = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview");

const SERVICES = [
  {
    key:   "PSICOLOGIA",
    icon:  Brain,
    label: "Psicología",
    desc:  "Apoyo emocional, manejo de ansiedad, estrés y bienestar mental",
    color: "#16a34a",
    bg:    "#dcfce7",
    border:"#bbf7d0",
    id:    null,
  },
  {
    key:   "ENFERMERIA",
    icon:  Heart,
    label: "Enfermería",
    desc:  "Atención médica básica, control de signos y orientación en salud",
    color: "#2563eb",
    bg:    "#dbeafe",
    border:"#bfdbfe",
    id:    null,
  },
  {
    key:   "TRABAJO_SOCIAL",
    icon:  Users,
    label: "Trabajo Social",
    desc:  "Acompañamiento socioeconómico, subsidios y apoyo familiar",
    color: "#d97706",
    bg:    "#fef3c7",
    border:"#fde68a",
    id:    null,
  },
];

const HOURS = [
  { value: "08:00", label: "8:00 a.m."  },
  { value: "09:00", label: "9:00 a.m."  },
  { value: "10:00", label: "10:00 a.m." },
  { value: "11:00", label: "11:00 a.m." },
  { value: "14:00", label: "2:00 p.m."  },
  { value: "15:00", label: "3:00 p.m."  },
  { value: "16:00", label: "4:00 p.m."  },
  { value: "17:00", label: "5:00 p.m."  },
];

const WEEK_DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const STEPS = ["Servicio","Fecha","Hora","Confirmar"];

function buildCalendarDays(month) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end   = endOfWeek(endOfMonth(month),   { weekStartsOn: 0 });
  const days  = [];
  let d = start;
  while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }
  return days;
}

function MiniCalendar({ selected, onChange }) {
  const today   = startOfDay(new Date());
  const minDate = addDays(today, 1);
  const [month, setMonth] = useState(startOfMonth(minDate));
  const days = buildCalendarDays(month);

  const isDisabled = (d) => isBefore(d, minDate) || isWeekend(d) || !isSameMonth(d, month);
  const isAvail    = (d) => !isDisabled(d);
  const isSel      = (d) => selected && isSameDay(d, selected);
  const isToday    = (d) => isSameDay(d, today);

  return (
    <div style={{ background: "#fafafa", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      {/* Navegación */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1rem", background: "white", borderBottom: "1px solid #f3f4f6" }}>
        <button
          onClick={() => setMonth(m => subMonths(m, 1))}
          style={navBtnStyle}
        ><ChevronLeft size={15} /></button>
        <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>
          {format(month, "MMMM yyyy", { locale: es })}
        </span>
        <button
          onClick={() => setMonth(m => addMonths(m, 1))}
          style={navBtnStyle}
        ><ChevronRight size={15} /></button>
      </div>

      {/* Días semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0.625rem 0.5rem 0.25rem", background: "white" }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 700, color: "#6b7280", padding: "0.25rem 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0.25rem 0.5rem 0.75rem", background: "white", gap: "1px" }}>
        {days.map((d, i) => {
          const sel  = isSel(d);
          const avl  = isAvail(d);
          const dis  = isDisabled(d);
          const tod  = isToday(d);
          return (
            <button
              key={i}
              onClick={() => avl && onChange(d)}
              disabled={dis}
              style={{
                height: 36,
                borderRadius: 8,
                border: "none",
                fontSize: "0.875rem",
                fontWeight: sel ? 700 : 400,
                cursor: avl ? "pointer" : "default",
                background: sel ? "#39a900" : "transparent",
                color: sel ? "white" : dis ? "#e5e7eb" : tod ? "#39a900" : "#374151",
                position: "relative",
                fontFamily: "var(--font-sans)",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={e => { if (avl && !sel) e.currentTarget.style.background = "#f0fdf4"; }}
              onMouseLeave={e => { if (avl && !sel) e.currentTarget.style.background = "transparent"; }}
            >
              {format(d, "d")}
              {tod && !sel && (
                <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#39a900", display: "block" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle = {
  width: 30, height: 30, borderRadius: 7,
  border: "1px solid #e5e7eb", background: "white",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6b7280",
};

export function AppointmentModal() {
  const navigate = useNavigate();
  const { isOpen, closeModal, preselectedService } = useAppointmentModal();
  const { createAppointment, isCreating } = useAppointments();

  const [step, setStep]       = useState(1);
  const [services, setServices] = useState(SERVICES);
  const [form, setForm]       = useState({ serviceKey: null, depId: null, date: null, time: null, reason: "" });
  const [takenSlots, setTakenSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [aptLocation, setAptLocation] = useState("Bienestar SENA");
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  // Lugar de la cita — misma fuente de verdad configurable que AppointmentDetail (system_settings)
  useEffect(() => {
    supabase.from("system_settings").select("value").eq("key", "appointment_location").maybeSingle()
      .then(({ data }) => { if (data?.value) setAptLocation(data.value); });
  }, []);

  // Cargar dependencias reales
  useEffect(() => {
    if (IS_DEV) return;
    supabase.from("dependencies").select("*").then(({ data }) => {
      if (!data) return;
      const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
      setServices(SERVICES.map(svc => {
        const kw = norm(svc.key.split("_")[0]);
        const match = data.find(d => norm(d.name).includes(kw));
        return match ? { ...svc, id: match.id } : svc;
      }));
    });
  }, []);

  // Preseleccionar servicio si viene del contexto
  useEffect(() => {
    if (isOpen && preselectedService) {
      set("serviceKey", preselectedService);
      setStep(2);
    } else if (isOpen) {
      setStep(1);
      setForm({ serviceKey: null, depId: null, date: null, time: null, reason: "" });
    }
  }, [isOpen, preselectedService, set]);

  // Cargar slots ocupados cuando selecciona fecha+servicio
  useEffect(() => {
    const svc = services.find(s => s.key === form.serviceKey);
    if (!svc?.id || !form.date || IS_DEV) { setTakenSlots([]); return; }
    let cancelled = false;
    setCheckingSlots(true);
    const dateStr = format(form.date, "yyyy-MM-dd");
    supabase
      .from("appointments")
      .select("scheduled_time")
      .eq("dependency_id", svc.id)
      .eq("scheduled_date", dateStr)
      .in("status", ["pending", "confirmed"])
      .then(({ data }) => {
        if (cancelled) return;
        setTakenSlots((data || []).map(a => a.scheduled_time.slice(0, 5)));
        setCheckingSlots(false);
      });
    return () => { cancelled = true; };
  }, [form.serviceKey, form.date, services]);

  // Cerrar con Escape + atrapar el foco dentro del modal mientras esté abierto
  useEffect(() => {
    if (!isOpen) return;
    // Foco inicial dentro del panel (el panel mismo, no había ningún elemento enfocado por defecto)
    panelRef.current?.focus();

    const handler = (e) => {
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeModal]);

  // Bloquear scroll cuando modal está abierto
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else        document.body.style.overflow = "";
    return ()  => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const selSvc = services.find(s => s.key === form.serviceKey);

  const goNext = () => {
    if (step === 1 && !form.serviceKey) { toast.error("Selecciona un servicio"); return; }
    if (step === 2 && !form.date)       { toast.error("Selecciona una fecha"); return; }
    if (step === 3 && !form.time)       { toast.error("Selecciona una hora"); return; }
    if (step < 4) setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (IS_DEV) {
      toast.success("Cita agendada (modo demo)");
      closeModal();
      navigate(`/cita-confirmada?preview=${IS_DEV}`, {
        state: {
          appointment: {
            id: "demo-2026",
            dependencies: { name: selSvc?.label || "Psicología" },
            scheduled_date: form.date ? format(form.date, "yyyy-MM-dd") : "2026-07-10",
            scheduled_time: form.time ? `${form.time}:00` : "09:00:00",
          },
        },
      });
      return;
    }
    if (!selSvc?.id) { toast.error("Servicio no disponible. Contacta al administrador."); return; }
    const result = await createAppointment({
      dependency_id: selSvc.id,
      scheduled_date: format(form.date, "yyyy-MM-dd"),
      scheduled_time: `${form.time}:00`,
      reason: form.reason.trim() || "Sin especificar",
    });
    if (result.success) {
      notifyNewAppointment(result.data.id);
      closeModal();
      navigate("/cita-confirmada", { state: { appointment: result.data } });
    }
  };

  const canSubmit = form.serviceKey && form.date && form.time && !isCreating;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) closeModal(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
          animation: "fadeIn 0.2s var(--ease-out)",
        }}
      >
        {/* Modal */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Agendar nueva cita"
          tabIndex={-1}
          style={{
            outline: "none",
            background: "white",
            borderRadius: 20,
            width: "100%",
            maxWidth: 520,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)",
            overflow: "hidden",
            animation: "slideUp 0.28s var(--ease-out)",
          }}
        >
          {/* ─── Header ─── */}
          <div style={{
            background: "linear-gradient(135deg, #39a900 0%, #2d8600 100%)",
            padding: "1.25rem 1.5rem 1rem",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
                  Bienestar SENA
                </div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>
                  Agendar nueva cita
                </h2>
              </div>
              <button
                onClick={closeModal}
                aria-label="Cerrar"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.12)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              >
                <X size={16} />
              </button>
            </div>

            {/* Steps */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              {STEPS.map((s, i) => {
                const num  = i + 1;
                const done = step > num;
                const cur  = step === num;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: done ? "rgba(255,255,255,0.9)" : cur ? "white" : "rgba(255,255,255,0.2)",
                        color: done || cur ? "#39a900" : "rgba(255,255,255,0.6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.6875rem", fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {done ? <Check size={11} /> : num}
                      </div>
                      <span style={{
                        fontSize: "0.6875rem",
                        fontWeight: cur ? 700 : 500,
                        color: cur ? "white" : done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)",
                      }}>
                        {s}
                      </span>
                    </div>
                    {i < 3 && (
                      <div style={{
                        flex: 1, height: 1.5, margin: "0 0.375rem",
                        background: done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                        borderRadius: 2,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Body ─── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.375rem 1.5rem" }}>

            {/* Step 1: Servicio */}
            {step === 1 && (
              <div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                  ¿Con qué área de Bienestar SENA necesitas atención?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {services.map(svc => {
                    const Ic  = svc.icon;
                    const sel = form.serviceKey === svc.key;
                    return (
                      <button
                        key={svc.key}
                        onClick={() => { set("serviceKey", svc.key); set("date", null); set("time", null); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "1rem",
                          padding: "1rem 1.125rem",
                          border: sel ? `2px solid ${svc.color}` : "1.5px solid #e5e7eb",
                          borderRadius: 12,
                          background: sel ? svc.bg : "white",
                          cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)", width: "100%",
                          boxShadow: sel ? `0 0 0 4px ${svc.color}18` : "none",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = svc.color; }}
                        onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        <div style={{
                          width: 44, height: 44, borderRadius: 10,
                          background: sel ? svc.color : svc.bg,
                          border: `1px solid ${svc.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "background 0.15s",
                        }}>
                          <Ic size={20} color={sel ? "white" : svc.color} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: sel ? svc.color : "#111827", marginBottom: "0.2rem" }}>
                            {svc.label}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.4 }}>
                            {svc.desc}
                          </div>
                        </div>
                        {sel && (
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: svc.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Check size={12} color="white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Fecha */}
            {step === 2 && (
              <div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                  Selecciona el día que mejor te convenga (días hábiles).
                  {form.date && (
                    <span style={{ color: "#39a900", fontWeight: 700, marginLeft: "0.375rem", textTransform: "capitalize" }}>
                      {format(form.date, "EEEE d 'de' MMMM", { locale: es })}
                    </span>
                  )}
                </p>
                <MiniCalendar
                  selected={form.date}
                  onChange={(d) => { set("date", d); set("time", null); }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.875rem", padding: "0.75rem", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <Calendar size={14} color="#16a34a" />
                  <span style={{ fontSize: "0.8125rem", color: "#166534" }}>
                    Lunes a viernes · Tu cita dura 60 minutos
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Hora */}
            {step === 3 && (
              <div>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                  Selecciona el horario disponible para tu cita.
                </p>
                {checkingSlots ? (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "#6b7280", fontSize: "0.875rem" }}>
                    <div style={{ width: 24, height: 24, border: "2.5px solid #e5e7eb", borderTopColor: "#39a900", borderRadius: "50%", animation: "spin 0.6s linear infinite", margin: "0 auto 0.75rem" }} />
                    Verificando disponibilidad...
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                    {HOURS.map(h => {
                      const taken = takenSlots.includes(h.value);
                      const sel   = form.time === h.value;
                      return (
                        <button
                          key={h.value}
                          onClick={() => !taken && set("time", h.value)}
                          disabled={taken}
                          style={{
                            padding: "0.75rem 1rem",
                            border: sel ? "2px solid #39a900" : "1.5px solid #e5e7eb",
                            borderRadius: 10,
                            background: sel ? "#f0fdf4" : taken ? "#f9fafb" : "white",
                            cursor: taken ? "not-allowed" : "pointer",
                            fontSize: "0.9375rem", fontWeight: sel ? 700 : 500,
                            color: sel ? "#39a900" : taken ? "#d1d5db" : "#374151",
                            fontFamily: "var(--font-sans)",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            boxShadow: sel ? "0 0 0 3px rgba(57,169,0,0.15)" : "none",
                            transition: "all 0.12s",
                            textDecoration: taken ? "line-through" : "none",
                          }}
                          onMouseEnter={e => { if (!taken && !sel) e.currentTarget.style.borderColor = "#39a900"; }}
                          onMouseLeave={e => { if (!taken && !sel) e.currentTarget.style.borderColor = "#e5e7eb"; }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Clock size={14} color={sel ? "#39a900" : taken ? "#d1d5db" : "#9ca3af"} />
                            {h.label}
                          </span>
                          {taken && <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>Ocupado</span>}
                          {sel && <Check size={14} color="#39a900" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Confirmar */}
            {step === 4 && (
              <div>
                {/* Resumen */}
                <div style={{ background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", padding: "1.125rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#39a900", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
                    Resumen de tu cita
                  </div>
                  {[
                    {
                      icon: selSvc?.icon,
                      label: "Servicio",
                      value: selSvc?.label,
                      color: selSvc?.color,
                    },
                    {
                      icon: Calendar,
                      label: "Fecha",
                      value: form.date ? format(form.date, "EEEE d 'de' MMMM, yyyy", { locale: es }) : "—",
                    },
                    {
                      icon: Clock,
                      label: "Hora",
                      value: HOURS.find(h => h.value === form.time)?.label || "—",
                    },
                    {
                      icon: MapPin,
                      label: "Lugar",
                      value: aptLocation,
                    },
                  ].map(({ icon: Ic, label, value, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(57,169,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {Ic && <Ic size={14} color="#39a900" />}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.6875rem", color: "#6b7280", marginBottom: "0.0625rem" }}>{label}</div>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: color || "#111827", textTransform: "capitalize" }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Motivo */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                    Motivo de consulta <span style={{ fontWeight: 400, color: "#6b7280" }}>(opcional)</span>
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={e => e.target.value.length <= 250 && set("reason", e.target.value)}
                    placeholder="Describe brevemente tu situación para agilizar la atención..."
                    rows={3}
                    style={{
                      width: "100%", padding: "0.75rem", border: "1.5px solid #e5e7eb",
                      borderRadius: 10, fontFamily: "var(--font-sans)", fontSize: "0.875rem",
                      color: "#374151", resize: "none", outline: "none",
                      transition: "border-color 0.15s",
                      lineHeight: 1.6,
                    }}
                    onFocus={e => e.target.style.borderColor = "#39a900"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                  <div style={{ fontSize: "0.6875rem", color: "#6b7280", textAlign: "right", marginTop: "0.25rem" }}>
                    {form.reason.length}/250
                  </div>
                </div>

                {/* Info aviso */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.875rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
                  <Info size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: "0.8125rem", color: "#92400e", lineHeight: 1.5 }}>
                    Llega <strong>10 minutos antes</strong> con tu documento de identidad y carné del SENA.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          <div style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            background: "#fafafa",
            flexShrink: 0,
          }}>
            {/* Confidencialidad */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#6b7280" }}>
              <Shield size={12} />
              <span style={{ fontSize: "0.6875rem" }}>Información confidencial</span>
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "0.625rem" }}>
              {step > 1 && (
                <button
                  onClick={goBack}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.625rem 1.125rem",
                    border: "1.5px solid #e5e7eb", borderRadius: 9,
                    background: "white", cursor: "pointer",
                    fontSize: "0.875rem", fontWeight: 600, color: "#374151",
                    fontFamily: "var(--font-sans)", transition: "background 0.12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <ChevronLeft size={15} /> Atrás
                </button>
              )}
              {step < 4 ? (
                <button
                  onClick={goNext}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.625rem 1.25rem",
                    border: "none", borderRadius: 9,
                    background: "#39a900", cursor: "pointer",
                    fontSize: "0.875rem", fontWeight: 700, color: "white",
                    fontFamily: "var(--font-sans)",
                    boxShadow: "0 2px 8px rgba(57,169,0,0.25)",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2d8600"}
                  onMouseLeave={e => e.currentTarget.style.background = "#39a900"}
                >
                  Siguiente <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.625rem 1.375rem",
                    border: "none", borderRadius: 9,
                    background: canSubmit ? "#39a900" : "#d1d5db",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    fontSize: "0.875rem", fontWeight: 700,
                    color: "white", fontFamily: "var(--font-sans)",
                    boxShadow: canSubmit ? "0 2px 8px rgba(57,169,0,0.25)" : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = "#2d8600"; }}
                  onMouseLeave={e => { if (canSubmit) e.currentTarget.style.background = "#39a900"; }}
                >
                  {isCreating ? (
                    <>
                      <div style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <Check size={15} /> Confirmar cita
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)    scale(1)    }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
