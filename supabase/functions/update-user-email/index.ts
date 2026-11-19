import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar el JWT del caller
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) return json({ error: "Token inválido" }, 401);

    // Solo administradores pueden cambiar el correo de otros usuarios
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("roles(name)")
      .eq("id", caller.id)
      .single();

    const callerRole = (callerProfile as any)?.roles?.name;
    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(callerRole)) {
      return json({ error: "Solo administradores pueden cambiar correos" }, 403);
    }

    const { user_id, email } = await req.json();
    if (!user_id || !email) return json({ error: "user_id y email son requeridos" }, 400);

    const normalized = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return json({ error: "El correo no tiene un formato válido" }, 400);
    }

    // No permitir tocar otro SUPERADMIN salvo que el caller sea SUPERADMIN
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("roles(name)")
      .eq("id", user_id)
      .single();

    if ((targetProfile as any)?.roles?.name === "SUPERADMIN" && callerRole !== "SUPERADMIN") {
      return json({ error: "No puedes cambiar el correo de otro SUPERADMIN" }, 403);
    }

    // Cambio directo (sin enlace de confirmación): vía admin API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      email: normalized,
    });
    if (updateErr) return json({ error: "Error al actualizar el correo: " + updateErr.message }, 500);

    // Mantener profiles.email en sincronía (es lo que muestra Gestión de usuarios)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ email: normalized })
      .eq("id", user_id);
    if (profileErr) console.error("No se pudo sincronizar profiles.email:", profileErr.message);

    return json({ success: true });
  } catch {
    return json({ error: "Error interno del servidor" }, 500);
  }
});
