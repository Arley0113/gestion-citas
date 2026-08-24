import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") || "https://gestion-citas.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Roles que pueden gestionar citas de cualquier aprendiz (mismo límite que la RLS de `appointments`)
const STAFF_ROLES = ["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL", "COORDINACION", "ADMINISTRADOR", "SUPERADMIN"];

const G = "#39a900";

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fmtDate(dateStr: string) {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch { return dateStr || ""; }
}

function fmtTime(t = "") {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

function wrap(content: string) {
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

function infoBox(items: { label: string; value: string }[], bg = "#f0fdf4", border = "#bbf7d0") {
  return `<div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:16px;margin-bottom:20px;">
    ${items.map(({ label, value }) => `
      <div style="margin-bottom:8px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">${label}</div>
        <div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;text-transform:capitalize;">${value}</div>
      </div>`).join("")}
  </div>`;
}

type Apt = { to_name: string; service_name: string; scheduled_date: string; scheduled_time: string };

const TEMPLATES: Record<string, (apt: Apt, reason?: string) => { subject: string; html: string }> = {
  new: (apt) => ({
    subject: "Cita agendada — Bienestar SENA",
    html: wrap(`
      <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${esc(apt.to_name)},</div>
      <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Cita agendada exitosamente</div>
      ${infoBox([
        { label: "Servicio", value: esc(apt.service_name) },
        { label: "Fecha",    value: fmtDate(apt.scheduled_date) },
        { label: "Hora",     value: fmtTime(apt.scheduled_time) },
      ])}
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:13px;color:#92400e;line-height:1.6;">
        Tu cita está <strong>pendiente de confirmación</strong>. Recibirás otro correo cuando sea confirmada.
      </div>
    `),
  }),
  confirmed: (apt) => ({
    subject: "Tu cita fue confirmada — Bienestar SENA",
    html: wrap(`
      <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${esc(apt.to_name)},</div>
      <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Tu cita fue confirmada</div>
      ${infoBox([
        { label: "Servicio", value: esc(apt.service_name) },
        { label: "Fecha",    value: fmtDate(apt.scheduled_date) },
        { label: "Hora",     value: fmtTime(apt.scheduled_time) },
      ])}
      <div style="font-size:13px;color:#6b7280;line-height:1.6;">
        Recuerda llegar <strong>10 minutos antes</strong> con tu documento de identidad y carné del SENA.
      </div>
    `),
  }),
  cancelled: (apt, reason) => ({
    subject: "Tu cita fue cancelada — Bienestar SENA",
    html: wrap(`
      <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Hola ${esc(apt.to_name)},</div>
      <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.025em;margin-bottom:16px;">Tu cita fue cancelada</div>
      ${infoBox([
        { label: "Servicio", value: esc(apt.service_name) },
        { label: "Fecha",    value: fmtDate(apt.scheduled_date) },
        ...(reason ? [{ label: "Motivo", value: esc(reason) }] : []),
      ], "#fef2f2", "#fecaca")}
      <div style="font-size:13px;color:#6b7280;line-height:1.6;">
        Puedes agendar una nueva cita cuando quieras desde tu portal de Bienestar SENA.
      </div>
    `),
  }),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar usuario autenticado
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointment_id, type, reason } = await req.json();
    if (!appointment_id || !TEMPLATES[type]) {
      return new Response(JSON.stringify({ error: "appointment_id y type son requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Todo el contenido del correo se reconstruye server-side a partir de una cita real —
    // nunca se acepta destinatario, asunto ni HTML del cliente (evita usarse como relay de spam/phishing).
    const { data: apt } = await admin
      .from("appointments")
      .select("user_id, scheduled_date, scheduled_time, profiles!user_id(full_name), dependencies(name)")
      .eq("id", appointment_id)
      .single();

    if (!apt) {
      return new Response(JSON.stringify({ error: "Cita no encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autorización: el propio dueño de la cita, o staff/admin (mismo límite que la RLS de appointments)
    let authorized = caller.id === apt.user_id;
    if (!authorized) {
      const { data: callerProfile } = await supabaseUser
        .from("profiles")
        .select("roles(name)")
        .eq("id", caller.id)
        .single();
      authorized = STAFF_ROLES.includes(callerProfile?.roles?.name);
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Sin permisos para notificar esta cita" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // El destinatario SIEMPRE es el dueño real de la cita, resuelto server-side — nunca el que envía el request
    const { data: authUser } = await admin.auth.admin.getUserById(apt.user_id);
    const to_email = authUser?.user?.email;
    if (!to_email) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Preferencia del aprendiz (Ajustes → Notificaciones). Sin fila en user_settings
    // se asume activado (mismo default que ConfiguracionPage.jsx). "new" no tiene
    // toggle propio — es el recibo de la propia acción del aprendiz, siempre se envía.
    const PREF_KEY: Record<string, string> = { confirmed: "confirmacion", cancelled: "cancelacion" };
    if (PREF_KEY[type]) {
      const { data: settingsRow } = await admin
        .from("user_settings").select("settings").eq("user_id", apt.user_id).maybeSingle();
      if (settingsRow?.settings?.notifs?.[PREF_KEY[type]] === false) {
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "user_opted_out" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_api_key" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = TEMPLATES[type]({
      to_name: apt.profiles?.full_name || "Aprendiz",
      service_name: apt.dependencies?.name || "Bienestar",
      scheduled_date: apt.scheduled_date,
      scheduled_time: apt.scheduled_time,
    }, typeof reason === "string" ? reason : undefined);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Bienestar SENA <noreply@bienestar.bookstyle.co>",
        to: [to_email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-appointment]", err.message);
    // Errores de notificación son no-críticos
    return new Response(JSON.stringify({ success: true, skipped: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
