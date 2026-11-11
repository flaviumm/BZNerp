import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDatabaseConfigured = Boolean(url && anonKey);
export const isProductionBuild = import.meta.env.PROD;
// En produccion nunca hay modo demo: si faltan las variables de Supabase se
// muestra la pantalla de configuracion, no datos locales.
export const isDemoModeAllowed = !isProductionBuild;
export const shouldBlockUnconfiguredDatabase = !isDatabaseConfigured && !isDemoModeAllowed;

export const supabase = isDatabaseConfigured ? createClient(url, anonKey) : null;
