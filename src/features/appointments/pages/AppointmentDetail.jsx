import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Check, Clock, Calendar, MapPin, FileText,
  Paperclip, Play, UserX, User, X, Star, Hash, BookOpen,
  AlertCircle, Brain, Heart, Users, Shield, Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../shared/rbac/usePermissions";
import { P } from "../../../shared/rbac/permissions";
import { toast } from "sonner";
import { notifyAppointmentConfirmed } from "../../../lib/notifications";

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
  const [h, m] = t.split(":").map(Number);
  const mm = String(m ?? 0).padStart(2, "0");
  return h < 12 ? `${h}:${mm} a.m.` : h === 12 ? `12:${mm} p.m.` : `${h-12}:${mm} p.m.`;
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
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelModal, setCancelModal] = useState({ open: false, reason: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, doc: null });
  const [docs, setDocs]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [aptLocation, setAptLocation] = useState("Bienestar SENA");
  const [survey, setSurvey] = useState(null);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyHover, setSurveyHover] = useState(0);
  const [surveyComment, setSurveyComment] = useState("");
  const [surveyLoaded, setSurveyLoaded] = useState(false);

  useEffect(() => {
    if (DEV_ROLE) return;
    supabase
      .from("appointments")
      .select("*, dependencies(name,color), profiles!user_id(full_name,document_number,ficha_number,program), professional:profiles!professional_id(full_name)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) { toast.error("No se pudo cargar la cita"); setLoading(false); return; }
        setApt(data);
        setNotes(data?.notes || "");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (DEV_ROLE || !id) return;
    supabase
      .from("user_documents")
      .select("id, name, file_path, file_size, mime_type, created_at")
      .eq("appointment_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDocs(data || []));
  }, [id]);

  useEffect(() => {
    supabase.from("system_settings").select("value").eq("key", "appointment_location").maybeSingle()
      .then(({ data }) => { if (data?.value) setAptLocation(data.value); });
  }, []);

  useEffect(() => {
    if (!apt || DEV_ROLE || !user || apt.status !== "completed" || apt.user_id !== user.id || surveyLoaded) return;
    setSurveyLoaded(true);
    supabase.from("satisfaction_surveys").select("rating, comment").eq("appointment_id", id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setSurvey(data); setSurveyRating(data.rating); } });
  }, [apt?.status, apt?.user_id, id, user?.id, surveyLoaded]);

  const confirm = async () => {
    const { error } = await supabase.from("appointments").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("No se pudo confirmar la cita"); return; }
    toast.success("Cita confirmada");
    setApt(a => ({ ...a, status: "confirmed" }));
    notifyAppointmentConfirmed({ to_email: null, user_id: apt.user_id, to_name: apt.profiles?.full_name || "Aprendiz", service_name: apt.dependencies?.name, scheduled_date: apt.scheduled_date, scheduled_time: apt.scheduled_time }).catch(() => {});
  };

  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const submitSurvey = async () => {
    if (!surveyRating || !user || surveySubmitting) return;
    setSurveySubmitting(true);
    const { error } = await supabase.from("satisfaction_surveys").insert({ appointment_id: id, user_id: user.id, rating: surveyRating, comment: surveyComment.trim() || null });
    setSurveySubmitting(false);
    if (error) { toast.error("Error al enviar la encuesta"); return; }
    setSurvey({ rating: surveyRating, comment: surveyComment.trim() });
    toast.success("¡Gracias por tu retroalimentación!");
  };

  const markNoShow = async () => {
    const { error } = await supabase.from("appointments").update({ status: "no_show", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("No se pudo actualizar la cita"); return; }
    toast.info("Marcada como no asistió");
    setApt(a => ({ ...a, status: "no_show" }));
  };

  const executeCancel = async () => {
    if (DEV_ROLE) {
      toast.success("Cita cancelada (demo)");
      setApt(a => ({ ...a, status: "cancelled" }));
      setCancelModal({ open: false, reason: "" });
      return;
    }
    const reason = cancelModal.reason.trim() || null;
    const { error } = canCancelAny
      ? await supabase.from("appointments").update({
          status: "cancelled",
          cancelled_reason: reason,
          updated_at: new Date().toISOString(),
        }).eq("id", id)
      : await supabase.rpc("cancel_own_appointment", { p_appointment_id: id, p_reason: reason });
    if (error) { toast.error("No se pudo cancelar la cita"); return; }
    toast.success("Cita cancelada correctamente");
    setApt(a => ({ ...a, status: "cancelled" }));
    setCancelModal({ open: false, reason: "" });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) { toast.error("El archivo no puede superar 5 MB"); return; }
    const ALLOWED = ["application/pdf","image/jpeg","image/png","image/webp","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!ALLOWED.includes(file.type)) { toast.error("Formato no permitido. Usa PDF, imagen o Word."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `appointments/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("user-documents").upload(path, file);
    if (upErr) { toast.error("Error al subir el archivo"); setUploading(false); return; }
    const { error: dbErr, data: dbData } = await supabase.from("user_documents").insert({
      user_id: user.id,
      appointment_id: id,
      name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      category: "appointment",
    }).select().single();
    setUploading(false);
    if (dbErr) { toast.error("Error al registrar el documento"); return; }
    setDocs(d => [dbData, ...d]);
    toast.success("Documento adjuntado");
    e.target.value = "";
  };

  const handleDeleteDoc = (doc) => setDeleteModal({ open: true, doc });

  const executeDeleteDoc = async () => {
    const doc = deleteModal.doc;
    setDeleteModal({ open: false, doc: null });
    const { error: storageErr } = await supabase.storage.from("user-documents").remove([doc.file_path]);
    if (storageErr) { toast.error("Error al eliminar el archivo"); return; }
    const { error: dbErr } = await supabase.from("user_documents").delete().eq("id", doc.id);
    if (dbErr) { toast.error("Error al eliminar el registro"); return; }
    setDocs(d => d.filter(x => x.id !== doc.id));
    toast.success("Documento eliminado");
  };

  const openDoc = async (doc) => {
    const { data } = await supabase.storage.from("user-documents").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  const saveNotes = async () => {
    if (DEV_ROLE) { toast.success("Notas guardadas (demo)"); return; }
    setSaving(true);
    const { error } = await supabase.from("appointments").update({ notes, updated_at: new Date().toISOString() }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("No se pudieron guardar las notas"); return; }
    toast.success("Notas guardadas");
  };

  const startAttention = () => navigate(`/cita/${id}/atencion${DEV_ROLE ? `?preview=${DEV_ROLE}` : ""}`);

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
  const canCancelOwn  = can(P.APPOINTMENTS_CANCEL_OWN) && isOwnApt && ["pending", "confirmed"].includes(apt.status);
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
                <div style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                  <User size={13} /> Documento: <strong style={{ color: "var(--gray-700)" }}>{apt.profiles?.document_number || "—"}</strong>
                </div>
                {apt.profiles?.ficha_number && (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                    <Hash size={13} /> Ficha: <strong style={{ color: "var(--gray-700)" }}>{apt.profiles.ficha_number}</strong>
                  </div>
                )}
                {apt.profiles?.program && (
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
                    <BookOpen size={13} /> <span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{apt.profiles.program}</span>
                  </div>
                )}
                {!apt.profiles?.program && <div style={{ marginBottom: "0.75rem" }} />}
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
                { icon: MapPin,   label: "Lugar",     val: aptLocation         },
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
                  value={notes}
                  onChange={e => e.target.value.length <= 2000 && setNotes(e.target.value)}
                  rows={8}
                  maxLength={2000}
                  style={{ resize: "vertical" }}
                />
                <div className="notes-char-count">{notes.length}/2000</div>
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
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)" }}>
                  Documentos y anexos {docs.length > 0 && <span style={{ fontWeight: 500, color: "var(--gray-500)", fontSize: "var(--text-sm)" }}>({docs.length})</span>}
                </h3>
              </div>
              {(showActions || isOwnApt) && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ fontSize: "var(--text-xs)", color: uploading ? "var(--gray-400)" : "var(--sena-green)", background: "none", border: "none", cursor: uploading ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}
                  >
                    {uploading ? "Subiendo…" : "+ Adjuntar"}
                  </button>
                </>
              )}
            </div>
            {docs.length === 0 ? (
              <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "1.5rem", textAlign: "center", border: "2px dashed var(--gray-200)" }}>
                <Paperclip size={28} color="var(--gray-300)" style={{ marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}>No hay documentos adjuntos</p>
                {(showActions || isOwnApt) && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "0.25rem" }}>PDF, imagen o Word · máx. 5 MB</p>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {docs.map(doc => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-100)" }}>
                    <FileText size={15} color="var(--sena-green)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--gray-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                      {doc.file_size && <div style={{ fontSize: "0.6875rem", color: "var(--gray-400)" }}>{(doc.file_size / 1024).toFixed(0)} KB</div>}
                    </div>
                    <button
                      onClick={() => openDoc(doc)}
                      style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--sena-green)", background: "none", border: "none", cursor: "pointer", padding: "0.25rem 0.5rem", borderRadius: 4, fontFamily: "var(--font-sans)" }}
                    >
                      Ver
                    </button>
                    {(showActions || isOwnApt) && (
                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", color: "var(--gray-400)" }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                  : <>Puedes cancelar citas <strong>pendientes o confirmadas</strong>. Una vez cancelada no podrás reactivarla.</>}
              </p>
              <button
                className="btn-danger-outline"
                onClick={() => setCancelModal({ open: true, reason: "" })}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              >
                <X size={15} /> Cancelar esta cita
              </button>
            </div>
          )}

          {/* Encuesta de satisfacción — solo aprendiz en cita completada */}
          {!DEV_ROLE && user && apt?.status === "completed" && apt?.user_id === user.id && (
            <div className="detail-card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Star size={15} color="#ca8a04" fill="#ca8a04" />
                </div>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--gray-900)" }}>
                  {survey ? "Tu valoración" : "¿Cómo fue tu atención?"}
                </h3>
              </div>
              {survey ? (
                <div>
                  <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.625rem" }}>
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={22} color={i <= survey.rating ? "#ca8a04" : "#e5e7eb"} fill={i <= survey.rating ? "#ca8a04" : "none"} />
                    ))}
                  </div>
                  {survey.comment && (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-600)", fontStyle: "italic", lineHeight: 1.6 }}>"{survey.comment}"</p>
                  )}
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "0.5rem" }}>Gracias por tu retroalimentación.</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", marginBottom: "0.875rem", lineHeight: 1.55 }}>
                    Tu opinión nos ayuda a mejorar el servicio de Bienestar.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                    {[1,2,3,4,5].map(i => (
                      <button
                        key={i}
                        onClick={() => setSurveyRating(i)}
                        onMouseEnter={() => setSurveyHover(i)}
                        onMouseLeave={() => setSurveyHover(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem" }}
                      >
                        <Star size={28} color="#ca8a04" fill={(surveyHover || surveyRating) >= i ? "#ca8a04" : "none"} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                  {surveyRating > 0 && (
                    <>
                      <textarea
                        placeholder="Comentario opcional..."
                        value={surveyComment}
                        onChange={e => e.target.value.length <= 400 && setSurveyComment(e.target.value)}
                        rows={3}
                        style={{ width: "100%", boxSizing: "border-box", padding: "0.625rem 0.875rem", border: "1.5px solid var(--gray-200)", borderRadius: 10, fontSize: "var(--text-sm)", resize: "none", outline: "none", fontFamily: "var(--font-sans)", marginBottom: "0.75rem" }}
                        onFocus={e => e.target.style.borderColor = "var(--sena-green)"}
                        onBlur={e => e.target.style.borderColor = "var(--gray-200)"}
                      />
                      <button
                        onClick={submitSurvey}
                        disabled={surveySubmitting}
                        style={{ padding: "0.5rem 1.25rem", background: "var(--sena-green)", color: "white", border: "none", borderRadius: 8, fontSize: "var(--text-sm)", fontWeight: 600, cursor: surveySubmitting ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", opacity: surveySubmitting ? 0.7 : 1 }}
                      >
                        {surveySubmitting ? "Enviando..." : "Enviar valoración"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info banner */}
          <div className="info-banner">
            <AlertCircle size={16} color="var(--sena-green)" style={{ flexShrink: 0 }} />
            <p>La información de esta cita es <strong>confidencial</strong>. Solo personal autorizado de Bienestar SENA puede acceder a los detalles.</p>
          </div>
        </div>
      </div>

      {/* ─── Modal cancelación ─── */}
      {cancelModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "1.75rem", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--gray-900)", marginBottom: "0.25rem" }}>Cancelar cita</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--gray-500)", marginBottom: "1.25rem", lineHeight: 1.55 }}>
              Esta acción no se puede deshacer. Puedes indicar el motivo para el registro del sistema.
            </p>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--gray-700)", marginBottom: "0.375rem" }}>
              Motivo <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(opcional)</span>
            </label>
            <textarea
              value={cancelModal.reason}
              onChange={e => setCancelModal(m => ({ ...m, reason: e.target.value }))}
              placeholder="Ej: El aprendiz no pudo asistir por motivos académicos..."
              maxLength={300}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.625rem 0.875rem", border: "1.5px solid var(--gray-200)", borderRadius: 10, fontSize: "0.875rem", color: "var(--gray-900)", resize: "none", outline: "none", fontFamily: "var(--font-sans)", marginBottom: "0.25rem" }}
              onFocus={e => e.target.style.borderColor = "#ef4444"}
              onBlur={e => e.target.style.borderColor = "var(--gray-200)"}
            />
            <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", textAlign: "right", marginBottom: "1rem" }}>{cancelModal.reason.length}/300</div>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={() => setCancelModal({ open: false, reason: "" })}
                style={{ flex: 1, padding: "0.75rem", background: "white", border: "1.5px solid var(--gray-200)", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", color: "var(--gray-700)" }}
              >
                Volver
              </button>
              <button
                onClick={executeCancel}
                style={{ flex: 2, padding: "0.75rem", background: "#ef4444", color: "white", border: "none", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Sí, cancelar cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal eliminar documento ─── */}
      {deleteModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "1.75rem", width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--gray-900)", marginBottom: "0.25rem" }}>Eliminar documento</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--gray-500)", marginBottom: "1.5rem", lineHeight: 1.55 }}>
              ¿Eliminar <strong style={{ color: "var(--gray-800)" }}>"{deleteModal.doc?.name}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={() => setDeleteModal({ open: false, doc: null })}
                style={{ flex: 1, padding: "0.75rem", background: "white", border: "1.5px solid var(--gray-200)", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", color: "var(--gray-700)" }}
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteDoc}
                style={{ flex: 2, padding: "0.75rem", background: "#ef4444", color: "white", border: "none", borderRadius: 10, fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
