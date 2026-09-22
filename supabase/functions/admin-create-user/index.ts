import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://erp-snowy-one.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roles = new Set(["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh", "cliente"]);
const statuses = new Set(["pending", "active", "suspended"]);
const screenKeys = new Set([
  "dashboard",
  "clientes",
  "crm",
  "importar",
  "presupuestos",
  "cotizador",
  "ot",
  "inventario",
  "compras",
  "finanzas",
  "rrhh",
  "tareas",
  "calendario",
  "documentos",
  "auditoria",
  "usuarios",
  "reportes",
]);

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
      .select("role, status, organization_id")
      .eq("id", callerData.user.id)
      .single();

    if (
      profileError ||
      callerProfile?.role !== "admin" ||
      callerProfile?.status !== "active" ||
      !callerProfile?.organization_id
    ) {
      return json({ error: "Solo un administrador activo de una organizacion puede crear usuarios." }, 403);
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || email).trim();
    const role = roles.has(body.role) ? body.role : "ventas";
    const status = statuses.has(body.status) ? body.status : "pending";
    const companyName = String(body.companyName || "").trim() || null;
    const menuKeys = Array.isArray(body.menuKeys)
      ? body.menuKeys.filter((key: unknown) => screenKeys.has(String(key))).map(String)
      : [];

    if (!email || !password || password.length < 6) {
      return json({ error: "Email y password de al menos 6 caracteres son obligatorios." }, 400);
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
        {
          id: created.user.id,
          full_name: fullName,
          role,
          status,
          company_name: companyName,
          menu_keys: menuKeys.length ? menuKeys : null,
          organization_id: callerProfile.organization_id,
        },
        { onConflict: "id" }
      )
      .select("id, full_name, role, status, company_name, menu_keys, organization_id, created_at")
      .single();

    if (upsertError) {
      return json({ error: upsertError.message }, 400);
    }

    return json({
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        status: profile.status,
        companyName: profile.company_name || "",
        menuKeys: Array.isArray(profile.menu_keys) ? profile.menu_keys : null,
        organizationId: profile.organization_id,
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    return json({ error: error.message || "No se pudo crear el usuario." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
