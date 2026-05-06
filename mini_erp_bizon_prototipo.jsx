import React, { useEffect, useMemo, useState } from "react";
import { deleteErpRecord, isDatabaseConfigured, loadErpData, logAuditEvent, nextDocumentNumber, saveErpRecord, shouldBlockUnconfiguredDatabase, updateErpRecord, uploadDocumentFile } from "./src/lib/erpRepository";
import { getCurrentProfile, getInitialSession, listenAuthChanges, signInWithEmail, signOutUser, signUpWithEmail } from "./src/lib/authRepository";

const initialCompanies = [
  { id: 1, name: "Neuquen Energy Services", type: "Oil & Gas", city: "Anelo", status: "Prospecto", contact: "Mariana Rios", phone: "+54 299 443-1020", next: "Llamar compras", value: 18500000 },
  { id: 2, name: "Constructora Patagonia Norte", type: "Constructora", city: "Neuquen", status: "Activo", contact: "Pablo Castro", phone: "+54 299 521-8870", next: "Enviar presupuesto", value: 7200000 },
  { id: 3, name: "Estudio Arq. Sur", type: "Arquitectura", city: "Plottier", status: "Contactado", contact: "Lucia Herrera", phone: "+54 299 600-1450", next: "Reunion tecnica", value: 3900000 },
  { id: 4, name: "Servicios Industriales VM", type: "Industria", city: "Centenario", status: "Negociacion", contact: "Victor Molina", phone: "+54 299 477-3099", next: "Definir alcance", value: 12600000 },
  { id: 5, name: "Municipalidad de San Patricio", type: "Sector publico", city: "San Patricio del Chanar", status: "Activo", contact: "Carolina Funes", phone: "+54 299 489-7721", next: "Presentar avance", value: 5100000 },
];

const initialOpportunities = [
  { id: 1, company: "Neuquen Energy Services", service: "Piletas industriales", stage: "Nuevo prospecto", amount: 18500000, probability: 25, owner: "Ventas", due: "2026-05-09" },
  { id: 2, company: "Constructora Patagonia Norte", service: "Estructuras metalicas", stage: "Presupuesto enviado", amount: 7200000, probability: 65, owner: "Direccion", due: "2026-05-07" },
  { id: 3, company: "Estudio Arq. Sur", service: "Barandas y escaleras", stage: "Reunion", amount: 3900000, probability: 40, owner: "Ventas", due: "2026-05-10" },
  { id: 4, company: "Servicios Industriales VM", service: "Tableros electricos", stage: "Negociacion", amount: 12600000, probability: 75, owner: "Ingenieria", due: "2026-05-06" },
  { id: 5, company: "Municipalidad de San Patricio", service: "Mantenimiento urbano", stage: "Ganado", amount: 5100000, probability: 100, owner: "Operaciones", due: "2026-05-13" },
];

const initialQuotes = [
  { number: "P-0001", client: "Constructora Patagonia Norte", service: "Estructuras metalicas", subtotal: 5950413, tax: 1249587, total: 7200000, status: "Enviado", validUntil: "2026-05-20" },
  { number: "P-0002", client: "Servicios Industriales VM", service: "Tableros electricos", subtotal: 10413223, tax: 2186777, total: 12600000, status: "En revision", validUntil: "2026-05-18" },
  { number: "P-0003", client: "Estudio Arq. Sur", service: "Barandas", subtotal: 3223140, tax: 676860, total: 3900000, status: "Borrador", validUntil: "2026-05-25" },
];

const initialWorkOrders = [
  { number: "OT-0001", client: "Constructora Patagonia Norte", service: "Estructuras metalicas", status: "En ejecucion", progress: 55, margin: 31, start: "2026-04-28", end: "2026-05-17", team: "Taller A" },
  { number: "OT-0002", client: "Servicios Industriales VM", service: "Tableros electricos", status: "Programada", progress: 15, margin: 38, start: "2026-05-08", end: "2026-05-21", team: "Electricidad" },
  { number: "OT-0003", client: "Neuquen Energy Services", service: "Piletas industriales", status: "Pendiente", progress: 0, margin: 35, start: "2026-05-15", end: "2026-06-02", team: "Taller B" },
  { number: "OT-0004", client: "Municipalidad de San Patricio", service: "Mantenimiento urbano", status: "En ejecucion", progress: 72, margin: 27, start: "2026-04-25", end: "2026-05-12", team: "Campo" },
];

const inventory = [
  { sku: "MAT-001", name: "Chapa galvanizada 2mm", category: "Metales", stock: 18, min: 12, unit: "planchas", cost: 86500 },
  { sku: "MAT-002", name: "Perfil UPN 100", category: "Metales", stock: 34, min: 20, unit: "barras", cost: 112000 },
  { sku: "ELE-014", name: "Disyuntor trifasico 40A", category: "Electricidad", stock: 6, min: 10, unit: "unidades", cost: 74200 },
  { sku: "SEG-009", name: "EPP soldador completo", category: "Seguridad", stock: 9, min: 8, unit: "kits", cost: 156000 },
  { sku: "PNT-003", name: "Pintura epoxi industrial", category: "Pintura", stock: 4, min: 6, unit: "latas", cost: 91300 },
];

const purchases = [
  { number: "OC-0041", supplier: "Aceros del Valle", area: "Taller", total: 1865000, status: "Recibida", due: "2026-05-04" },
  { number: "OC-0042", supplier: "Electro Patagonia", area: "Electricidad", total: 942000, status: "Pendiente", due: "2026-05-08" },
  { number: "OC-0043", supplier: "Pintureria Industrial Sur", area: "Terminacion", total: 318000, status: "Autorizacion", due: "2026-05-06" },
];

const invoices = [
  { number: "F-00084", client: "Constructora Patagonia Norte", concept: "Anticipo OT-0001", total: 2880000, status: "Cobrada", due: "2026-04-30" },
  { number: "F-00085", client: "Municipalidad de San Patricio", concept: "Certificado avance", total: 1530000, status: "Pendiente", due: "2026-05-12" },
  { number: "F-00086", client: "Servicios Industriales VM", concept: "Anticipo tablero", total: 3780000, status: "Por vencer", due: "2026-05-09" },
];

const employees = [
  { id: 1, name: "Sofia Becerra", role: "Administracion", team: "Backoffice", status: "Disponible", hours: 148 },
  { id: 2, name: "Diego Saez", role: "Soldador", team: "Taller A", status: "Asignado", hours: 162 },
  { id: 3, name: "Martin Quiroga", role: "Tecnico electrico", team: "Electricidad", status: "Asignado", hours: 154 },
  { id: 4, name: "Nadia Perez", role: "Jefa de obra", team: "Campo", status: "Asignado", hours: 170 },
  { id: 5, name: "Tomas Aguilar", role: "Compras", team: "Backoffice", status: "Disponible", hours: 144 },
];

const tasks = [
  { id: 1, text: "Cerrar alcance de piletas industriales", owner: "Ingenieria", priority: "Alta", due: "2026-05-06" },
  { id: 2, text: "Confirmar entrega de disyuntores", owner: "Compras", priority: "Media", due: "2026-05-08" },
  { id: 3, text: "Enviar certificado de avance municipal", owner: "Administracion", priority: "Alta", due: "2026-05-07" },
  { id: 4, text: "Revisar margen de OT-0004", owner: "Direccion", priority: "Media", due: "2026-05-09" },
];

const initialDocuments = [
  { id: 1, kind: "Presupuesto", relatedType: "Presupuesto", relatedNumber: "P-0001", name: "presupuesto-estructuras.pdf", mimeType: "application/pdf", size: 248000, storagePath: "demo/presupuesto-estructuras.pdf", url: "", notes: "Version enviada al cliente", createdAt: "2026-05-05" },
  { id: 2, kind: "Certificado", relatedType: "OT", relatedNumber: "OT-0004", name: "certificado-avance-municipal.pdf", mimeType: "application/pdf", size: 184000, storagePath: "demo/certificado-avance-municipal.pdf", url: "", notes: "Avance mensual", createdAt: "2026-05-05" },
];

const initialAuditLog = [
  { id: 1, action: "create", module: "system", recordKey: "init", summary: "ERP inicializado con datos base", actorName: "Sistema", createdAt: "2026-05-05T18:00:00.000Z" },
];

const localDatabaseKey = "bizon_erp_local_database_v1";

