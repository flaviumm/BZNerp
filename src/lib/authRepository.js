import { isDatabaseConfigured, supabase } from "./supabaseClient";

export async function getInitialSession() {
  if (!isDatabaseConfigured) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function listenAuthChanges(callback) {
  if (!isDatabaseConfigured) return () => {};

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
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
    createdAt: profile.created_at,
  };
}

export async function getCurrentProfile() {
  if (!isDatabaseConfigured) return { fullName: "Modo demo", role: "admin", status: "active", menuKeys: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, company_name, menu_keys")
    .eq("id", userData.user.id)
    .single();

  if (error) throw error;
  return mapProfile(data);
}

export async function listUserProfiles() {
  if (!isDatabaseConfigured) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, company_name, menu_keys, created_at")
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

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.user;
}
