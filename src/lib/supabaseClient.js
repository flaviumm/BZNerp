import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const allowDemoMode = import.meta.env.VITE_ALLOW_DEMO_MODE === "true";

export const isDatabaseConfigured = Boolean(url && anonKey);
export const isProductionBuild = import.meta.env.PROD;
export const isDemoModeAllowed = !isProductionBuild || allowDemoMode;
export const shouldBlockUnconfiguredDatabase = !isDatabaseConfigured && !isDemoModeAllowed;

export const supabase = isDatabaseConfigured ? createClient(url, anonKey) : null;
