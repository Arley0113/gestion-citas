import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Check, Clock, Calendar, MapPin, FileText,
  Paperclip, Play, UserX, MoreHorizontal, User, X,
  AlertCircle, Brain, Heart, Users, Shield, Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { P } from "../../../shared/rbac/permissions";
import { toast } from "sonner";

const STATUS_STEPS = ["pending","confirmed","in_progress","completed"];
const STEP_LABELS  = ["Pendiente","Confirmada","En atención","Completada"];

const DEV_ROLE = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;

const MOCK_APT = {
  id: "mock-detail",
  status: "confirmed",
  scheduled_date: "2026-06-28",
  scheduled_time: "14:00:00",
  reason: "Estrés y dificultades de concentración antes de los exámenes del trimestre",
  notes: "",
  dependencies: { name: "Psicología", color: "var(--psi-color)" },
  profiles: { full_name: "Juan Pérez", document_number: "1034567890" },
  professional: { full_name: "Dra. Ana García" },
};

const DEP_ICON = {
  Psicología:     Brain,
  Enfermería:     Heart,
  "Trabajo Social": Users,
};

function formatTime(t) {
  if (!t) return "—";
  const [h] = t.split(":").map(Number);
  return h < 12 ? `${h}:00 a.m.` : h === 12 ? "12:00 p.m." : `${h-12}:00 p.m.`;
}

