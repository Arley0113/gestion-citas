import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") || "https://gestion-citas.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Verificar que el llamante sea ADMINISTRADOR o SUPERADMIN
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

    const { data: callerProfile } = await supabaseUser
      .from("profiles")
      .select("roles(name)")
      .eq("id", caller.id)
      .single();

    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(callerProfile?.roles?.name)) {
      return new Response(JSON.stringify({ error: "Sin permisos para invitar staff" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role_id, dependency_id, password } = await req.json();
    if (!email || !role_id || !password) {
      return new Response(JSON.stringify({ error: "email, role_id y password son requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Un ADMINISTRADOR (rol sin permisos de sistema) no puede otorgar SUPERADMIN — solo otro SUPERADMIN puede.
    // El <select> del formulario ya lo oculta, pero el servidor es el que debe hacerlo cumplir.
    const { data: targetRole } = await supabaseAdmin.from("roles").select("name").eq("id", role_id).single();
    if (targetRole?.name === "SUPERADMIN" && callerProfile?.roles?.name !== "SUPERADMIN") {
      return new Response(JSON.stringify({ error: "Solo un SUPERADMIN puede asignar el rol SUPERADMIN" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar si el usuario ya existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === email);

    if (existing) {
      // Usuario ya existe: actualizar contraseña y perfil
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
      await supabaseAdmin
        .from("profiles")
        .update({ role_id, dependency_id: dependency_id || null })
        .eq("id", existing.id);
    } else {
      // Usuario nuevo: crear con contraseña temporal
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) throw createErr;

      // Crear perfil
      await supabaseAdmin.from("profiles").upsert({
        id: newUser.user.id,
        role_id,
        dependency_id: dependency_id || null,
        onboarding_completed: false,
      }, { onConflict: "id" });
    }

    // Registrar invitación
    await supabaseAdmin.from("staff_invitations").insert({
      email,
      role_id,
      dependency_id: dependency_id || null,
      invited_by: caller.id,
      status: "accepted",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
