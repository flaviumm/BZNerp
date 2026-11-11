// Mantener en sincronia con screenKeys en supabase/functions/admin-create-user/index.ts.
// Inventario, Compras, Finanzas, RRHH y Captador de Leads quedan fuera del menu hasta
// tener CRUD real (ver docs/superpowers/specs/2026-11-10-cierre-erp-design.md).
export const screens = [
  { key: "dashboard", label: "Dashboard", icon: "layout", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "clientes", label: "Clientes", icon: "briefcase", roles: ["admin", "direccion", "ventas"] },
  { key: "crm", label: "CRM", icon: "pipeline", roles: ["admin", "direccion", "ventas"] },
  { key: "importar", label: "Importar leads", icon: "upload", roles: ["admin", "direccion", "ventas"] },
  { key: "presupuestos", label: "Presupuestos", icon: "file", roles: ["admin", "direccion", "ventas", "finanzas", "cliente"] },
  { key: "cotizador", label: "Cotizador", icon: "chart", roles: ["admin", "direccion", "ventas", "finanzas"] },
  { key: "ventas", label: "Proceso ventas", icon: "map", roles: ["admin", "direccion", "ventas"] },
  { key: "ot", label: "Ordenes de trabajo", icon: "wrench", roles: ["admin", "direccion", "operaciones", "cliente"] },
  { key: "tareas", label: "Tareas", icon: "check", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "calendario", label: "Calendario", icon: "calendar", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "documentos", label: "Documentos", icon: "folder", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "auditoria", label: "Auditoria", icon: "activity", roles: ["admin", "direccion"] },
  { key: "usuarios", label: "Usuarios", icon: "userCog", roles: ["admin"] },
  { key: "reportes", label: "Reportes", icon: "chart", roles: ["admin", "direccion", "finanzas"] },
  { key: "organizaciones", label: "Organizaciones", icon: "building", roles: [] },
  { key: "configuracion", label: "Configuracion", icon: "userCog", roles: ["admin"] },
];

export const menuSections = [
  { title: "Gestion comercial", keys: ["dashboard", "clientes", "crm", "importar", "presupuestos", "cotizador", "ventas"] },
  { title: "Operacion", keys: ["ot", "tareas", "calendario"] },
  { title: "Control", keys: ["documentos", "auditoria", "usuarios", "reportes"] },
];

// Pantallas donde el boton "Nuevo" abre el alta rapida.
export const creatableScreens = new Set(["clientes", "crm", "ot", "tareas"]);

export const userRoles = ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh", "cliente"];
export const accountStatuses = ["pending", "active", "suspended"];

export function canAccessScreen(screen, profileOrRole) {
  const profile = typeof profileOrRole === "string" ? { role: profileOrRole, menuKeys: null } : profileOrRole || {};
  if (screen.key === "organizaciones") return Boolean(profile.isSuperAdmin);
  if (screen.key === "configuracion") return profile.role === "admin";
  const roleAllowed = screen.roles.includes(profile.role || "ventas");
  if (!roleAllowed) return false;
  if (Array.isArray(profile.menuKeys) && profile.menuKeys.length) return profile.menuKeys.includes(screen.key);
  return true;
}

export function screensForRole(role) {
  return screens.filter((screen) => screen.roles.includes(role));
}