const screens = [
  { key: "dashboard", label: "Dashboard", icon: "DB", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "clientes", label: "Clientes", icon: "CL", roles: ["admin", "direccion", "ventas"] },
  { key: "crm", label: "CRM", icon: "CR", roles: ["admin", "direccion", "ventas"] },
  { key: "presupuestos", label: "Presupuestos", icon: "PR", roles: ["admin", "direccion", "ventas", "finanzas"] },
  { key: "ot", label: "Ordenes de trabajo", icon: "OT", roles: ["admin", "direccion", "operaciones"] },
  { key: "inventario", label: "Inventario", icon: "IN", roles: ["admin", "direccion", "operaciones", "compras"] },
  { key: "compras", label: "Compras", icon: "CO", roles: ["admin", "direccion", "compras"] },
  { key: "finanzas", label: "Finanzas", icon: "FI", roles: ["admin", "direccion", "finanzas"] },
  { key: "rrhh", label: "RRHH", icon: "RH", roles: ["admin", "direccion", "rrhh"] },
  { key: "tareas", label: "Tareas", icon: "TA", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "calendario", label: "Calendario", icon: "CA", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "documentos", label: "Documentos", icon: "DO", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "auditoria", label: "Auditoria", icon: "AU", roles: ["admin", "direccion"] },
  { key: "reportes", label: "Reportes", icon: "RE", roles: ["admin", "direccion"] },
];

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function pct(value) {
  return `${Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

function sum(list, field) {
  return list.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function weightedPipeline(list) {
  return list.reduce((total, item) => total + (item.amount * item.probability) / 100, 0);
}

function nextLocalNumber(items, prefix, padding = 4, field = "number") {
  const max = items.reduce((highest, item) => {
    const value = String(item[field] || "");
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

function runTests() {
  const pipelineTotal = sum(initialOpportunities, "amount");
  const stockAlerts = inventory.filter((item) => item.stock <= item.min);
  console.assert(initialCompanies.length >= 5, "Debe haber al menos 5 clientes demo");
  console.assert(pipelineTotal === 47300000, "El pipeline demo debe sumar 47.300.000");
  console.assert(weightedPipeline(initialOpportunities) === 25415000, "El pipeline ponderado debe ser 25.415.000");
  console.assert(stockAlerts.length === 2, "Debe detectar 2 alertas de stock");
  console.assert(screens.length >= 10, "Debe incluir los modulos centrales del ERP");
  console.assert(money(1000).includes("1.000") || money(1000).includes("1000"), "Debe formatear moneda ARS");
}

try {
  runTests();
} catch (error) {
  console.warn("Tests del ERP demo no ejecutados:", error);
}

function IconMark({ children, active = false }) {
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black transition ${active ? "bg-[#ff7900] text-black shadow-sm" : "bg-transparent text-zinc-500 group-hover:bg-[#fff1e5] group-hover:text-[#ff7900]"}`}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", type = "button" }) {
  const styles = {
    primary: "border-[#ff7900] bg-[#ff7900] text-black shadow-sm hover:bg-[#ff8f1f]",
    ghost: "border-[#e7e7e2] bg-white text-zinc-700 hover:border-[#cfd8d3] hover:bg-[#f7faf8]",
    danger: "border-[#f1c9c9] bg-[#fff4f3] text-[#b42318] hover:bg-[#ffe7e4]",
  };
  return (
    <button type={type} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${styles[variant]}`}>
      {children}
    </button>
  );
}

function Badge({ children, tone = "zinc" }) {
  const tones = {
    zinc: "border-[#e7e7e2] bg-[#f7f7f4] text-zinc-600",
    green: "border-[#ffd2ad] bg-[#fff3e8] text-[#d85f00]",
    amber: "border-[#f4dfb6] bg-[#fff8e8] text-[#9a6500]",
    red: "border-[#f2c9c9] bg-[#fff3f1] text-[#b42318]",
    blue: "border-[#d8ddff] bg-[#f3f4ff] text-[#4a55c8]",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.zinc}`}>{children}</span>;
}

function toneForStatus(status) {
  if (["Activo", "Ganado", "Cobrada", "Recibida", "Disponible"].includes(status)) return "green";
  if (["Pendiente", "Por vencer", "Programada", "Autorizacion", "Contactado"].includes(status)) return "amber";
  if (["Borrador", "Prospecto", "Nuevo prospecto"].includes(status)) return "blue";
  if (["Vencida", "Bloqueado"].includes(status)) return "red";
  return "zinc";
}

function Panel({ children, className = "" }) {
  return <section className={`rounded-xl border border-[#e8e8e3] bg-white shadow-[0_18px_45px_rgba(22,31,26,0.05)] ${className}`}>{children}</section>;
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-zinc-700">
      {label}
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className="min-h-10 rounded-lg border border-[#e4e4de] bg-[#fbfbf8] px-3 text-sm text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:bg-white focus:ring-2" />;
}

function Select(props) {
  return <select {...props} className="min-h-10 rounded-lg border border-[#e4e4de] bg-[#fbfbf8] px-3 text-sm text-zinc-900 outline-none ring-[#ff7900] transition focus:border-[#ff7900] focus:bg-white focus:ring-2" />;
}

function canAccessScreen(screen, role) {
  return screen.roles.includes(role);
}

function Header({ activeLabel, onNew, databaseStatus, profile, onSignOut, onExportBackup, onResetLocal }) {
  return (
    <header className="border-b border-[#ecece6] bg-[#fbfbf8]/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="h-10 w-10 rounded-lg bg-black object-contain p-1 lg:hidden" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
            <h1 className="mt-1 text-2xl font-black text-[#050505]">{activeLabel}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile && <Badge tone="blue">{profile.fullName} - {profile.role}</Badge>}
          <Badge tone={databaseStatus === "Conectado a Supabase" || databaseStatus === "Base local" ? "green" : databaseStatus === "Error de base" ? "red" : "amber"}>{databaseStatus}</Badge>
          <Button variant="ghost" onClick={onExportBackup}>Exportar</Button>
          {onResetLocal && <Button variant="ghost" onClick={onResetLocal}>Reiniciar local</Button>}
          <Button onClick={onNew}>Nuevo registro</Button>
          {onSignOut && <Button variant="ghost" onClick={onSignOut}>Salir</Button>}
        </div>
      </div>
    </header>
  );
}

function menuMetricFor(key, data) {
  const stockAlerts = (data.inventory || []).filter((item) => Number(item.stock || 0) <= Number(item.min || 0)).length;
  const openTasks = (data.tasks || []).filter((item) => item.priority === "Alta").length;
  const calendarItems = (data.tasks || []).filter((item) => item.due).length + (data.workOrders || []).filter((item) => item.start || item.end).length;

  const metrics = {
    dashboard: { value: (data.companies || []).length + (data.opportunities || []).length, label: "reg." },
    clientes: { value: (data.companies || []).length, label: "clientes" },
    crm: { value: (data.opportunities || []).length, label: "ops." },
    presupuestos: { value: (data.quotes || []).length, label: "pres." },
    ot: { value: (data.workOrders || []).length, label: "OT" },
    inventario: { value: stockAlerts, label: "alertas" },
    compras: { value: (data.purchases || []).length, label: "OC" },
    finanzas: { value: (data.invoices || []).length, label: "fact." },
    rrhh: { value: (data.employees || []).length, label: "pers." },
    tareas: { value: openTasks, label: "alta" },
    calendario: { value: calendarItems, label: "fechas" },
    documentos: { value: (data.documents || []).length, label: "docs" },
    auditoria: { value: (data.auditLog || []).length, label: "eventos" },
    reportes: { value: 4, label: "vistas" },
  };

  return metrics[key] || { value: 0, label: "items" };
}

function Sidebar({ active, setActive, availableScreens, data, profile, databaseStatus }) {
  return (
    <aside className="hidden min-h-screen w-80 shrink-0 border-r border-[#1f1f1f] bg-[#050505] p-5 lg:block">
      <div className="mb-8">
        <div className="rounded-xl bg-black p-3">
          <img src="/brand/logo_principal_horizontal.png" alt="Bizon Soluciones Industriales" className="h-auto w-full" />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#ff7900]">ERP operativo</p>
        <div className="mt-4 grid gap-2 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Usuario</span>
            <span className="max-w-36 truncate text-xs font-semibold text-zinc-200">{profile?.fullName || "Sin usuario"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Rol</span>
            <span className="rounded-full bg-[#ff7900] px-2 py-0.5 text-xs font-black text-black">{profile?.role || "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Base</span>
            <span className="max-w-32 truncate text-xs font-semibold text-zinc-300">{databaseStatus}</span>
          </div>
        </div>
      </div>
        <nav className="space-y-1">
          {availableScreens.map((item) => {
            const metric = menuMetricFor(item.key, data);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(item.key)}
                className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${active === item.key ? "bg-[#ff7900] text-black" : "text-zinc-400 hover:bg-[#171717] hover:text-white"}`}
              >
                <IconMark active={active === item.key}>{item.icon}</IconMark>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${active === item.key ? "bg-black/10 text-black" : "bg-[#151515] text-zinc-400 group-hover:bg-[#252525] group-hover:text-white"}`}>
                  {metric.value} {metric.label}
                </span>
              </button>
            );
          })}
        </nav>
    </aside>
  );
}

