// Edge Function: send-reminders
// Envía recordatorios por email de las citas que ocurren "mañana" (ventana de 24h).
// Pensada para ejecutarse por cron (pg_cron / Supabase Scheduled Functions) una vez al día.
// Autenticación: requiere la CRON_SECRET en el header x-cron-secret, o una service-role JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const G = "#39a900";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fmtDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return d; }
}

function fmtTime(t = "") {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

function buildHtml({ to_name, service_name, scheduled_date, scheduled_time, location }: Record<string, string>) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f7e6;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7e6;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:${G};padding:24px 32px;">
  <div style="font-size:18px;font-weight:800;color:white;letter-spacing:-0.02em;">Bienestar SENA</div>
  <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Sistema de citas institucional</div>
</td></tr>
<tr><td style="padding:32px;">
  <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${esc(to_name)},</div>
  <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Recordatorio: tienes una cita mañana</div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:20px;">
    <div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Servicio</div><div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;text-transform:capitalize;">${esc(service_name)}</div></div>
    <div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Fecha</div><div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;text-transform:capitalize;">${fmtDate(scheduled_date)}</div></div>
    <div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Hora</div><div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;">${fmtTime(scheduled_time)}</div></div>
    ${location ? `<div><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Lugar</div><div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;">${esc(location)}</div></div>` : ""}
  </div>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:13px;color:#92400e;line-height:1.6;">
    Si no puedes asistir, por favor cancela la cita con anticipación desde la plataforma.
  </div>
</td></tr>
<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
  <div style="font-size:12px;color:#9ca3af;">Correo automático de Bienestar SENA. No respondas a este mensaje.</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  // Solo aceptamos POST autenticado por CRON_SECRET (o service role).
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const isService = serviceKey && authHeader === `Bearer ${serviceKey}`;
  if (!isService && (!cronSecret || provided !== cronSecret)) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey,
  );

  // Rango: citas de "mañana" (día calendario siguiente, hora Colombia UTC-5).
  const now = new Date();
  const tomorrow = new Date(now.getTime() - 5 * 3600_000); // a hora local aprox
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const { data: appts, error } = await admin
    .from("appointments")
    .select("id, user_id, scheduled_date, scheduled_time, reminder_sent, status, dependencies(name)")
    .eq("scheduled_date", dateStr)
    .in("status", ["pending", "confirmed"])
    .or("reminder_sent.is.null,reminder_sent.eq.false");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Ubicación configurable
  const { data: locRow } = await admin
    .from("system_settings").select("value").eq("key", "appointment_location").maybeSingle();
  const location = locRow?.value || "";

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  let sent = 0;

  for (const apt of appts || []) {
    // email + nombre desde auth.users
    const { data: authUser } = await admin.auth.admin.getUserById(apt.user_id);
    const email = authUser?.user?.email;
    if (!email) continue;

    // nombre desde profiles
    const { data: prof } = await admin
      .from("profiles").select("full_name").eq("id", apt.user_id).maybeSingle();

    const html = buildHtml({
      to_name: prof?.full_name || "Aprendiz",
      service_name: (apt as any).dependencies?.name || "Bienestar",
      scheduled_date: apt.scheduled_date,
      scheduled_time: apt.scheduled_time,
      location,
    });

    if (RESEND_API_KEY) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Bienestar SENA <noreply@bienestar-sena.co>",
            to: [email],
            subject: "Recordatorio de tu cita — Bienestar SENA",
            html,
          }),
        });
        if (res.ok) sent++;
      } catch (e) {
        console.error("[send-reminders] resend", (e as Error).message);
      }
    }

    // Marcar como enviado para no duplicar
    await admin.from("appointments").update({ reminder_sent: true }).eq("id", apt.id);
  }

  return new Response(JSON.stringify({ success: true, date: dateStr, candidates: appts?.length || 0, sent }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
