import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://erp-snowy-one.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase function configuration.");
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace("Bearer ", "");
    if (!token) {
      return json({ error: "No autorizado." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await userClient.auth.getUser(token);
    if (callerError || !callerData.user) {
      return json({ error: "Sesion invalida." }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_super_admin")
      .eq("id", callerData.user.id)
      .single();

    if (profileError || !callerProfile?.is_super_admin) {
      return json({ error: "Solo un super-admin puede crear organizaciones." }, 403);
    }

    const body = await request.json();
    const organizationName = String(body.organizationName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || email).trim();

    if (!organizationName) {
      return json({ error: "El nombre de la organizacion es obligatorio." }, 400);
    }
    if (!email || !password || password.length < 6) {
      return json({ error: "Email y password de al menos 6 caracteres son obligatorios." }, 400);
    }

    const { data: organization, error: organizationError } = await adminClient
      .from("organizations")
      .insert({ name: organizationName })
      .select("id, name, created_at")
      .single();

    if (organizationError) {
      return json({ error: organizationError.message }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    const { data: profile, error: upsertError } = await adminClient
      .from("profiles")
      .upsert(
        { id: created.user.id, full_name: fullName, role: "admin", status: "active", organization_id: organization.id },
        { onConflict: "id" }
      )
      .select("id, full_name, role, status, organization_id, created_at")
      .single();

    if (upsertError) {
      return json({ error: upsertError.message }, 400);
    }

    return json({
      organization,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        status: profile.status,
        organizationId: profile.organization_id,
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    return json({ error: error.message || "No se pudo crear la organizacion." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
