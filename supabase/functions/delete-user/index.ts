import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar que el caller sea SUPERADMIN
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar el JWT del caller
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que el caller sea SUPERADMIN
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("roles(name)")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || (callerProfile as any).roles?.name !== "SUPERADMIN") {
      return new Response(JSON.stringify({ error: "Solo SUPERADMIN puede eliminar usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No permitir auto-eliminación
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "No puedes eliminarte a ti mismo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que el target no sea otro SUPERADMIN
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("roles(name)")
      .eq("id", user_id)
      .single();

    if ((targetProfile as any)?.roles?.name === "SUPERADMIN") {
      return new Response(JSON.stringify({ error: "No se puede eliminar a otro SUPERADMIN" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener email del usuario para limpiar invitaciones
    const { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(user_id);
    const targetEmail = targetUser?.email;

    // Eliminar usuario de auth (cascada a profiles → appointments)
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: "Error al eliminar el usuario: " + deleteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpiar invitaciones pendientes asociadas al email
    if (targetEmail) {
      await supabaseAdmin
        .from("staff_invitations")
        .update({ status: "cancelled" })
        .eq("email", targetEmail)
        .eq("status", "pending");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
