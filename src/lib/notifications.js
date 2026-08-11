import { supabase } from "./supabase";

// El contenido del correo se reconstruye server-side en la Edge Function a partir del
// appointment_id (nunca se envía destinatario/asunto/HTML desde el cliente) — ver
// supabase/functions/notify-appointment/index.ts.
async function send(appointment_id, type, reason) {
  try {
    await supabase.functions.invoke("notify-appointment", { body: { appointment_id, type, reason } });
  } catch (e) {
    if (import.meta.env.DEV) console.error("[notify]", e);
  }
}

export const notifyNewAppointment       = (appointment_id) => send(appointment_id, "new");
export const notifyAppointmentConfirmed = (appointment_id) => send(appointment_id, "confirmed");
export const notifyAppointmentCancelled = (appointment_id, reason) => send(appointment_id, "cancelled", reason);
