import { isDatabaseConfigured, supabase } from "./supabaseClient";

// supabase-js sets `error` (a FunctionsHttpError with a generic message) and
// leaves `data` null on any non-2xx response — the actual "email ya existe" /
// "password muy corta" / etc. message lives in the error response body, not
// in error.message. Unwrap it so callers see the real reason.
async function unwrapFunctionError(error) {
  const detail = await error.context?.json?.().catch(() => null);
  return new Error(detail?.error || error.message);
}

export async function getInitialSession() {
  if (!isDatabaseConfigured) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function listenAuthChanges(callback) {
  if (!isDatabaseConfigured) return () => {};

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("[auth] event:", event, "session:", session ? session.user?.email : null);
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email, password, fullName) {
  const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
  return data.session;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function mapProfile(profile) {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    status: profile.status || "pending",
    companyName: profile.company_name || "",
    menuKeys: Array.isArray(profile.menu_keys) ? profile.menu_keys : null,
    organizationId: profile.organization_id || null,
    isSuperAdmin: Boolean(profile.is_super_admin),
    createdAt: profile.created_at,
  };
}

export async function getCurrentProfile(userId) {
  if (!isDatabaseConfigured) return { fullName: "Modo demo", role: "admin", status: "active", menuKeys: null };

  let id = userId;
  if (!id) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) return null;
    id = userData.user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, company_name, menu_keys, organization_id, is_super_admin")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null; // No existe perfil para este usuario (no usar .single() para evitar 406)
  return mapProfile(data);
}

export async function listUserProfiles() {
  if (!isDatabaseConfigured) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, company_name, menu_keys, organization_id, is_super_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapProfile);
}

export async function updateUserProfile(id, patch) {
  if (!isDatabaseConfigured) return null;

  const payload = {};
  if (patch.fullName !== undefined) payload.full_name = patch.fullName;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.companyName !== undefined) payload.company_name = patch.companyName || null;
  if (patch.menuKeys !== undefined) payload.menu_keys = Array.isArray(patch.menuKeys) && patch.menuKeys.length ? patch.menuKeys : null;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id, full_name, role, status, company_name, menu_keys, created_at")
    .single();

  if (error) throw error;
  return mapProfile(data);
}

export async function createUserAccount({ fullName, email, password, role, status, companyName, menuKeys }) {
  if (!isDatabaseConfigured) return null;

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { fullName, email, password, role, status, companyName, menuKeys },
  });

  if (error) throw await unwrapFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data.user;
}

export async function listOrganizations() {
  if (!isDatabaseConfigured) return [];

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map((org) => ({ id: org.id, name: org.name, createdAt: org.created_at }));
}

export async function createOrganization({ organizationName, email, password, fullName }) {
  if (!isDatabaseConfigured) return null;

  const { data, error } = await supabase.functions.invoke("create-organization", {
    body: { organizationName, email, password, fullName },
  });

  if (error) throw await unwrapFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return { organization: data.organization, user: data.user };
}