const STATUS_CFG = {
  pending:     { label: "Pendiente",   cls: "badge-pending",   color: "var(--color-warning)" },
  confirmed:   { label: "Confirmada",  cls: "badge-confirmed", color: "var(--color-info)" },
  in_progress: { label: "En atención", cls: "badge-pending",   color: "var(--sena-green)" },
  completed:   { label: "Completada",  cls: "badge-completed", color: "var(--color-success)" },
  no_show:     { label: "No asistió",  cls: "badge-cancelled", color: "var(--color-error)" },
  cancelled:   { label: "Cancelada",   cls: "badge-cancelled", color: "var(--color-error)" },
};

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can }  = usePermissions();
  const [apt, setApt]       = useState(DEV_ROLE ? MOCK_APT : null);
  const [loading, setLoading] = useState(!DEV_ROLE);
  const [notes, setNotes]   = useState(DEV_ROLE ? "" : undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (DEV_ROLE) return;
    supabase
      .from("appointments")
      .select("*, dependencies(name,color), profiles!user_id(full_name,document_number), professional:profiles!professional_id(full_name)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setApt(data);
        setNotes(data?.notes || "");
        setLoading(false);
      });
  }, [id]);

  const confirm = async () => {
    await supabase.from("appointments").update({ status: "confirmed", updated_at: new Date() }).eq("id", id);
    toast.success("Cita confirmada");
    setApt(a => ({ ...a, status: "confirmed" }));
  };

  const markNoShow = async () => {
    await supabase.from("appointments").update({ status: "no_show", updated_at: new Date() }).eq("id", id);
    toast.info("Marcada como no asistió");
    setApt(a => ({ ...a, status: "no_show" }));
  };

  const cancelOwnAppointment = async () => {
    if (DEV_ROLE) { toast.success("Cita cancelada (demo)"); setApt(a => ({ ...a, status: "cancelled" })); return; }
    await supabase.from("appointments").update({ status: "cancelled", updated_at: new Date() }).eq("id", id);
    toast.success("Cita cancelada correctamente");
    setApt(a => ({ ...a, status: "cancelled" }));
  };

  const saveNotes = async () => {
    if (DEV_ROLE) { toast.success("Notas guardadas (demo)"); return; }
    setSaving(true);
    await supabase.from("appointments").update({ notes, updated_at: new Date() }).eq("id", id);
    setSaving(false);
    toast.success("Notas guardadas");
  };

  const startAttention = () => navigate(`/cita/${id}/atencion`);

  if (loading) return <div className="loading-screen">Cargando cita...</div>;
  if (!apt)    return <div className="loading-screen">Cita no encontrada</div>;

  const depName     = apt.dependencies?.name || "—";
  const DepIcon     = DEP_ICON[depName] || Calendar;
  const dateStr     = apt.scheduled_date
    ? format(parseISO(apt.scheduled_date), "EEEE, d 'de' MMMM yyyy", { locale: es })
    : "—";
  const dateShort   = apt.scheduled_date
    ? format(parseISO(apt.scheduled_date), "d 'de' MMMM", { locale: es })
    : "—";
  const timeStr     = formatTime(apt.scheduled_time);
  const stCfg       = STATUS_CFG[apt.status] || STATUS_CFG.pending;
  const stepIdx     = STATUS_STEPS.indexOf(apt.status);

  // ─── Permisos granulares ───────────────────────────────────────────────────
  const canWriteNotes = can(P.APPOINTMENTS_NOTES_WRITE);
  const canReadNotes  = can(P.APPOINTMENTS_NOTES_READ);
  const canConfirm    = can(P.APPOINTMENTS_CONFIRM);
  const canStart      = can(P.APPOINTMENTS_START);
  const canNoShow     = can(P.APPOINTMENTS_NO_SHOW);
  const isOwnApt      = can(P.APPOINTMENTS_READ_OWN) && (DEV_ROLE || apt.user_id === user?.id);
  const canCancelOwn  = can(P.APPOINTMENTS_CANCEL_OWN) && isOwnApt && apt.status === "pending";
  const canCancelAny  = can(P.APPOINTMENTS_CANCEL_ANY) && ["pending","confirmed"].includes(apt.status);
  const showActions   = canConfirm || canStart || canNoShow;

  return (
    <div style={{ background: "var(--gray-50)", minHeight: "100vh" }}>

      {/* ─── Header ─── */}
      <div style={{
        background: "var(--white)", borderBottom: "2px solid var(--sena-green)",
        padding: "1rem 1.75rem", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 8px rgba(57,169,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn-back" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
          <div>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--gray-900)", letterSpacing: "-0.025em", lineHeight: 1.15 }}>
              Detalle de cita
            </h1>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", marginTop: "0.125rem", textTransform: "capitalize" }}>
              {dateStr}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className={`badge ${stCfg.cls}`}>{stCfg.label}</span>
          <button className="btn-icon"><MoreHorizontal size={18} /></button>
        </div>
      </div>

      {/* ─── Dos columnas ─── */}
      <div className="detail-layout">

        {/* ─── Columna izquierda: Paciente + Timeline ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Perfil del aprendiz */}
          <div className="detail-card">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "var(--green-100)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "1.5rem", color: "var(--sena-green)", flexShrink: 0,
              }}>
                {apt.profiles?.full_name?.charAt(0) || "A"}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--gray-900)", marginBottom: "0.25rem" }}>
                  {apt.profiles?.full_name || "Aprendiz"}
                </h2>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
                  <User size={13} /> Documento: <strong style={{ color: "var(--gray-700)" }}>{apt.profiles?.document_number || "—"}</strong>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", background: "var(--green-50)", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sena-green)" }}>
                    <DepIcon size={13} /> {depName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", background: "var(--gray-100)", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--gray-600)" }}>
                    <Clock size={13} /> {timeStr}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--gray-100)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {[
                { icon: Calendar, label: "Fecha",     val: dateShort,          cap: true },
                { icon: Clock,    label: "Hora",      val: timeStr              },
                { icon: MapPin,   label: "Lugar",     val: "Bloque B, Piso 2"  },
              ].map(({ icon: Ic, label, val, cap }) => (
                <div key={label}>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                    <Ic size={12} /> {label}
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-900)", textTransform: cap ? "capitalize" : "none" }}>{val}</div>
                </div>
              ))}
            </div>

            {apt.professional?.full_name && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--gray-100)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--psi-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--psi-color)", fontSize: "var(--text-sm)", flexShrink: 0 }}>
                  {apt.professional.full_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>Profesional asignado</div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-900)" }}>{apt.professional.full_name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Motivo de consulta */}
          <div className="detail-card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={15} color="var(--sena-green)" />
              </div>
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)" }}>Motivo de consulta</h3>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.7, background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "1rem", borderLeft: "3px solid var(--sena-green)" }}>
              {apt.reason || "Sin motivo especificado"}
            </p>
          </div>

          {/* Timeline */}
          <div className="detail-card">
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)", marginBottom: "1.25rem" }}>
              Estado de la atención
            </h3>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              {STATUS_STEPS.map((s, i) => {
                const done    = i < stepIdx;
                const current = i === stepIdx;
                const future  = i > stepIdx;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "flex-start", flex: i < 3 ? "1" : "0", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "var(--text-sm)", zIndex: 1,
                        background: done ? "var(--sena-green)" : current ? "var(--sena-green)" : "var(--gray-100)",
                        color: done || current ? "white" : "var(--gray-400)",
                        border: current ? "3px solid var(--green-100)" : "none",
                        boxShadow: current ? "0 0 0 3px rgba(57,169,0,0.15)" : "none",
                      }}>
                        {done ? <Check size={16} /> : <span>{i + 1}</span>}
                      </div>
                      {i < 3 && (
                        <div style={{ flex: 1, height: 3, background: done ? "var(--sena-green)" : "var(--gray-200)", marginLeft: -1 }} />
                      )}
                    </div>
                    <div style={{ paddingTop: "0.625rem", paddingRight: "0.25rem" }}>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: done || current ? 700 : 400, color: done || current ? "var(--gray-900)" : "var(--gray-400)" }}>
                        {STEP_LABELS[i]}
                      </div>
                      {current && (
                        <div style={{ fontSize: "0.65rem", color: "var(--sena-green)", fontWeight: 600, marginTop: "0.125rem" }}>
                          Estado actual
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Columna derecha: Notas + Documentos + Acciones ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Notas de atención */}
          <div className="detail-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={15} color="var(--sena-green)" />
                </div>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)" }}>Notas de atención</h3>
                {canReadNotes && !canWriteNotes && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.125rem 0.5rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "99px", fontSize: "0.625rem", fontWeight: 600, color: "#1d4ed8" }}>
                    <Eye size={10} /> Solo lectura
                  </span>
                )}
              </div>
              {canWriteNotes && (
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  style={{ padding: "0.375rem 0.75rem", background: "var(--sena-green)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              )}
            </div>
            {canWriteNotes ? (
              <>
                <textarea
                  className="notes-textarea"
                  placeholder="Escribe las notas de la sesión: observaciones, diagnóstico preliminar, seguimiento recomendado..."
                  value={notes ?? apt.notes ?? ""}
                  onChange={e => setNotes(e.target.value)}
                  rows={8}
                  style={{ resize: "vertical" }}
                />
                <div className="notes-char-count">{(notes?.length || 0)}/2000</div>
              </>
            ) : canReadNotes ? (
              <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "1rem", borderLeft: "3px solid #bfdbfe", fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.7, minHeight: "4rem" }}>
                {apt.notes || <span style={{ color: "var(--gray-400)", fontStyle: "italic" }}>Sin notas registradas para esta cita.</span>}
              </div>
            ) : (
              <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "1.5rem", textAlign: "center" }}>
                <Shield size={32} color="var(--gray-300)" style={{ marginBottom: "0.75rem" }} />
                <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>Notas visibles solo para el profesional asignado</p>
              </div>
            )}
          </div>

          {/* Documentos */}
          <div className="detail-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Paperclip size={15} color="var(--sena-green)" />
                </div>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)" }}>Documentos y anexos</h3>
              </div>
              {showActions && (
                <button style={{ fontSize: "var(--text-xs)", color: "var(--sena-green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>
                  + Adjuntar
                </button>
              )}
            </div>
            <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "1.5rem", textAlign: "center", border: "2px dashed var(--gray-200)" }}>
              <Paperclip size={28} color="var(--gray-300)" style={{ marginBottom: "0.5rem" }} />
              <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>No hay documentos adjuntos</p>
            </div>
          </div>

          {/* Acciones — visible solo si tiene al menos un permiso de acción */}
          {showActions && (
            <div className="detail-card">
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)", marginBottom: "1rem" }}>
                Acciones
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {canStart && apt.status === "confirmed" && (
                  <button className="btn-primary" onClick={startAttention} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <Play size={16} /> Iniciar atención
                  </button>
                )}
                {canConfirm && apt.status === "pending" && (
                  <button className="btn-primary" onClick={confirm} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <Check size={16} /> Confirmar cita
                  </button>
                )}
                {canNoShow && (apt.status === "pending" || apt.status === "confirmed") && (
                  <button className="btn-danger-outline" onClick={markNoShow} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <UserX size={16} /> No asistió a la cita
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cancelar cita */}
          {(canCancelOwn || canCancelAny) && (
            <div className="detail-card">
              <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)", marginBottom: "0.75rem" }}>
                {canCancelAny ? "Gestión administrativa" : "Gestionar cita"}
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "1rem", lineHeight: 1.55 }}>
                {canCancelAny
                  ? "Como coordinador puedes cancelar cualquier cita activa. Esta acción queda registrada en el sistema."
                  : <>Solo puedes cancelar citas con estado <strong>pendiente</strong>. Una vez cancelada no podrás reactivarla.</>}
              </p>
              <button
                className="btn-danger-outline"
                onClick={cancelOwnAppointment}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              >
                <X size={15} /> Cancelar esta cita
              </button>
            </div>
          )}

          {/* Info banner */}
          <div className="info-banner">
            <AlertCircle size={16} color="var(--sena-green)" style={{ flexShrink: 0 }} />
            <p>La información de esta cita es <strong>confidencial</strong>. Solo personal autorizado de Bienestar SENA puede acceder a los detalles.</p>
          </div>
        </div>
      </div>

      <style>{`
        .detail-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
          padding: 1.5rem 2rem;
          max-width: 1240px;
          margin: 0 auto;
        }
        .detail-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          border: 1px solid var(--gray-100);
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 900px) {
          .detail-layout { grid-template-columns: 1fr; padding: 1rem; }
        }
      `}</style>
    </div>
  );
}
