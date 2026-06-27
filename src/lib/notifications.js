import { supabase } from "./supabase";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const G = "#39a900";

function fmtDate(d) {
  try { return format(typeof d === "string" ? parseISO(d) : d, "EEEE d 'de' MMMM, yyyy", { locale: es }); }
  catch { return d || ""; }
}

function fmtTime(t = "") {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f7e6;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7e6;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:${G};padding:24px 32px;">
  <div style="font-size:18px;font-weight:800;color:white;letter-spacing:-0.02em;">Bienestar SENA</div>
  <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Sistema de citas institucional</div>
</td></tr>
<tr><td style="padding:32px;">${content}</td></tr>
<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
  <div style="font-size:12px;color:#9ca3af;">Correo automático de Bienestar SENA. No respondas a este mensaje.</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function infoBox(items, bg = "#f0fdf4", border = "#bbf7d0") {
  return `<div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:16px;margin-bottom:20px;">
    ${items.map(({ label, value }) => `
      <div style="margin-bottom:8px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">${label}</div>
        <div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;text-transform:capitalize;">${value}</div>
      </div>`).join("")}
  </div>`;
}

async function send(payload) {
  try {
    await supabase.functions.invoke("notify-appointment", { body: payload });
  } catch {
    // silent — email is best-effort
  }
}

export async function notifyNewAppointment({ to_email, to_name, user_id, service_name, scheduled_date, scheduled_time }) {
  const html = wrap(`
    <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${to_name},</div>
    <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Cita agendada exitosamente</div>
    ${infoBox([
      { label: "Servicio", value: service_name },
      { label: "Fecha",    value: fmtDate(scheduled_date) },
      { label: "Hora",     value: fmtTime(scheduled_time) },
    ])}
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:13px;color:#92400e;line-height:1.6;">
      Tu cita está <strong>pendiente de confirmación</strong>. Recibirás otro correo cuando sea confirmada.
    </div>
  `);
  await send({ to_email, to_name, user_id, subject: "Cita agendada — Bienestar SENA", html });
}

export async function notifyAppointmentConfirmed({ to_email, to_name, user_id, service_name, scheduled_date, scheduled_time }) {
  const html = wrap(`
    <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${to_name},</div>
    <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Tu cita fue confirmada</div>
    ${infoBox([
      { label: "Servicio", value: service_name },
      { label: "Fecha",    value: fmtDate(scheduled_date) },
      { label: "Hora",     value: fmtTime(scheduled_time) },
    ])}
    <div style="font-size:13px;color:#6b7280;line-height:1.6;">
      Recuerda llegar <strong>10 minutos antes</strong> con tu documento de identidad y carné del SENA.
    </div>
  `);
  await send({ to_email, to_name, user_id, subject: "Tu cita fue confirmada — Bienestar SENA", html });
}

export async function notifyAppointmentCancelled({ to_email, to_name, user_id, service_name, scheduled_date, reason }) {
  const html = wrap(`
    <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${to_name},</div>
    <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Tu cita fue cancelada</div>
    ${infoBox([
      { label: "Servicio", value: service_name },
      { label: "Fecha",    value: fmtDate(scheduled_date) },
      ...(reason ? [{ label: "Motivo", value: reason }] : []),
    ], "#fef2f2", "#fecaca")}
    <div style="font-size:13px;color:#6b7280;line-height:1.6;">
      Puedes agendar una nueva cita cuando quieras desde tu portal de Bienestar SENA.
    </div>
  `);
  await send({ to_email, to_name, user_id, subject: "Tu cita fue cancelada — Bienestar SENA", html });
}
