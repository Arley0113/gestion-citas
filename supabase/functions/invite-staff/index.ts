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
    // Verificar que el llamante esté autenticado y sea ADMINISTRADOR o SUPERADMIN.
    // Sin este bloque cualquier caller (autenticado o no, según verify_jwt) podía
    // crear/actualizar usuarios con cualquier rol, incluido SUPERADMIN.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await supabaseUser
      .from("profiles")
      .select("roles(name)")
      .eq("id", caller.id)
      .single();

    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(callerProfile?.roles?.name)) {
      return new Response(
        JSON.stringify({ error: "Sin permisos para invitar staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role_id, dependency_id, password } = await req.json();

    if (!email || !role_id) {
      return new Response(
        JSON.stringify({ error: "email y role_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Un ADMINISTRADOR (rol sin permisos de sistema) no puede otorgar SUPERADMIN —
    // solo otro SUPERADMIN puede. El <select> del formulario ya lo oculta, pero el
    // servidor es el que debe hacerlo cumplir.
    const { data: targetRole } = await supabaseAdmin.from("roles").select("name").eq("id", role_id).single();
    if (targetRole?.name === "SUPERADMIN" && callerProfile?.roles?.name !== "SUPERADMIN") {
      return new Response(
        JSON.stringify({ error: "Solo un SUPERADMIN puede asignar el rol SUPERADMIN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar invitación pendiente existente
    const { data: existing } = await supabaseAdmin
      .from("staff_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Ya existe una invitación pendiente para este correo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registrar invitación
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: invError } = await supabaseAdmin
      .from("staff_invitations")
      .insert({
        email,
        role_id,
        dependency_id: dependency_id || null,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invError) {
      return new Response(
        JSON.stringify({ error: "Error al registrar la invitación" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear usuario con contraseña temporal (email confirmado automáticamente)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      // Si el usuario ya existe, actualizar su contraseña Y su rol en el perfil
      if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
          if (updateErr) {
            await supabaseAdmin.from("staff_invitations").delete().eq("id", invitation.id);
            return new Response(
              JSON.stringify({ error: "Error al actualizar la contraseña: " + updateErr.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // Actualizar rol y dependencia en el perfil
          await supabaseAdmin
            .from("profiles")
            .update({ role_id, dependency_id: dependency_id || null })
            .eq("id", existingUser.id);
          // Marcar invitación como aceptada
          await supabaseAdmin
            .from("staff_invitations")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("id", invitation.id);
        }
      } else {
        await supabaseAdmin.from("staff_invitations").delete().eq("id", invitation.id);
        return new Response(
          JSON.stringify({ error: "Error al crear el usuario: " + createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, invitation_id: invitation.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
