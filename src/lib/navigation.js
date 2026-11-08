export const screens = [
  { key: "dashboard", label: "Dashboard", icon: "layout", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "clientes", label: "Clientes", icon: "briefcase", roles: ["admin", "direccion", "ventas"] },
  { key: "crm", label: "CRM", icon: "pipeline", roles: ["admin", "direccion", "ventas"] },
  { key: "importar", label: "Importar leads", icon: "upload", roles: ["admin", "direccion", "ventas"] },
  { key: "captador_leads", label: "Captador de Leads", icon: "camera", roles: ["admin", "direccion", "ventas"] },
  { key: "presupuestos", label: "Presupuestos", icon: "file", roles: ["admin", "direccion", "ventas", "finanzas", "cliente"] },
  { key: "cotizador", label: "Cotizador", icon: "chart", roles: ["admin", "direccion", "ventas", "finanzas"] },
  { key: "ventas", label: "Proceso ventas", icon: "map", roles: ["admin", "direccion", "ventas"] },
  { key: "ot", label: "Ordenes de trabajo", icon: "wrench", roles: ["admin", "direccion", "operaciones", "cliente"] },
  { key: "inventario", label: "Inventario", icon: "box", roles: ["admin", "direccion", "operaciones", "compras"] },
  { key: "compras", label: "Compras", icon: "cart", roles: ["admin", "direccion", "compras"] },
  { key: "finanzas", label: "Finanzas", icon: "wallet", roles: ["admin", "direccion", "finanzas"] },
  { key: "rrhh", label: "RRHH", icon: "users", roles: ["admin", "direccion", "rrhh"] },
  { key: "tareas", label: "Tareas", icon: "check", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "calendario", label: "Calendario", icon: "calendar", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "documentos", label: "Documentos", icon: "folder", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "auditoria", label: "Auditoria", icon: "activity", roles: ["admin", "direccion"] },
  { key: "usuarios", label: "Usuarios", icon: "userCog", roles: ["admin"] },
  { key: "reportes", label: "Reportes", icon: "chart", roles: ["admin", "direccion"] },
  { key: "organizaciones", label: "Organizaciones", icon: "building", roles: [] },
  { key: "configuracion", label: "Configuracion", icon: "userCog", roles: ["admin"] },
  { key: "precios", label: "Precios y condiciones", icon: "wallet", roles: ["admin", "direccion"] },
];

export const menuSections = [
  { title: "Gestion comercial", keys: ["dashboard", "clientes", "crm", "importar", "captador_leads", "presupuestos", "cotizador", "ventas"] },
  { title: "Operacion", keys: ["ot", "inventario", "compras", "finanzas", "rrhh"] },
  { title: "Control", keys: ["tareas", "calendario", "documentos", "auditoria", "usuarios", "reportes", "precios"] },
];

// Pantallas de plataforma: no son "modulos" de un plan/contrato, no se
// togglean por organizacion. "organizaciones" es exclusivo de super-admin;
// "configuracion" (nombre/marca/fiscal) la necesita toda organizacion.
const PLATFORM_SCREEN_KEYS = ["organizaciones", "configuracion"];

// Claves que un super-admin puede habilitar/deshabilitar por organizacion
// (que modulos incluye el plan que le vendimos a esa empresa cliente).
export const MODULE_KEYS = screens.filter((screen) => !PLATFORM_SCREEN_KEYS.includes(screen.key)).map((screen) => screen.key);

export const userRoles = ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh", "cliente"];
export const accountStatuses = ["pending", "active", "suspended"];

export function canAccessScreen(screen, profileOrRole, organization) {
  const profile = typeof profileOrRole === "string" ? { role: profileOrRole, menuKeys: null } : profileOrRole || {};
  if (screen.key === "organizaciones") return Boolean(profile.isSuperAdmin);
  if (screen.key === "configuracion") return profile.role === "admin";
  // Gate de modulo por organizacion: el super-admin (viendo/soportando otra
  // organizacion) nunca queda bloqueado por esto. `enabledModules` null o
  // vacio = sin restriccion (organizaciones viejas, o plan "todo incluido"),
  // mismo criterio que ya usa `menuKeys` en profiles.
  if (!profile.isSuperAdmin && Array.isArray(organization?.enabledModules) && organization.enabledModules.length && !organization.enabledModules.includes(screen.key)) {
    return false;
  }
  const roleAllowed = screen.roles.includes(profile.role || "ventas");
  if (!roleAllowed) return false;
  if (Array.isArray(profile.menuKeys) && profile.menuKeys.length) return profile.menuKeys.includes(screen.key);
  return true;
}

export function screensForRole(role) {
  return screens.filter((screen) => screen.roles.includes(role));
}