function MobileNav({ active, setActive, availableScreens }) {
  return (
    <div className="border-b border-[#ecece6] bg-[#fbfbf8] p-3 lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {availableScreens.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold ${active === item.key ? "border-[#ff7900] bg-[#ff7900] text-black" : "border-[#e4e4de] bg-white text-zinc-700"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, tone = "zinc" }) {
  const colors = {
    zinc: "text-zinc-500 bg-zinc-100",
    green: "text-[#d85f00] bg-[#fff3e8]",
    amber: "text-[#a86f00] bg-[#fff3cf]",
    red: "text-[#b42318] bg-[#ffe2df]",
    blue: "text-[#4a55c8] bg-[#eceeff]",
  };
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-[#050505]">{value}</p>
          <p className="mt-1 text-xs font-medium text-zinc-500">{subtitle}</p>
        </div>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${colors[tone] || colors.zinc}`}>↗</span>
      </div>
    </Panel>
  );
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-lg font-black text-zinc-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}

function Progress({ value, tone = "green" }) {
  const color = { green: "bg-[#ff7900]", amber: "bg-[#f3a51b]", red: "bg-[#e4574f]", blue: "bg-[#050505]" }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#edede8]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

function BarChart({ items }) {
  const max = Math.max(...items.map((item) => Math.max(item.primary, item.secondary)), 1);
  return (
    <div className="mt-5 h-64">
      <div className="flex h-full items-end gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-52 w-full items-end justify-center gap-1.5">
              <div className="w-3 rounded-t-md bg-[#6c5df6]" style={{ height: `${(item.primary / max) * 100}%` }} />
              <div className="w-3 rounded-t-md bg-[#f4a338]" style={{ height: `${(item.secondary / max) * 100}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ items }) {
  const total = items.reduce((value, item) => value + item.value, 0) || 1;
  let cursor = 0;
  const gradient = items.map((item) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 100;
    cursor = end;
    return `${item.color} ${start}% ${end}%`;
  }).join(", ");

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center">
      <div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-10 rounded-full bg-white" />
      </div>
      <div className="grid flex-1 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-zinc-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span>
            <strong className="text-[#050505]">{item.value}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ headers, rows, empty = "Sin datos" }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#fbfbf8] text-zinc-400">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-xs font-black uppercase tracking-wide">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#edede8]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="text-zinc-700 transition hover:bg-[#fbfbf8]">
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 align-middle">{cell}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-zinc-500">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SearchBar({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <Badge tone="blue">Datos demo editables en memoria</Badge>
    </div>
  );
}

function Dashboard({ data, setActive }) {
  const pipelineTotal = sum(data.opportunities, "amount");
  const winForecast = weightedPipeline(data.opportunities);
  const receivables = data.invoices.filter((item) => item.status !== "Cobrada");
  const stockAlerts = data.inventory.filter((item) => item.stock <= item.min);
  const avgMargin = data.workOrders.reduce((total, order) => total + order.margin, 0) / data.workOrders.length;
  const barItems = data.opportunities.slice(0, 6).map((item, index) => ({
    label: `${index + 1} Jul`,
    primary: Math.round(item.amount / 100000),
    secondary: Math.round((item.amount * item.probability) / 100000),
  }));
  const categoryItems = [
    { label: "OT", value: 25, color: "#7c5cff" },
    { label: "Compras", value: 17, color: "#5b7cfa" },
    { label: "Facturas", value: 22, color: "#ff7900" },
    { label: "Stock", value: 14, color: "#f053a6" },
    { label: "Tareas", value: 12, color: "#f4a338" },
    { label: "Docs", value: 10, color: "#66c7f4" },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pipeline abierto" value={money(pipelineTotal)} subtitle={`${data.opportunities.length} oportunidades`} tone="green" />
        <StatCard title="Forecast ponderado" value={money(winForecast)} subtitle="Probabilidad aplicada" tone="blue" />
        <StatCard title="Cuentas por cobrar" value={money(sum(receivables, "total"))} subtitle={`${receivables.length} facturas pendientes`} tone="amber" />
        <StatCard title="Margen promedio OT" value={pct(avgMargin)} subtitle="Objetivo operativo: 35%" tone={avgMargin >= 35 ? "green" : "amber"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <SectionTitle title="Actividad comercial" subtitle="Pipeline vs forecast ponderado" />
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-2 text-zinc-500"><span className="h-2.5 w-2.5 rounded-full bg-[#6c5df6]" />Pipeline</span>
              <span className="flex items-center gap-2 text-zinc-500"><span className="h-2.5 w-2.5 rounded-full bg-[#f4a338]" />Forecast</span>
            </div>
          </div>
          <BarChart items={barItems} />
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Distribucion operativa" subtitle="Peso relativo por area" />
          <div className="mt-5">
            <DonutChart items={categoryItems} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <SectionTitle title="Ordenes de trabajo en curso" subtitle="Seguimiento de avance y margen" action="Ver operaciones" onAction={() => setActive("ot")} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.workOrders.map((order) => (
              <div key={order.number} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-400">{order.number}</p>
                    <p className="mt-1 font-black text-[#050505]">{order.client}</p>
                    <p className="text-sm text-zinc-500">{order.team}</p>
                  </div>
                  <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-zinc-500">Avance</span>
                  <strong className="text-[#050505]">{order.progress}%</strong>
                </div>
                <div className="mt-2"><Progress value={order.progress} tone={order.progress > 65 ? "green" : "blue"} /></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Prioridades" subtitle="Acciones que mueven el dia" />
          <div className="mt-4 grid gap-3">
            {data.tasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#050505]">{task.text}</p>
                    <p className="mt-1 text-sm text-zinc-500">{task.owner} - {task.due}</p>
                  </div>
                  <Badge tone={task.priority === "Alta" ? "red" : "amber"}>{task.priority}</Badge>
                </div>
                <div className="mt-3"><Button variant="ghost" onClick={() => setActive(task.owner === "Compras" ? "compras" : task.owner === "Administracion" ? "finanzas" : "crm")}>Abrir</Button></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <SectionTitle title="Alertas de stock" subtitle="Material bajo minimo" action="Ver inventario" onAction={() => setActive("inventario")} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stockAlerts.map((item) => (
            <div key={item.sku} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#050505]">{item.name}</span>
                <span className="font-bold text-[#b42318]">{item.stock}/{item.min}</span>
              </div>
              <Progress value={(item.stock / item.min) * 100} tone="red" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Clientes({ companies, setCompanies, persistUpdate, openEditor, removeRecord }) {
  const [query, setQuery] = useState("");
  const filtered = companies.filter((company) => `${company.name} ${company.city} ${company.type} ${company.contact}`.toLowerCase().includes(query.toLowerCase()));

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Agenda comercial con valor potencial y proxima accion" />
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
      <DataTable
        headers={["Empresa", "Rubro", "Contacto", "Localidad", "Estado", "Proxima accion", "Valor potencial", "Acciones"]}
        rows={filtered.map((company) => [
          <strong className="text-zinc-950">{company.name}</strong>,
          company.type,
          <span>{company.contact}<br /><small className="text-zinc-500">{company.phone}</small></span>,
          company.city,
          <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
            {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
          </Select>,
          company.next,
          money(company.value),
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("clientes", company)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("companies", company.id)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

function CRM({ opportunities, setOpportunities, persistUpdate, openEditor, removeRecord }) {
  const stages = ["Nuevo prospecto", "Reunion", "Presupuesto enviado", "Negociacion", "Ganado"];

  function moveOpportunity(id, stage) {
    const current = opportunities.find((item) => item.id === id);
    const updated = { ...current, stage, probability: stage === "Ganado" ? 100 : current.probability };
    setOpportunities((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("opportunities", id, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="CRM comercial" subtitle="Pipeline por etapa, responsable y probabilidad" />
      <div className="grid gap-4 xl:grid-cols-5">
        {stages.map((stage) => {
          const cards = opportunities.filter((opportunity) => opportunity.stage === stage);
          return (
            <Panel key={stage} className="min-h-[260px] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-zinc-950">{stage}</h3>
                <Badge>{cards.length}</Badge>
              </div>
              <div className="space-y-3">
                {cards.map((opportunity) => (
                  <div key={opportunity.id} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-3">
                    <p className="font-bold text-zinc-950">{opportunity.company}</p>
                    <p className="mt-1 text-sm text-zinc-500">{opportunity.service}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#ff7900]">{money(opportunity.amount)}</span>
                      <Badge tone="blue">{opportunity.probability}%</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Select value={opportunity.stage} onChange={(event) => moveOpportunity(opportunity.id, event.target.value)}>
                        {stages.map((option) => <option key={option}>{option}</option>)}
                      </Select>
                      <p className="text-xs text-zinc-500">{opportunity.owner} - {opportunity.due}</p>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => openEditor("crm", opportunity)}>Editar</Button>
                        <Button variant="danger" onClick={() => removeRecord("opportunities", opportunity.id)}>Borrar</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">Sin oportunidades</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function Presupuestos({ quotes, setQuotes, persistUpdate, openEditor, removeRecord }) {
  const [calculator, setCalculator] = useState({ materials: 1800000, labor: 950000, overhead: 18, margin: 32 });
  const cost = Number(calculator.materials) + Number(calculator.labor);
  const overheadAmount = cost * (Number(calculator.overhead) / 100);
  const priceBeforeTax = (cost + overheadAmount) / (1 - Number(calculator.margin) / 100);
  const tax = priceBeforeTax * 0.21;
  const suggested = priceBeforeTax + tax;

  function approveQuote(number) {
    const current = quotes.find((item) => item.number === number);
    const updated = { ...current, status: "Aprobado" };
    setQuotes((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("quotes", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Presupuestos" subtitle="Cotizaciones, validez y calculo de precio sugerido" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DataTable
          headers={["Numero", "Cliente", "Servicio", "Subtotal", "IVA", "Total", "Estado", "Valido hasta", "Acciones"]}
          rows={quotes.map((quote) => [
            quote.number,
            quote.client,
            quote.service,
            money(quote.subtotal),
            money(quote.tax),
            <strong>{money(quote.total)}</strong>,
            <Badge tone={toneForStatus(quote.status)}>{quote.status}</Badge>,
            quote.validUntil,
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => approveQuote(quote.number)}>Aprobar</Button>
              <Button variant="ghost" onClick={() => openEditor("presupuestos", quote)}>Editar</Button>
              <Button variant="danger" onClick={() => removeRecord("quotes", quote.number)}>Borrar</Button>
            </div>,
          ])}
        />
        <Panel className="p-4">
          <SectionTitle title="Calculadora" subtitle="Costo + indirectos + margen + IVA" />
          <div className="mt-4 grid gap-3">
            <Field label="Materiales"><TextInput type="number" value={calculator.materials} onChange={(event) => setCalculator({ ...calculator, materials: event.target.value })} /></Field>
            <Field label="Mano de obra"><TextInput type="number" value={calculator.labor} onChange={(event) => setCalculator({ ...calculator, labor: event.target.value })} /></Field>
            <Field label="Indirectos %"><TextInput type="number" value={calculator.overhead} onChange={(event) => setCalculator({ ...calculator, overhead: event.target.value })} /></Field>
            <Field label="Margen objetivo %"><TextInput type="number" value={calculator.margin} onChange={(event) => setCalculator({ ...calculator, margin: event.target.value })} /></Field>
            <div className="rounded-lg bg-zinc-950 p-4 text-white">
              <p className="text-sm text-zinc-300">Precio sugerido</p>
              <p className="mt-1 text-2xl font-black">{money(suggested)}</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function OrdenesTrabajo({ workOrders, setWorkOrders, persistUpdate, openEditor, removeRecord }) {
  function setProgress(number, progress) {
    const current = workOrders.find((item) => item.number === number);
    const updated = { ...current, progress: clamp(progress, 0, 100), status: progress >= 100 ? "Terminada" : current.status };
    setWorkOrders((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("workOrders", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Ordenes de trabajo" subtitle="Planificacion, equipo asignado, avance y margen" />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {workOrders.map((order) => (
          <Panel key={order.number} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-zinc-500">{order.number}</p>
                <h3 className="mt-1 font-black text-zinc-950">{order.client}</h3>
                <p className="text-sm text-zinc-500">{order.service}</p>
              </div>
              <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-zinc-600">
              <p>Equipo: <strong className="text-zinc-900">{order.team}</strong></p>
              <p>Fecha: {order.start} a {order.end}</p>
              <p>Margen estimado: <strong className={order.margin < 30 ? "text-rose-700" : "text-[#d85f00]"}>{order.margin}%</strong></p>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-sm"><span>Avance</span><strong>{order.progress}%</strong></div>
              <Progress value={order.progress} tone={order.progress > 80 ? "green" : "blue"} />
              <input className="mt-4 w-full accent-[#ff7900]" type="range" min="0" max="100" value={order.progress} onChange={(event) => setProgress(order.number, event.target.value)} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => openEditor("ot", order)}>Editar</Button>
              <Button variant="danger" onClick={() => removeRecord("workOrders", order.number)}>Borrar</Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Inventario({ inventory, openEditor, removeRecord }) {
  const [category, setCategory] = useState("Todos");
  const categories = ["Todos", ...Array.from(new Set(inventory.map((item) => item.category)))];
  const rows = inventory.filter((item) => category === "Todos" || item.category === category);
  const totalValue = inventory.reduce((total, item) => total + item.stock * item.cost, 0);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Inventario" subtitle="Stock minimo, valorizacion y reposicion" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Valor de stock" value={money(totalValue)} subtitle="Costo promedio demo" tone="green" />
        <StatCard title="Items bajo minimo" value={inventory.filter((item) => item.stock <= item.min).length} subtitle="Requieren compra" tone="red" />
        <Panel className="p-4">
          <Field label="Categoria">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
        </Panel>
      </div>
      <DataTable
        headers={["SKU", "Material", "Categoria", "Stock", "Minimo", "Unidad", "Costo", "Estado", "Acciones"]}
        rows={rows.map((item) => [
          item.sku,
          <strong className="text-zinc-950">{item.name}</strong>,
          item.category,
          item.stock,
          item.min,
          item.unit,
          money(item.cost),
          <Badge tone={item.stock <= item.min ? "red" : "green"}>{item.stock <= item.min ? "Reponer" : "OK"}</Badge>,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("inventario", item)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("inventory", item.sku)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

function Compras({ purchases, openEditor, removeRecord }) {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Compras" subtitle="Ordenes de compra, autorizaciones y entregas" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Compras abiertas" value={money(sum(purchases.filter((item) => item.status !== "Recibida"), "total"))} subtitle="Pendiente de recibir" tone="amber" />
        <StatCard title="OC pendientes" value={purchases.filter((item) => item.status !== "Recibida").length} subtitle="Seguimiento semanal" tone="blue" />
        <StatCard title="OC recibidas" value={purchases.filter((item) => item.status === "Recibida").length} subtitle="Ultimos movimientos" tone="green" />
      </div>
      <DataTable
        headers={["OC", "Proveedor", "Area", "Total", "Estado", "Fecha esperada", "Acciones"]}
        rows={purchases.map((item) => [
          item.number,
          item.supplier,
          item.area,
          money(item.total),
          <Badge tone={toneForStatus(item.status)}>{item.status}</Badge>,
          item.due,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("compras", item)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("purchases", item.number)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

function Finanzas({ invoices, openEditor, removeRecord }) {
  const collected = sum(invoices.filter((item) => item.status === "Cobrada"), "total");
  const pending = sum(invoices.filter((item) => item.status !== "Cobrada"), "total");

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Finanzas" subtitle="Facturacion, cobranzas y caja proyectada" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Cobrado" value={money(collected)} subtitle="Facturas cerradas" tone="green" />
        <StatCard title="Por cobrar" value={money(pending)} subtitle="Pendiente y por vencer" tone="amber" />
        <StatCard title="Caja proyectada" value={money(collected + pending)} subtitle="Ingresos demo" tone="blue" />
      </div>
      <DataTable
        headers={["Factura", "Cliente", "Concepto", "Total", "Estado", "Vencimiento", "Acciones"]}
        rows={invoices.map((invoice) => [
          invoice.number,
          invoice.client,
          invoice.concept,
          money(invoice.total),
          <Badge tone={toneForStatus(invoice.status)}>{invoice.status}</Badge>,
          invoice.due,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("finanzas", invoice)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("invoices", invoice.number)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

function RRHH({ employees, openEditor, removeRecord }) {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="RRHH" subtitle="Dotacion, equipos, disponibilidad y horas" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Personas activas" value={employees.length} subtitle="Dotacion demo" tone="green" />
        <StatCard title="Horas mensuales" value={sum(employees, "hours")} subtitle="Carga declarada" tone="blue" />
        <StatCard title="Disponibles" value={employees.filter((item) => item.status === "Disponible").length} subtitle="Sin asignacion critica" tone="amber" />
      </div>
      <DataTable
        headers={["Nombre", "Rol", "Equipo", "Estado", "Horas", "Acciones"]}
        rows={employees.map((employee) => [
          <strong className="text-zinc-950">{employee.name}</strong>,
          employee.role,
          employee.team,
          <Badge tone={toneForStatus(employee.status)}>{employee.status}</Badge>,
          employee.hours,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("rrhh", employee)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("employees", employee.id)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

function Tareas({ data, openEditor, removeRecord }) {
  const highPriority = data.tasks.filter((task) => task.priority === "Alta").length;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Tareas" subtitle="Seguimiento de pendientes por responsable y fecha" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Tareas abiertas" value={data.tasks.length} subtitle="Pendientes registradas" tone="blue" />
        <StatCard title="Alta prioridad" value={highPriority} subtitle="Requieren seguimiento" tone={highPriority ? "red" : "green"} />
        <StatCard title="Responsables" value={new Set(data.tasks.map((task) => task.owner)).size} subtitle="Areas involucradas" tone="green" />
      </div>
      <DataTable
        headers={["Tarea", "Responsable", "Prioridad", "Vencimiento", "Acciones"]}
        rows={data.tasks.map((task) => [
          <strong className="text-zinc-950">{task.text}</strong>,
          task.owner,
          <Badge tone={task.priority === "Alta" ? "red" : "amber"}>{task.priority}</Badge>,
          task.due,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("tareas", task)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("tasks", task.id)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

function toDateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function buildCalendarEvents(data) {
  const events = [];
  data.opportunities.forEach((item) => events.push({ id: `op-${item.id}`, date: item.due, title: item.company, type: "CRM", detail: item.service, tone: "blue" }));
  data.quotes.forEach((item) => events.push({ id: `qt-${item.number}`, date: item.validUntil, title: item.number, type: "Presupuesto", detail: item.client, tone: "amber" }));
  data.workOrders.forEach((item) => {
    events.push({ id: `ot-start-${item.number}`, date: item.start, title: item.number, type: "Inicio OT", detail: item.client, tone: "green" });
    events.push({ id: `ot-end-${item.number}`, date: item.end, title: item.number, type: "Fin OT", detail: item.client, tone: "red" });
  });
  data.purchases.forEach((item) => events.push({ id: `po-${item.number}`, date: item.due, title: item.number, type: "Compra", detail: item.supplier, tone: "amber" }));
  data.invoices.forEach((item) => events.push({ id: `iv-${item.number}`, date: item.due, title: item.number, type: "Factura", detail: item.client, tone: item.status === "Cobrada" ? "green" : "red" }));
  data.tasks.forEach((item) => events.push({ id: `task-${item.id}`, date: item.due, title: item.text, type: item.eventType || "Tarea", detail: item.owner, tone: item.priority === "Alta" ? "red" : "blue", task: item }));
  return events.filter((item) => item.date);
}

function Calendario({ data, createCalendarEvent, openEditor, removeRecord }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [form, setForm] = useState({ text: "", owner: "General", priority: "Media", eventType: "Reunion", startTime: "09:00", endTime: "10:00", notes: "" });

  const events = buildCalendarEvents(data);
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { key: date, day, date, events: events.filter((event) => toDateKey(event.date) === date) };
    }),
  ];
  const selectedEvents = events.filter((event) => toDateKey(event.date) === selectedDate);

  function changeMonth(offset) {
    setCursor(new Date(year, month + offset, 1));
  }

  function submit(event) {
    event.preventDefault();
    createCalendarEvent({ ...form, due: selectedDate });
    setForm({ text: "", owner: "General", priority: "Media", eventType: "Reunion", startTime: "09:00", endTime: "10:00", notes: "" });
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Calendario" subtitle="Agenda comercial, operativa y administrativa" />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-[#050505]">{cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</h2>
              <p className="text-sm text-zinc-500">Vencimientos, hitos y tareas</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => changeMonth(-1)}>Anterior</Button>
              <Button variant="ghost" onClick={() => changeMonth(1)}>Siguiente</Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-wide text-zinc-400">
            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                disabled={!cell.date}
                onClick={() => setSelectedDate(cell.date)}
                className={`min-h-28 rounded-xl border p-2 text-left transition ${cell.date === selectedDate ? "border-[#ff7900] bg-[#fff1e5]" : "border-[#ecece6] bg-white hover:bg-[#fbfbf8]"} ${!cell.date ? "opacity-0" : ""}`}
              >
                <span className="text-sm font-black text-[#050505]">{cell.day}</span>
                <div className="mt-2 space-y-1">
                  {(cell.events || []).slice(0, 3).map((event) => (
                    <div key={event.id} className="truncate rounded-md bg-[#050505] px-2 py-1 text-[11px] font-semibold text-white">{event.type}</div>
                  ))}
                  {(cell.events || []).length > 3 && <div className="text-[11px] font-bold text-[#ff7900]">+{cell.events.length - 3}</div>}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="p-5">
            <SectionTitle title="Dia seleccionado" subtitle={selectedDate} />
            <div className="mt-4 grid gap-3">
              {selectedEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={event.tone}>{event.type}</Badge>
                      <p className="mt-2 font-black text-[#050505]">{event.title}</p>
                      <p className="text-sm text-zinc-500">{event.detail}</p>
                    </div>
                    {event.task && (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => openEditor("tareas", event.task)}>Editar</Button>
                        <Button variant="danger" onClick={() => removeRecord("tasks", event.task.id)}>Borrar</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!selectedEvents.length && <p className="rounded-xl border border-dashed border-[#ecece6] p-4 text-sm text-zinc-500">Sin eventos para este dia.</p>}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="Nuevo evento" subtitle="Se guarda como tarea calendario" />
            <form onSubmit={submit} className="mt-4 grid gap-3">
              <Field label="Titulo"><TextInput required value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Reunion, visita, entrega" /></Field>
              <Field label="Responsable"><TextInput value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inicio"><TextInput type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
                <Field label="Fin"><TextInput type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo"><Select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })}>{["Reunion", "Visita", "Entrega", "Vencimiento", "Tarea"].map((item) => <option key={item}>{item}</option>)}</Select></Field>
                <Field label="Prioridad"><Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{["Media", "Alta", "Baja"].map((item) => <option key={item}>{item}</option>)}</Select></Field>
              </div>
              <Field label="Notas"><TextInput value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
              <Button type="submit">Crear evento</Button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function Documentos({ data, uploadDocument, removeRecord }) {
  const [form, setForm] = useState({ kind: "Presupuesto", relatedType: "Presupuesto", relatedNumber: "", notes: "" });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!file) {
      setMessage("Selecciona un archivo.");
      return;
    }

    try {
      await uploadDocument(file, form);
      setFile(null);
      setForm({ kind: "Presupuesto", relatedType: "Presupuesto", relatedNumber: "", notes: "" });
      setMessage("Documento cargado.");
      event.target.reset();
    } catch (error) {
      setMessage(error.message || "No se pudo cargar el documento.");
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Documentos" subtitle="Adjuntos para presupuestos, facturas, remitos, certificados y operaciones" />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel className="p-4">
          <SectionTitle title="Nuevo adjunto" subtitle="Archivo + relacion operativa" />
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <Field label="Tipo">
              <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
                {["Presupuesto", "Factura", "Remito", "Certificado", "Orden de trabajo", "Compra", "Otro"].map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Relacionado con">
              <Select value={form.relatedType} onChange={(event) => setForm({ ...form, relatedType: event.target.value })}>
                {["Presupuesto", "Factura", "OT", "OC", "Cliente", "General"].map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Numero / referencia">
              <TextInput value={form.relatedNumber} onChange={(event) => setForm({ ...form, relatedNumber: event.target.value })} placeholder="P-0001, F-00087, OT-0004" />
            </Field>
            <Field label="Notas">
              <TextInput value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Detalle breve" />
            </Field>
            <Field label="Archivo">
              <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-lg border border-zinc-300 bg-white p-2 text-sm" />
            </Field>
            {message && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
            <Button type="submit">Cargar documento</Button>
          </form>
        </Panel>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Documentos" value={data.documents.length} subtitle="Adjuntos registrados" tone="blue" />
            <StatCard title="Certificados" value={data.documents.filter((item) => item.kind === "Certificado").length} subtitle="Avances y conformidades" tone="green" />
            <StatCard title="Peso total" value={formatBytes(data.documents.reduce((total, item) => total + Number(item.size || 0), 0))} subtitle="Archivos cargados" tone="amber" />
          </div>
          <DataTable
            headers={["Tipo", "Referencia", "Archivo", "Tamano", "Notas", "Acciones"]}
            rows={data.documents.map((doc) => [
              <Badge tone="blue">{doc.kind}</Badge>,
              `${doc.relatedType} ${doc.relatedNumber}`,
              <strong className="text-zinc-950">{doc.name}</strong>,
              formatBytes(doc.size),
              doc.notes || "-",
              <div className="flex gap-2">
                {doc.url && <Button variant="ghost" onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}>Ver</Button>}
                <Button variant="danger" onClick={() => removeRecord("documents", doc.id)}>Borrar</Button>
              </div>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}

function Auditoria({ data }) {
  const [query, setQuery] = useState("");
  const filtered = data.auditLog
    .filter((event) => `${event.action} ${event.module} ${event.recordKey} ${event.summary} ${event.actorName}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const actionTone = {
    create: "green",
    update: "blue",
    delete: "red",
    upload: "amber",
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Auditoria" subtitle="Historial de altas, ediciones, borrados y documentos" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Eventos" value={data.auditLog.length} subtitle="Historial registrado" tone="blue" />
        <StatCard title="Altas" value={data.auditLog.filter((item) => item.action === "create").length} subtitle="Registros creados" tone="green" />
        <StatCard title="Cambios" value={data.auditLog.filter((item) => item.action === "update").length} subtitle="Ediciones realizadas" tone="amber" />
        <StatCard title="Borrados" value={data.auditLog.filter((item) => item.action === "delete").length} subtitle="Acciones sensibles" tone="red" />
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por modulo, accion, registro o usuario" />
      <DataTable
        headers={["Fecha", "Accion", "Modulo", "Registro", "Usuario", "Resumen"]}
        rows={filtered.map((event) => [
          new Date(event.createdAt).toLocaleString("es-AR"),
          <Badge tone={actionTone[event.action] || "zinc"}>{event.action}</Badge>,
          event.module,
          event.recordKey,
          event.actorName,
          event.summary,
        ])}
      />
    </div>
  );
}

function Reportes({ data }) {
  const pipeline = sum(data.opportunities, "amount");
  const won = sum(data.opportunities.filter((item) => item.stage === "Ganado"), "amount");
  const quoteTotal = sum(data.quotes, "total");
  const purchasing = sum(data.purchases, "total");
  const stockValue = data.inventory.reduce((total, item) => total + item.stock * item.cost, 0);
  const indicators = [
    { label: "Conversion comercial", value: pct((won / pipeline) * 100), tone: "green" },
    { label: "Presupuestos emitidos", value: money(quoteTotal), tone: "blue" },
    { label: "Compras comprometidas", value: money(purchasing), tone: "amber" },
    { label: "Inventario valorizado", value: money(stockValue), tone: "green" },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Reportes gerenciales" subtitle="Indicadores integrados de ventas, operaciones, compras y caja" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {indicators.map((item) => <StatCard key={item.label} title={item.label} value={item.value} subtitle="Calculado sobre datos demo" tone={item.tone} />)}
      </div>
      <Panel className="p-4">
        <SectionTitle title="Resumen ejecutivo" subtitle="Lectura rapida para reunion semanal" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">El pipeline total es de <strong>{money(pipeline)}</strong>, con forecast ponderado de <strong>{money(weightedPipeline(data.opportunities))}</strong>.</p>
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">Hay <strong>{data.inventory.filter((item) => item.stock <= item.min).length}</strong> materiales bajo minimo y <strong>{data.workOrders.filter((item) => item.status === "En ejecucion").length}</strong> ordenes en ejecucion.</p>
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">Las cuentas por cobrar abiertas suman <strong>{money(sum(data.invoices.filter((item) => item.status !== "Cobrada"), "total"))}</strong>.</p>
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">La dotacion registra <strong>{sum(data.employees, "hours")}</strong> horas mensuales informadas.</p>
        </div>
      </Panel>
    </div>
  );
}

function NewRecordModal({ active, data, onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", detail: "", amount: "" });
  const title = `Nuevo registro - ${screens.find((item) => item.key === active)?.label || "ERP"}`;

  async function submit(event) {
    event.preventDefault();
    await onCreate(active, form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-zinc-950">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">Alta rapida para alimentar el modulo actual.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="mt-5 grid gap-3">
          <Field label="Nombre / cliente"><TextInput required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={data.companies[0]?.name || "Cliente"} /></Field>
          <Field label="Detalle / servicio"><TextInput required value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} placeholder="Servicio, concepto o tarea" /></Field>
          <Field label="Importe estimado"><TextInput type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Crear</Button>
        </div>
      </form>
    </div>
  );
}

const editFields = {
  clientes: [
    ["name", "Empresa"],
    ["type", "Rubro"],
    ["city", "Localidad"],
    ["status", "Estado"],
    ["contact", "Contacto"],
    ["phone", "Telefono"],
    ["next", "Proxima accion"],
    ["value", "Valor potencial", "number"],
  ],
  crm: [
    ["company", "Empresa"],
    ["service", "Servicio"],
    ["stage", "Etapa"],
    ["amount", "Importe", "number"],
    ["probability", "Probabilidad", "number"],
    ["owner", "Responsable"],
    ["due", "Vencimiento", "date"],
  ],
  presupuestos: [
    ["number", "Numero"],
    ["client", "Cliente"],
    ["service", "Servicio"],
    ["subtotal", "Subtotal", "number"],
    ["tax", "IVA", "number"],
    ["total", "Total", "number"],
    ["status", "Estado"],
    ["validUntil", "Valido hasta", "date"],
  ],
  ot: [
    ["number", "Numero"],
    ["client", "Cliente"],
    ["service", "Servicio"],
    ["status", "Estado"],
    ["progress", "Avance", "number"],
    ["margin", "Margen", "number"],
    ["start", "Inicio", "date"],
    ["end", "Fin", "date"],
    ["team", "Equipo"],
  ],
  inventario: [
    ["sku", "SKU"],
    ["name", "Material"],
    ["category", "Categoria"],
    ["stock", "Stock", "number"],
    ["min", "Stock minimo", "number"],
    ["unit", "Unidad"],
    ["cost", "Costo", "number"],
  ],
  compras: [
    ["number", "Numero"],
    ["supplier", "Proveedor"],
    ["area", "Area"],
    ["total", "Total", "number"],
    ["status", "Estado"],
    ["due", "Fecha esperada", "date"],
  ],
  finanzas: [
    ["number", "Factura"],
    ["client", "Cliente"],
    ["concept", "Concepto"],
    ["total", "Total", "number"],
    ["status", "Estado"],
    ["due", "Vencimiento", "date"],
  ],
  rrhh: [
    ["name", "Nombre"],
    ["role", "Rol"],
    ["team", "Equipo"],
    ["status", "Estado"],
    ["hours", "Horas", "number"],
  ],
  tareas: [
    ["text", "Tarea"],
    ["owner", "Responsable"],
    ["priority", "Prioridad"],
    ["due", "Vencimiento", "date"],
    ["eventType", "Tipo"],
    ["startTime", "Inicio", "time"],
    ["endTime", "Fin", "time"],
    ["notes", "Notas"],
  ],
};

function EditRecordModal({ editTarget, onClose, onSave }) {
  const [form, setForm] = useState(editTarget.record);
  const fields = editFields[editTarget.module] || [];
  const title = `Editar ${screens.find((item) => item.key === editTarget.module)?.label || "registro"}`;

  function submit(event) {
    event.preventDefault();
    onSave(editTarget.module, form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-zinc-950">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">Los cambios se guardan en Supabase si la base esta conectada.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {fields.map(([key, label, type = "text"]) => (
            <Field key={key} label={label}>
              <TextInput
                type={type}
                value={form[key] ?? ""}
                onChange={(event) => setForm({ ...form, [key]: type === "number" ? Number(event.target.value || 0) : event.target.value })}
                disabled={["number", "sku"].includes(key)}
              />
            </Field>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  );
}

function LoginScreen({ onSessionReady }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const session = mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password, fullName || email);

      if (session) {
        onSessionReady(session);
      } else {
        setMessage("Usuario creado. Revisar el email si Supabase exige confirmacion.");
      }
    } catch (error) {
      setMessage(error.message || "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f5f3] p-4">
      <Panel className="w-full max-w-md p-5">
        <div className="mb-5">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="mb-4 h-14 w-14 rounded-lg bg-black object-contain p-1" />
          <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
          <h1 className="mt-1 text-2xl font-black text-zinc-950">{mode === "login" ? "Ingresar" : "Crear usuario"}</h1>
          <p className="mt-2 text-sm text-zinc-500">Acceso protegido por Supabase Auth y permisos por rol.</p>
        </div>

        <form onSubmit={submit} className="grid gap-3">
          {mode === "signup" && (
            <Field label="Nombre">
              <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre y apellido" />
            </Field>
          )}
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@bizon.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimo 6 caracteres" />
          </Field>
          {message && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
          <Button type="submit">{loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}</Button>
        </form>

        <div className="mt-4">
          <Button variant="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Crear usuario" : "Ya tengo usuario"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function DatabaseSetupScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f5f3] p-4">
      <Panel className="w-full max-w-xl p-5">
        <div className="mb-5">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="mb-4 h-14 w-14 rounded-lg bg-black object-contain p-1" />
          <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
          <h1 className="mt-1 text-2xl font-black text-zinc-950">Configurar base real</h1>
          <p className="mt-2 text-sm text-zinc-500">Produccion requiere Supabase para habilitar login, roles y datos persistentes.</p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700">
          <p>Crear el proyecto en Supabase, ejecutar los SQL de la carpeta <strong>database</strong> y cargar estas variables en Vercel:</p>
          <div className="rounded-lg border border-[#e4e4de] bg-[#fbfbf8] p-3 font-mono text-xs text-zinc-900">
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">El modo demo queda bloqueado en produccion para evitar operar con datos locales por error.</p>
        </div>
      </Panel>
    </div>
  );
}

export default function MiniErpBizonPrototype() {
  const useLocalDemo = !isDatabaseConfigured && !shouldBlockUnconfiguredDatabase;
  const [active, setActive] = useState("dashboard");
  const [session, setSession] = useState(isDatabaseConfigured ? null : useLocalDemo ? { user: { id: "demo" } } : null);
  const [profile, setProfile] = useState(isDatabaseConfigured ? null : useLocalDemo ? { id: "demo", fullName: "Modo demo", role: "admin" } : null);
  const [authLoading, setAuthLoading] = useState(isDatabaseConfigured);
  const [companies, setCompanies] = useState(initialCompanies);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [inventoryItems, setInventoryItems] = useState(inventory);
  const [purchaseOrders, setPurchaseOrders] = useState(purchases);
  const [customerInvoices, setCustomerInvoices] = useState(invoices);
  const [staff, setStaff] = useState(employees);
  const [taskList, setTaskList] = useState(tasks);
  const [documents, setDocuments] = useState(initialDocuments);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [localDatabaseReady, setLocalDatabaseReady] = useState(isDatabaseConfigured || shouldBlockUnconfiguredDatabase);
  const [databaseStatus, setDatabaseStatus] = useState(isDatabaseConfigured ? "Conectando..." : useLocalDemo ? "Base local" : "Configurar Supabase");

  useEffect(() => {
    let cancelled = false;

    async function bootAuth() {
      if (!isDatabaseConfigured) return;

      try {
        const initialSession = await getInitialSession();
        if (cancelled) return;
        setSession(initialSession);
        if (initialSession) {
          const currentProfile = await getCurrentProfile();
          if (!cancelled) setProfile(currentProfile);
        }
      } catch (error) {
        console.error("No se pudo iniciar autenticacion:", error);
        setDatabaseStatus("Error de base");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    bootAuth();
    const stopListening = listenAuthChanges(async (nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        return;
      }
      try {
        setProfile(await getCurrentProfile());
      } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
        setDatabaseStatus("Error de base");
      }
    });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!useLocalDemo) return;

    try {
      const stored = window.localStorage.getItem(localDatabaseKey);
      if (stored) {
        const localData = JSON.parse(stored);
        setCompanies(localData.companies?.length ? localData.companies : initialCompanies);
        setOpportunities(localData.opportunities?.length ? localData.opportunities : initialOpportunities);
        setQuotes(localData.quotes?.length ? localData.quotes : initialQuotes);
        setWorkOrders(localData.workOrders?.length ? localData.workOrders : initialWorkOrders);
        setInventoryItems(localData.inventory?.length ? localData.inventory : inventory);
        setPurchaseOrders(localData.purchases?.length ? localData.purchases : purchases);
        setCustomerInvoices(localData.invoices?.length ? localData.invoices : invoices);
        setStaff(localData.employees?.length ? localData.employees : employees);
        setTaskList(localData.tasks?.length ? localData.tasks : tasks);
        setDocuments(localData.documents?.length ? localData.documents : initialDocuments);
        setAuditLog(localData.auditLog?.length ? localData.auditLog : initialAuditLog);
      }
      setDatabaseStatus("Base local");
    } catch (error) {
      console.error("No se pudo cargar la base local:", error);
      setDatabaseStatus("Base local reiniciada");
    } finally {
      setLocalDatabaseReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromDatabase() {
      if (!isDatabaseConfigured || !session) return;

      try {
        const remoteData = await loadErpData();
        if (cancelled || !remoteData) return;
        setCompanies(remoteData.companies.length ? remoteData.companies : initialCompanies);
        setOpportunities(remoteData.opportunities.length ? remoteData.opportunities : initialOpportunities);
        setQuotes(remoteData.quotes.length ? remoteData.quotes : initialQuotes);
        setWorkOrders(remoteData.workOrders.length ? remoteData.workOrders : initialWorkOrders);
        setInventoryItems(remoteData.inventory.length ? remoteData.inventory : inventory);
        setPurchaseOrders(remoteData.purchases.length ? remoteData.purchases : purchases);
        setCustomerInvoices(remoteData.invoices.length ? remoteData.invoices : invoices);
        setStaff(remoteData.employees.length ? remoteData.employees : employees);
        setTaskList(remoteData.tasks.length ? remoteData.tasks : tasks);
        setDocuments(remoteData.documents?.length ? remoteData.documents : initialDocuments);
        setAuditLog(remoteData.audit?.length ? remoteData.audit : initialAuditLog);
        setDatabaseStatus("Conectado a Supabase");
      } catch (error) {
        console.error("No se pudo cargar la base de datos:", error);
        setDatabaseStatus("Error de base");
      }
    }

    hydrateFromDatabase();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const data = useMemo(() => ({
    companies,
    opportunities,
    quotes,
    workOrders,
    inventory: inventoryItems,
    purchases: purchaseOrders,
    invoices: customerInvoices,
    employees: staff,
    tasks: taskList,
    documents,
    auditLog,
  }), [companies, opportunities, quotes, workOrders, inventoryItems, purchaseOrders, customerInvoices, staff, taskList, documents, auditLog]);

  useEffect(() => {
    if (!useLocalDemo || !localDatabaseReady) return;

    window.localStorage.setItem(localDatabaseKey, JSON.stringify(data));
  }, [data, localDatabaseReady]);

  const activeLabel = screens.find((item) => item.key === active)?.label || "Dashboard";
  const availableScreens = screens.filter((item) => canAccessScreen(item, profile?.role || "ventas"));

  useEffect(() => {
    if (availableScreens.length && !availableScreens.some((item) => item.key === active)) {
      setActive(availableScreens[0].key);
    }
  }, [active, availableScreens]);

  async function handleSignOut() {
    if (!isDatabaseConfigured) return;
    await signOutUser();
    setSession(null);
    setProfile(null);
  }

  function exportBackup() {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bizon-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetLocalDatabase() {
    if (!window.confirm("Reiniciar la base local y volver a los datos iniciales?")) return;

    window.localStorage.removeItem(localDatabaseKey);
    setCompanies(initialCompanies);
    setOpportunities(initialOpportunities);
    setQuotes(initialQuotes);
    setWorkOrders(initialWorkOrders);
    setInventoryItems(inventory);
    setPurchaseOrders(purchases);
    setCustomerInvoices(invoices);
    setStaff(employees);
    setTaskList(tasks);
    setDocuments(initialDocuments);
    setAuditLog(initialAuditLog);
    setDatabaseStatus("Base local");
  }

  function recordKeyFor(module, record, fallback = "-") {
    return String(record?.number || record?.id || record?.sku || record?.recordKey || fallback);
  }

  function audit(action, module, record, summary, metadata = {}) {
    const event = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      action,
      module,
      recordKey: recordKeyFor(module, record),
      summary,
      actorName: profile?.fullName || "Sistema",
      metadata,
      createdAt: new Date().toISOString(),
    };

    setAuditLog((items) => [event, ...items].slice(0, 500));
    if (isDatabaseConfigured) {
      logAuditEvent(event).catch((error) => {
        console.error("No se pudo registrar auditoria:", error);
      });
    }
  }

  async function persistRecord(module, record) {
    if (!isDatabaseConfigured) {
      audit("create", module, record, `Alta en ${module}`);
      return;
    }

    try {
      await saveErpRecord(module, record);
      audit("create", module, record, `Alta en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudo guardar el registro:", error);
      setDatabaseStatus("Error de base");
    }
  }

  async function persistUpdate(module, key, record) {
    if (!isDatabaseConfigured) {
      audit("update", module, record, `Actualizacion en ${module}`);
      return;
    }

    try {
      await updateErpRecord(module, key, record);
      audit("update", module, record, `Actualizacion en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudo actualizar el registro:", error);
      setDatabaseStatus("Error de base");
    }
  }

  async function persistDelete(module, key) {
    if (!isDatabaseConfigured) {
      audit("delete", module, { id: key }, `Borrado en ${module}`);
      return;
    }

    try {
      await deleteErpRecord(module, key);
      audit("delete", module, { id: key }, `Borrado en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudo borrar el registro:", error);
      setDatabaseStatus("Error de base");
    }
  }

  async function getDocumentNumber(counterCode, items, prefix, padding = 4) {
    if (!isDatabaseConfigured) return nextLocalNumber(items, prefix, padding);

    try {
      return await nextDocumentNumber(counterCode);
    } catch (error) {
      console.error("No se pudo generar numerador:", error);
      setDatabaseStatus("Error de base");
      return nextLocalNumber(items, prefix, padding);
    }
  }

  function openEditor(module, record) {
    setEditTarget({ module, record });
  }

  function saveEditedRecord(module, record) {
    if (module === "clientes") {
      setCompanies((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("companies", record.id, record);
    }
    if (module === "crm") {
      setOpportunities((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("opportunities", record.id, record);
    }
    if (module === "presupuestos") {
      setQuotes((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("quotes", record.number, record);
    }
    if (module === "ot") {
      setWorkOrders((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("workOrders", record.number, record);
    }
    if (module === "inventario") {
      setInventoryItems((items) => items.map((item) => item.sku === record.sku ? record : item));
      persistUpdate("inventory", record.sku, record);
    }
    if (module === "compras") {
      setPurchaseOrders((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("purchases", record.number, record);
    }
    if (module === "finanzas") {
      setCustomerInvoices((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("invoices", record.number, record);
    }
    if (module === "rrhh") {
      setStaff((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("employees", record.id, record);
    }
    if (module === "tareas") {
      setTaskList((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("tasks", record.id, record);
    }
    setEditTarget(null);
  }

  function removeRecord(module, key) {
    const labels = {
      companies: "cliente",
      opportunities: "oportunidad",
      quotes: "presupuesto",
      workOrders: "orden de trabajo",
      inventory: "item de inventario",
      purchases: "orden de compra",
      invoices: "factura",
      employees: "empleado",
      tasks: "tarea",
      documents: "documento",
    };

    if (!window.confirm(`Borrar ${labels[module] || "registro"}?`)) return;

    if (module === "companies") setCompanies((items) => items.filter((item) => item.id !== key));
    if (module === "opportunities") setOpportunities((items) => items.filter((item) => item.id !== key));
    if (module === "quotes") setQuotes((items) => items.filter((item) => item.number !== key));
    if (module === "workOrders") setWorkOrders((items) => items.filter((item) => item.number !== key));
    if (module === "inventory") setInventoryItems((items) => items.filter((item) => item.sku !== key));
    if (module === "purchases") setPurchaseOrders((items) => items.filter((item) => item.number !== key));
    if (module === "invoices") setCustomerInvoices((items) => items.filter((item) => item.number !== key));
    if (module === "employees") setStaff((items) => items.filter((item) => item.id !== key));
    if (module === "tasks") setTaskList((items) => items.filter((item) => item.id !== key));
    if (module === "documents") setDocuments((items) => items.filter((item) => item.id !== key));
    persistDelete(module, key);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadDocument(file, metadata) {
    const baseRecord = {
      id: Date.now(),
      kind: metadata.kind,
      relatedType: metadata.relatedType,
      relatedNumber: metadata.relatedNumber || "-",
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      notes: metadata.notes || "",
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseConfigured) {
      const saved = await uploadDocumentFile(file, baseRecord);
      const record = saved || baseRecord;
      setDocuments((items) => [...items, record]);
      audit("upload", "documents", record, `Documento cargado: ${record.name}`);
      return;
    }

    const url = await readFileAsDataUrl(file);
    const record = { ...baseRecord, storagePath: `local/${baseRecord.id}-${file.name}`, url };
    setDocuments((items) => [...items, record]);
    audit("upload", "documents", record, `Documento cargado: ${record.name}`);
  }

  function createCalendarEvent(event) {
    const record = {
      id: Date.now(),
      text: event.text,
      owner: event.owner || "General",
      priority: event.priority || "Media",
      due: event.due,
      eventType: event.eventType || "Evento",
      startTime: event.startTime || null,
      endTime: event.endTime || null,
      notes: event.notes || "",
    };
    setTaskList((items) => [...items, record]);
    persistRecord("tasks", record);
  }

  async function createRecord(module, form) {
    const amount = Number(form.amount || 0);
    if (module === "clientes") {
      const record = { id: Date.now(), name: form.name, type: form.detail, city: "Neuquen", status: "Prospecto", contact: "Sin asignar", phone: "-", next: "Primer contacto", value: amount };
      setCompanies((items) => [...items, record]);
      persistRecord("companies", record);
      return;
    }
    if (module === "crm") {
      const record = { id: Date.now(), company: form.name, service: form.detail, stage: "Nuevo prospecto", amount, probability: 20, owner: "Ventas", due: "2026-05-15" };
      setOpportunities((items) => [...items, record]);
      persistRecord("opportunities", record);
      return;
    }
    if (module === "presupuestos") {
      const subtotal = Math.round(amount / 1.21);
      const number = await getDocumentNumber("quote", quotes, "P", 4);
      const record = { number, client: form.name, service: form.detail, subtotal, tax: amount - subtotal, total: amount, status: "Borrador", validUntil: "2026-05-30" };
      setQuotes((items) => [...items, record]);
      persistRecord("quotes", record);
      return;
    }
    if (module === "ot") {
      const number = await getDocumentNumber("work_order", workOrders, "OT", 4);
      const record = { number, client: form.name, service: form.detail, status: "Pendiente", progress: 0, margin: 30, start: "2026-05-15", end: "2026-05-30", team: "Sin asignar" };
      setWorkOrders((items) => [...items, record]);
      persistRecord("workOrders", record);
      return;
    }
    if (module === "inventario") {
      const record = { sku: `MAT-${String(inventoryItems.length + 1).padStart(3, "0")}`, name: form.name, category: form.detail || "General", stock: Number(form.amount || 0), min: 5, unit: "unidades", cost: 0 };
      setInventoryItems((items) => [...items, record]);
      persistRecord("inventory", record);
      return;
    }
    if (module === "compras") {
      const number = await getDocumentNumber("purchase_order", purchaseOrders, "OC", 4);
      const record = { number, supplier: form.name, area: form.detail || "General", total: amount, status: "Pendiente", due: "2026-05-20" };
      setPurchaseOrders((items) => [...items, record]);
      persistRecord("purchases", record);
      return;
    }
    if (module === "finanzas") {
      const number = await getDocumentNumber("invoice", customerInvoices, "F", 5);
      const record = { number, client: form.name, concept: form.detail, total: amount, status: "Pendiente", due: "2026-05-20" };
      setCustomerInvoices((items) => [...items, record]);
      persistRecord("invoices", record);
      return;
    }
    if (module === "rrhh") {
      const record = { id: Date.now(), name: form.name, role: form.detail || "Sin rol", team: "Sin asignar", status: "Disponible", hours: Number(form.amount || 0) };
      setStaff((items) => [...items, record]);
      persistRecord("employees", record);
      return;
    }
    const record = { id: Date.now(), text: form.detail || form.name, owner: form.name || "General", priority: amount > 0 ? "Alta" : "Media", due: "2026-05-20" };
    setTaskList((items) => [...items, record]);
    persistRecord("tasks", record);
  }

  const screenProps = { data, setActive, companies, setCompanies, opportunities, setOpportunities, quotes, setQuotes, workOrders, setWorkOrders, persistUpdate, openEditor, removeRecord, uploadDocument, createCalendarEvent };
  const Screen = {
    dashboard: <Dashboard {...screenProps} />,
    clientes: <Clientes {...screenProps} />,
    crm: <CRM {...screenProps} />,
    presupuestos: <Presupuestos {...screenProps} />,
    ot: <OrdenesTrabajo {...screenProps} />,
    inventario: <Inventario {...screenProps} inventory={data.inventory} />,
    compras: <Compras {...screenProps} purchases={data.purchases} />,
    finanzas: <Finanzas {...screenProps} invoices={data.invoices} />,
    rrhh: <RRHH {...screenProps} employees={data.employees} />,
    tareas: <Tareas {...screenProps} />,
    calendario: <Calendario {...screenProps} />,
    documentos: <Documentos {...screenProps} />,
    auditoria: <Auditoria {...screenProps} />,
    reportes: <Reportes {...screenProps} />,
  }[active] || <Dashboard {...screenProps} />;

  if (shouldBlockUnconfiguredDatabase) {
    return <DatabaseSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f3] p-4">
        <Panel className="p-5 text-center">
          <p className="font-black text-zinc-950">Cargando acceso...</p>
          <p className="mt-1 text-sm text-zinc-500">Validando sesion y permisos.</p>
        </Panel>
      </div>
    );
  }

  if (isDatabaseConfigured && !session) {
    return <LoginScreen onSessionReady={setSession} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-zinc-900">
      <div className="flex">
        <Sidebar active={active} setActive={setActive} availableScreens={availableScreens} data={data} profile={profile} databaseStatus={databaseStatus} />
        <main className="min-h-screen flex-1">
          <Header
            activeLabel={activeLabel}
            databaseStatus={databaseStatus}
            profile={profile}
            onExportBackup={exportBackup}
            onResetLocal={useLocalDemo ? resetLocalDatabase : null}
            onSignOut={isDatabaseConfigured ? handleSignOut : null}
            onNew={() => setModalOpen(true)}
          />
          <MobileNav active={active} setActive={setActive} availableScreens={availableScreens} />
          {Screen}
        </main>
      </div>
      {modalOpen && <NewRecordModal active={active} data={data} onClose={() => setModalOpen(false)} onCreate={createRecord} />}
      {editTarget && <EditRecordModal editTarget={editTarget} onClose={() => setEditTarget(null)} onSave={saveEditedRecord} />}
    </div>
  );
}
