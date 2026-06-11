import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { deleteErpRecord, isDatabaseConfigured, loadErpData, logAuditEvent, nextDocumentNumber, saveErpRecord, shouldBlockUnconfiguredDatabase, updateErpRecord, uploadDocumentFile } from "./src/lib/erpRepository";
import { createUserAccount, getCurrentProfile, getInitialSession, listenAuthChanges, listUserProfiles, signInWithEmail, signOutUser, signUpWithEmail, updateUserProfile } from "./src/lib/authRepository";
import { laborRates, materialPriceCatalog, quoteParameters } from "./src/lib/pricingData";

const initialCompanies = [
  { id: 1, name: "Neuquen Energy Services", type: "Oil & Gas", city: "Anelo", status: "Prospecto", contact: "Mariana Rios", phone: "+54 299 443-1020", contacts: [{ name: "Mariana Rios", role: "Compras", phone: "+54 299 443-1020", email: "mariana@nes.com" }], next: "Llamar compras", value: 18500000 },
  { id: 2, name: "Constructora Patagonia Norte", type: "Constructora", city: "Neuquen", status: "Activo", contact: "Pablo Castro", phone: "+54 299 521-8870", contacts: [{ name: "Pablo Castro", role: "Direccion", phone: "+54 299 521-8870", email: "pablo@cpn.com" }], next: "Enviar presupuesto", value: 7200000 },
  { id: 3, name: "Estudio Arq. Sur", type: "Arquitectura", city: "Plottier", status: "Contactado", contact: "Lucia Herrera", phone: "+54 299 600-1450", contacts: [{ name: "Lucia Herrera", role: "Proyecto", phone: "+54 299 600-1450", email: "lucia@arqsur.com" }], next: "Reunion tecnica", value: 3900000 },
  { id: 4, name: "Servicios Industriales VM", type: "Industria", city: "Centenario", status: "Negociacion", contact: "Victor Molina", phone: "+54 299 477-3099", contacts: [{ name: "Victor Molina", role: "Operaciones", phone: "+54 299 477-3099", email: "victor@sivm.com" }], next: "Definir alcance", value: 12600000 },
  { id: 5, name: "Municipalidad de San Patricio", type: "Sector publico", city: "San Patricio del Chanar", status: "Activo", contact: "Carolina Funes", phone: "+54 299 489-7721", contacts: [{ name: "Carolina Funes", role: "Compras", phone: "+54 299 489-7721", email: "carolina@sanpatricio.gob.ar" }], next: "Presentar avance", value: 5100000 },
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
  { key: "dashboard", label: "Dashboard", icon: "layout", roles: ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh"] },
  { key: "clientes", label: "Clientes", icon: "briefcase", roles: ["admin", "direccion", "ventas"] },
  { key: "crm", label: "CRM", icon: "pipeline", roles: ["admin", "direccion", "ventas"] },
  { key: "importar", label: "Importar leads", icon: "upload", roles: ["admin", "direccion", "ventas"] },
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
];

const menuSections = [
  { title: "Gestion comercial", keys: ["dashboard", "clientes", "crm", "importar", "presupuestos", "cotizador", "ventas"] },
  { title: "Operacion", keys: ["ot", "inventario", "compras", "finanzas", "rrhh"] },
  { title: "Control", keys: ["tareas", "calendario", "documentos", "auditoria", "usuarios", "reportes"] },
];

const userRoles = ["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh", "cliente"];
const accountStatuses = ["pending", "active", "suspended"];

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

function quoteLineTotal(line) {
  return Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

function catalogPrice(item) {
  return Number(item?.basePrice || item?.transferPrice || item?.listPrice || item?.pricePerMeter || 0);
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function openQuotePdfWindow() {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return null;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head><title>Generando presupuesto</title></head>
      <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#f4f4f2;font-family:Arial,sans-serif;color:#18181b">
        <p>Generando presupuesto...</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  return printWindow;
}

function generateQuotePdf(quote, targetWindow = null) {
  if (!quote?.number) return;

  const lineItems = Array.isArray(quote.lineItems) && quote.lineItems.length
    ? quote.lineItems
    : [{ detail: quote.service, quantity: 1, unitPrice: quote.total, total: quote.total }];
  const client = quote.clientDetails || {};
  const logoUrl = `${window.location.origin}/brand/logo_principal_horizontal.png`;
  const rows = lineItems.map((line) => {
    const total = Number(line.total ?? quoteLineTotal(line));
    return `
      <tr>
        <td>${htmlEscape(line.detail)}</td>
        <td class="num">${Number(line.quantity || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</td>
        <td class="num">${money(line.unitPrice)}</td>
        <td class="num strong">${money(total)}</td>
      </tr>
    `;
  }).join("");
  const clientRows = [
    ["Empresa", quote.client],
    ["CUIT", client.taxId],
    ["Contacto", client.contact],
    ["Telefono", client.phone],
    ["Email", client.email],
    ["Direccion", client.address],
  ].filter(([, value]) => value).map(([label, value]) => `<p><span>${label}</span>${htmlEscape(value)}</p>`).join("");

  const printWindow = targetWindow || openQuotePdfWindow();
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${htmlEscape(quote.number)} PRESUPUESTO</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f4f4f2; color: #18181b; font-family: Arial, sans-serif; }
          .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 20mm; }
          header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 3px solid #ff7900; padding-bottom: 18px; }
          img { width: 190px; height: auto; object-fit: contain; }
          h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
          .meta { text-align: right; font-size: 13px; color: #52525b; }
          .meta strong { display: block; color: #18181b; font-size: 20px; margin-top: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 24px 0; }
          .box { border: 1px solid #e4e4e7; padding: 14px; border-radius: 6px; }
          .box h2 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; color: #71717a; }
          .box p { margin: 5px 0; font-size: 13px; }
          .box span { display: inline-block; width: 86px; color: #71717a; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #18181b; color: white; padding: 10px; text-align: left; }
          td { border-bottom: 1px solid #e4e4e7; padding: 10px; vertical-align: top; }
          .num { text-align: right; white-space: nowrap; }
          .strong { font-weight: 700; }
          .totals { width: 330px; margin-left: auto; margin-top: 20px; font-size: 14px; }
          .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4e4e7; }
          .totals .grand { font-size: 19px; font-weight: 700; color: #ff7900; border-bottom: 0; }
          footer { margin-top: 32px; color: #71717a; font-size: 12px; line-height: 1.45; }
          @media print { body { background: white; } .sheet { margin: 0; width: auto; min-height: auto; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header>
            <img src="${logoUrl}" alt="Bizon" />
            <div class="meta">
              <h1>PRESUPUESTO</h1>
              <strong>${htmlEscape(quote.number)}</strong>
              <p>Fecha: ${new Date().toLocaleDateString("es-AR")}</p>
              <p>Valido hasta: ${htmlEscape(quote.validUntil || "-")}</p>
            </div>
          </header>
          <section class="grid">
            <div class="box">
              <h2>Cliente</h2>
              ${clientRows || `<p><span>Empresa</span>${htmlEscape(quote.client)}</p>`}
            </div>
            <div class="box">
              <h2>Trabajo</h2>
              <p><span>Detalle</span>${htmlEscape(quote.service)}</p>
              <p><span>Estado</span>${htmlEscape(quote.status || "Borrador")}</p>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Detalle del producto</th>
                <th class="num">Cantidad</th>
                <th class="num">Precio unitario</th>
                <th class="num">Precio total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <section class="totals">
            <div><span>Subtotal</span><strong>${money(quote.subtotal)}</strong></div>
            <div><span>IVA / impuestos</span><strong>${money(quote.tax)}</strong></div>
            <div class="grand"><span>Total</span><strong>${money(quote.total)}</strong></div>
          </section>
          <footer>
            Presupuesto emitido por Bizon. Los precios quedan sujetos a confirmacion de disponibilidad, alcance tecnico y condiciones comerciales finales.
          </footer>
        </main>
        <script>
          window.addEventListener("load", () => {
            setTimeout(() => window.print(), 250);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function withTimeout(promise, milliseconds, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} demoro demasiado.`)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
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

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitLeadField(value) {
  return normalizeText(value)
    .split(/;|\n|\r|\|/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function leadValue(row, labels) {
  const entries = Object.entries(row || {});
  const wanted = labels.map(normalizeKey);
  const match = entries.find(([key]) => wanted.includes(normalizeKey(key)));
  return normalizeText(match?.[1]);
}

function worksheetToRows(worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, { defval: "", header: 1, raw: false });
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizeKey);
    return headers.includes("empresa") && (headers.includes("contacto") || headers.includes("email"));
  });

  if (headerIndex < 0) {
    return XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
  }

  const headers = matrix[headerIndex].map((header) => normalizeText(header));
  return matrix.slice(headerIndex + 1).map((row) => (
    headers.reduce((record, header, index) => {
      if (header) record[header] = row[index] ?? "";
      return record;
    }, {})
  )).filter((row) => Object.values(row).some((value) => normalizeText(value)));
}

function probabilityForPriority(priority, score) {
  const text = normalizeKey(priority);
  if (text.startsWith("a")) return 35;
  if (text.startsWith("b")) return 25;
  if (text.startsWith("c")) return 15;
  return clamp(Math.round(Number(score || 0) / 3), 10, 40);
}

function addDaysIso(days) {
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0;
  const date = new Date();
  date.setDate(date.getDate() + safeDays);
  return date.toISOString().slice(0, 10);
}

function isValidDateValue(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatDate(value, fallback = "-") {
  if (!isValidDateValue(value)) return fallback;
  return new Date(value).toLocaleDateString("es-AR");
}

function formatDateTime(value, fallback = "-") {
  if (!isValidDateValue(value)) return fallback;
  return new Date(value).toLocaleString("es-AR");
}

function buildLeadContacts(row) {
  const names = splitLeadField(leadValue(row, ["Contacto"]));
  const emails = splitLeadField(leadValue(row, ["Email", "Correo", "Correo electronico"]));
  const phones = splitLeadField(leadValue(row, ["Telefono", "Teléfono", "WhatsApp", "Whatsapp"]));
  const total = Math.max(names.length, emails.length, phones.length, 1);

  return Array.from({ length: total }, (_, index) => ({
    name: names[index] || names[0] || "Sin asignar",
    role: index === 0 ? "Principal" : "Contacto",
    phone: phones[index] || phones[0] || "-",
    email: emails[index] || emails[0] || "",
  }));
}

function normalizeLeadRow(row) {
  const company = leadValue(row, ["Empresa", "Cliente", "Razon social", "Razón social"]);
  const score = Number(leadValue(row, ["Score", "Puntaje"]) || 0);
  const service = leadValue(row, ["Servicio/Rubro detectado", "Servicio", "Rubro", "Necesidad"]);
  const next = leadValue(row, ["Accion comercial sugerida", "Acción comercial sugerida", "Proxima accion", "Próxima accion", "Proximo paso", "Próximo paso"]);
  return {
    rank: leadValue(row, ["Rank", "Ranking"]),
    priority: leadValue(row, ["Prioridad"]),
    score,
    company,
    segment: leadValue(row, ["Segmento"]),
    reason: leadValue(row, ["Por que contactarla", "Por qué contactarla", "Motivo"]),
    sources: leadValue(row, ["Fuentes", "Origen"]),
    service,
    indicators: leadValue(row, ["Clientes/indicadores", "Indicadores"]),
    contacts: buildLeadContacts(row),
    city: leadValue(row, ["Localidad", "Ciudad", "Ubicacion", "Ubicación"]) || "Sin localidad",
    next: next || "Primer contacto comercial",
    probability: probabilityForPriority(leadValue(row, ["Prioridad"]), score),
    owner: "Ventas",
    due: addDaysIso(7),
  };
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

function MenuGlyph({ name }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    layout: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="18" height="7" rx="1.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 12h18" /></>,
    pipeline: <><path d="M4 6h5v5H4zM15 13h5v5h-5zM9 8.5h3a3 3 0 0 1 3 3V13" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    wrench: <><path d="M14 6a5 5 0 0 0 6 6L11 21l-4-4 9-9a5 5 0 0 0-2-2z" /></>,
    box: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>,
    cart: <><path d="M4 5h2l2 11h9l2-7H8" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></>,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 11h5v4h-5a2 2 0 0 1 0-4zM6 9h8" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 11a3 3 0 0 0 0-6M17 20a5 5 0 0 0-3-4" /></>,
    check: <><path d="m5 13 4 4L19 7" /><rect x="3" y="3" width="18" height="18" rx="4" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    folder: <><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    activity: <><path d="M3 12h4l3-7 4 14 3-7h4" /></>,
    userCog: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 10-4.5" /><circle cx="18" cy="17" r="2" /><path d="M18 13v1M18 20v1M14 17h1M21 17h1" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="M8 16v-5M13 16V8M18 16v-8" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></>,
    map: <><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
  };

  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...common}>{paths[name] || paths.layout}</svg>;
}

function IconMark({ icon, active = false }) {
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-white/20 text-current" : "bg-transparent text-zinc-400 group-hover:bg-[#fff4ea] group-hover:text-[#ff7900]"}`}>
      <MenuGlyph name={icon} />
    </span>
  );
}

function Button({ children, onClick, variant = "primary", type = "button", disabled = false }) {
  const styles = {
    primary: "border-[#ff7900] bg-[#ff7900] text-black shadow-sm hover:bg-[#ff8f1f]",
    ghost: "border-[#cfe7dd] bg-[#f0fdf7] text-[#0f766e] hover:border-[#0f766e]",
    danger: "border-[#f3d2d2] bg-[#fff5f5] text-[#b42318] hover:border-[#b42318]",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]}`}>
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
  if (["Vencida", "Bloqueado", "PERDIDO"].includes(status)) return "red";
  return "zinc";
}

function Panel({ children, className = "" }) {
  return <section className={`rounded-[22px] border border-[#ececf0] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.035)] ${className}`}>{children}</section>;
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
  return <input {...props} className="min-h-9 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:ring-2" />;
}

function Select(props) {
  return <select {...props} className="min-h-9 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition focus:border-[#ff7900] focus:ring-2" />;
}

function TextArea(props) {
  return <textarea {...props} className="min-h-24 w-full rounded-lg border border-[#e6e6e2] bg-white px-3 py-2 text-[13px] font-medium text-zinc-900 outline-none ring-[#ff7900] transition placeholder:text-zinc-400 focus:border-[#ff7900] focus:ring-2" />;
}

function canAccessScreen(screen, profileOrRole) {
  const profile = typeof profileOrRole === "string" ? { role: profileOrRole, menuKeys: null } : profileOrRole || {};
  const roleAllowed = screen.roles.includes(profile.role || "ventas");
  if (!roleAllowed) return false;
  if (Array.isArray(profile.menuKeys) && profile.menuKeys.length) return profile.menuKeys.includes(screen.key);
  return true;
}

function screensForRole(role) {
  return screens.filter((screen) => screen.roles.includes(role));
}

function companyContacts(company) {
  if (Array.isArray(company.contacts) && company.contacts.length) {
    return company.contacts.map((contact) => ({
      name: contact.name || "Sin nombre",
      role: contact.role || "Contacto",
      phone: contact.phone || "-",
      email: contact.email || "",
      phones: Array.isArray(contact.phones) ? contact.phones : [],
      emails: Array.isArray(contact.emails) ? contact.emails : [],
      companyDetails: contact.companyDetails || null,
    }));
  }

  return [{
    name: company.contact || "Sin asignar",
    role: "Principal",
    phone: company.phone || "-",
    email: "",
    phones: [],
    emails: [],
    companyDetails: null,
  }];
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function joinList(value) {
  return splitList(value).join("\n");
}

function firstFilled(list, fallback = "") {
  return list.find((item) => String(item || "").trim()) || fallback;
}

function companyDetails(company = {}) {
  const primary = companyContacts(company)[0] || {};
  return {
    taxId: company.taxId || primary.companyDetails?.taxId || "",
    clientCategory: company.clientCategory || primary.companyDetails?.clientCategory || "",
    address: company.address || primary.companyDetails?.address || "",
    locality: company.locality || primary.companyDetails?.locality || company.city || "",
    websites: company.websites || primary.companyDetails?.websites || [],
    socialNetworks: company.socialNetworks || primary.companyDetails?.socialNetworks || [],
    clients: company.clients || primary.companyDetails?.clients || "",
    notes: company.notes || primary.companyDetails?.notes || "",
  };
}

function companySearchText(company) {
  const details = companyDetails(company);
  const contacts = companyContacts(company).map((contact) => `${contact.name} ${contact.role} ${contact.phone} ${contact.email} ${joinList(contact.phones)} ${joinList(contact.emails)}`).join(" ");
  return [
    company.name,
    company.city,
    company.type,
    company.contact,
    contacts,
    details.taxId,
    details.clientCategory,
    details.address,
    details.locality,
    joinList(details.websites),
    joinList(details.socialNetworks),
    details.clients,
  ].join(" ");
}

function initialCompanyForm(record = null) {
  const details = companyDetails(record || {});
  const primary = companyContacts(record || {})[0] || {};
  return {
    name: record?.name || "",
    taxId: details.taxId,
    type: record?.type || "",
    clientCategory: details.clientCategory,
    contact: primary.name && primary.name !== "Sin asignar" ? primary.name : record?.contact || "",
    role: primary.role && primary.role !== "Principal" ? primary.role : "",
    phones: joinList(primary.phones?.length ? primary.phones : [primary.phone || record?.phone].filter(Boolean)),
    emails: joinList(primary.emails?.length ? primary.emails : [primary.email].filter(Boolean)),
    address: details.address,
    locality: details.locality || record?.city || "",
    websites: joinList(details.websites),
    socialNetworks: joinList(details.socialNetworks),
    clients: details.clients,
    status: record?.status || "Prospecto",
    next: record?.next || "Primer contacto",
    value: record?.value || "",
    notes: details.notes,
  };
}

function companyRecordFromForm(form, previous = {}) {
  const phones = splitList(form.phones);
  const emails = splitList(form.emails);
  const details = {
    taxId: form.taxId.trim(),
    clientCategory: form.clientCategory.trim(),
    address: form.address.trim(),
    locality: form.locality.trim(),
    websites: splitList(form.websites),
    socialNetworks: splitList(form.socialNetworks),
    clients: form.clients.trim(),
    notes: form.notes.trim(),
  };
  const primary = {
    name: form.contact.trim() || "Sin asignar",
    role: form.role.trim() || "Principal",
    phone: firstFilled(phones, "-"),
    email: firstFilled(emails, ""),
    phones,
    emails,
    companyDetails: details,
  };

  return {
    ...previous,
    id: previous.id || Date.now(),
    name: form.name.trim(),
    taxId: details.taxId,
    type: form.type.trim() || "General",
    clientCategory: details.clientCategory,
    city: details.locality || "Sin localidad",
    address: details.address,
    locality: details.locality,
    websites: details.websites,
    socialNetworks: details.socialNetworks,
    clients: details.clients,
    notes: details.notes,
    status: form.status || "Prospecto",
    contact: primary.name,
    phone: primary.phone,
    contacts: [primary, ...companyContacts(previous).slice(1)],
    next: form.next.trim() || "Primer contacto",
    value: Number(form.value || 0),
  };
}

function Header({ activeLabel, databaseStatus, profile }) {
  return (
    <header className="border-b border-[#ececf0] bg-white/95 px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="h-10 w-10 rounded-xl bg-black object-contain p-1 lg:hidden" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111]">{activeLabel}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={databaseStatus === "Conectado a Supabase" || databaseStatus === "Base local" ? "green" : databaseStatus === "Error de base" ? "red" : "amber"}>{databaseStatus}</Badge>
          {profile && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#ececf0] bg-white px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1e5] text-sm font-semibold text-[#d85f00]">
                {profile.fullName?.slice(0, 1).toUpperCase() || "U"}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-zinc-950">{profile.fullName}</p>
                <p className="text-xs font-medium text-zinc-500">{profile.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Sidebar({ active, setActive, availableScreens, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut }) {
  const allowedKeys = new Set(availableScreens.map((item) => item.key));
  const hasDatabaseError = databaseStatus === "Error de base";

  return (
    <aside className={`hidden h-screen shrink-0 border-r border-[#ececf0] bg-white p-3 transition-all duration-200 lg:block ${collapsed ? "w-16" : "w-44"}`}>
      <div className="flex h-full flex-col">
        <div className={`relative flex min-h-16 items-center border-b border-[#ececf0] pb-5 ${collapsed ? "justify-center" : "justify-start pr-12"}`}>
          <img src={collapsed ? "/brand/isotipo_bizon.png" : "/brand/logo_principal_horizontal.png"} alt="Bizon Soluciones Industriales" className={collapsed ? "h-8 w-8 rounded-xl bg-black object-contain p-1" : "h-auto max-h-14 w-full object-contain"} />
          <button type="button" onClick={onToggleCollapsed} className="absolute right-0 top-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ececf0] bg-white text-zinc-500 transition hover:border-[#ff7900] hover:text-[#ff7900] lg:inline-flex" title={collapsed ? "Expandir menu" : "Contraer menu"}>
            <span className={`transition ${collapsed ? "rotate-180" : ""}`}><MenuGlyph name="layout" /></span>
          </button>
        </div>
        {hasDatabaseError && !collapsed && (
          <div className="mt-4 rounded-lg border border-[#5b241a] bg-[#1b0d09] p-3 text-xs font-semibold text-[#ffb199]">
            Perfil y datos no cargados. Ejecutar SQL de Supabase y asignar rol admin.
          </div>
        )}
        <nav className="scrollbar-none mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-0">
          {menuSections.map((section) => (
            <div key={section.title}>
              {!collapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{section.title}</p>}
              <div className="space-y-1.5">
                {section.keys.map((key) => screens.find((item) => item.key === key)).filter(Boolean).map((item) => {
                  const allowed = allowedKeys.has(item.key);
                  const isActive = active === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!allowed}
                      onClick={() => allowed && setActive(item.key)}
                      title={allowed ? item.label : "Bloqueado para este rol"}
                      className={`group flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-[13px] font-medium transition ${collapsed ? "justify-center px-0" : ""} ${
                        isActive
                          ? "bg-[#ff7900] text-black shadow-[0_12px_25px_rgba(255,121,0,0.22)]"
                          : allowed
                            ? "text-zinc-500 hover:bg-[#f7f7f5] hover:text-zinc-950"
                            : "cursor-not-allowed text-zinc-300"
                      }`}
                    >
                      <IconMark active={isActive} icon={item.icon} />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className={`mt-5 border-t border-[#ececf0] pt-4 ${collapsed ? "grid justify-center gap-2" : "grid gap-2"}`}>
          {onNew && <Button onClick={onNew}>{collapsed ? <MenuGlyph name="file" /> : "Nuevo registro"}</Button>}
          <Button variant="ghost" onClick={onExportBackup}>{collapsed ? <MenuGlyph name="folder" /> : "Exportar"}</Button>
          {onResetLocal && <Button variant="ghost" onClick={onResetLocal}>{collapsed ? <MenuGlyph name="activity" /> : "Reiniciar local"}</Button>}
          {onSignOut && <Button variant="ghost" onClick={onSignOut}>{collapsed ? <MenuGlyph name="userCog" /> : "Salir"}</Button>}
        </div>
      </div>
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

function MiniSparkBars({ values = [], tone = "green" }) {
  const max = Math.max(...values.map((value) => Number(value || 0)), 1);
  const color = {
    green: "bg-[#0f766e]",
    amber: "bg-[#d85f00]",
    red: "bg-[#b42318]",
    blue: "bg-[#334155]",
    zinc: "bg-zinc-500",
  }[tone] || "bg-[#d85f00]";

  return (
    <div className="mt-4 flex h-10 items-end gap-1.5">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} className={`flex-1 rounded-t-md ${color}`} style={{ height: `${Math.max((Number(value || 0) / max) * 100, 12)}%`, opacity: index === values.length - 1 ? 1 : 0.25 }} />
      ))}
    </div>
  );
}

function StatCard({ title, value, subtitle, tone = "zinc", chart = [] }) {
  const colors = {
    zinc: "text-zinc-500 bg-zinc-100",
    green: "text-[#0f766e] bg-[#ecfdf5]",
    amber: "text-[#a16207] bg-[#fff8e1]",
    red: "text-[#b42318] bg-[#fff1f1]",
    blue: "text-[#334155] bg-[#eef2f7]",
  };
  return (
    <Panel className="p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-zinc-500">{title}</p>
          <p className="mt-5 text-[28px] font-semibold leading-none tracking-tight text-[#050505]">{value}</p>
          <p className="mt-3 text-[13px] font-semibold text-zinc-400">{subtitle}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone] || colors.zinc}`}><MenuGlyph name="chart" /></span>
      </div>
      {!!chart.length && <MiniSparkBars values={chart} tone={tone} />}
    </Panel>
  );
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-zinc-500">{subtitle}</p>}
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
    <Panel className="overflow-hidden shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]" style={{ minWidth: `${Math.max(820, headers.length * 118)}px` }}>
          <thead className="bg-[#fafaf8] text-zinc-500">
            <tr>{headers.map((header) => <th key={header} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#eeeeec]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="font-medium text-zinc-600 transition hover:bg-[#fbfbfa]">
                {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2.5 align-middle">{cell}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-3 py-8 text-center text-sm font-medium text-zinc-500">{empty}</td>
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
      <Badge tone={isDatabaseConfigured ? "green" : "blue"}>{isDatabaseConfigured ? "Datos persistentes" : "Datos locales"}</Badge>
    </div>
  );
}

function CleanBarList({ items, valueFormatter = (value) => value }) {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-zinc-800">{item.label}</span>
            <strong className="text-zinc-950">{valueFormatter(item.value)}</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#ededeb]">
            <div className="h-full rounded-full bg-[#ff7900]" style={{ width: `${Math.max((Number(item.value || 0) / max) * 100, 4)}%` }} />
          </div>
          {item.caption && <p className="text-xs font-semibold text-zinc-500">{item.caption}</p>}
        </div>
      ))}
    </div>
  );
}

function DashboardLineChart({ values = [], labels = [] }) {
  const width = 360;
  const height = 128;
  const max = Math.max(...values.map((value) => Number(value || 0)), 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Number(value || 0) / max) * (height - 18) - 8;
    return { x, y, value, label: labels[index] || "" };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible" role="img" aria-label="Grafico de tendencia">
        <path d={area} fill="#ff7900" opacity="0.08" />
        <path d={path} fill="none" stroke="#ff7900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.x}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="#ff7900" />
            <circle cx={point.x} cy={point.y} r="9" fill="#ff7900" opacity="0.1" />
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-semibold text-zinc-500">
        {points.slice(0, 3).map((point) => <span key={point.label} className="truncate">{point.label}</span>)}
      </div>
    </div>
  );
}

function DashboardRadialChart({ value, label, details = [] }) {
  const normalized = clamp(value, 0, 100);
  return (
    <div className="grid gap-4 rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4 sm:grid-cols-[132px_1fr] sm:items-center">
      <div className="relative h-32 w-32 rounded-full" style={{ background: `conic-gradient(#ff7900 ${normalized}%, #ececf0 ${normalized}% 100%)` }}>
        <div className="absolute inset-4 grid place-items-center rounded-full bg-white">
          <strong className="text-2xl font-semibold tracking-tight text-zinc-950">{Math.round(normalized)}%</strong>
          <span className="-mt-1 text-[11px] font-semibold text-zinc-400">{label}</span>
        </div>
      </div>
      <div className="grid gap-2">
        {details.map((item) => (
          <div key={item.label} className="grid gap-1">
            <div className="flex justify-between gap-3 text-xs font-semibold">
              <span className="text-zinc-500">{item.label}</span>
              <strong className="text-zinc-950">{item.value}</strong>
            </div>
            <Progress value={item.progress} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardStackChart({ items = [] }) {
  const total = items.reduce((sumValue, item) => sumValue + Number(item.value || 0), 0) || 1;
  return (
    <div className="rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4">
      <div className="flex h-5 overflow-hidden rounded-full bg-[#ececf0]">
        {items.map((item, index) => (
          <span
            key={item.label}
            className={index === 0 ? "bg-[#ff7900]" : index === 1 ? "bg-[#111111]" : "bg-[#f2c48d]"}
            style={{ width: `${Math.max((Number(item.value || 0) / total) * 100, 4)}%` }}
          />
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold text-zinc-600">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? "bg-[#ff7900]" : index === 1 ? "bg-[#111111]" : "bg-[#f2c48d]"}`} />
              <span className="truncate">{item.label}</span>
            </span>
            <strong className="text-zinc-950">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ data, setActive }) {
  const pipelineTotal = sum(data.opportunities, "amount");
  const winForecast = weightedPipeline(data.opportunities);
  const receivables = data.invoices.filter((item) => item.status !== "Cobrada");
  const stockAlerts = data.inventory.filter((item) => item.stock <= item.min);
  const avgMargin = data.workOrders.reduce((total, order) => total + order.margin, 0) / data.workOrders.length;
  const commercialItems = data.opportunities.slice(0, 5).map((item) => ({
    label: item.company,
    value: item.amount,
    caption: `${item.probability}% probabilidad - ${item.stage}`,
  }));
  const operationsItems = data.workOrders.map((order) => ({ label: order.number, value: order.progress, caption: `${order.client} - ${order.team}` }));
  const controlItems = [
    { label: "Tareas", value: data.tasks.length, caption: `${data.tasks.filter((item) => item.priority === "Alta").length} prioridad alta` },
    { label: "Documentos", value: data.documents.length, caption: "Adjuntos registrados" },
    { label: "Auditoria", value: data.auditLog.length, caption: "Eventos recientes" },
  ];
  const avgProgress = data.workOrders.length ? data.workOrders.reduce((total, order) => total + Number(order.progress || 0), 0) / data.workOrders.length : 0;
  const controlChartItems = [
    { label: "Tareas", value: data.tasks.length },
    { label: "Documentos", value: data.documents.length },
    { label: "Auditoria", value: data.auditLog.length },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Panel className="p-7 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Vista general</p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-zinc-950">Operacion diaria Bizon</h2>
            <p className="mt-2 max-w-2xl text-[15px] font-semibold text-zinc-500">Resumen ejecutivo para ubicar ventas, produccion y control sin ruido visual.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setActive("reportes")}>Ver reportes</Button>
            <Button onClick={() => setActive("presupuestos")}>Nuevo presupuesto</Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pipeline abierto" value={money(pipelineTotal)} subtitle={`${data.opportunities.length} oportunidades`} tone="green" chart={data.opportunities.map((item) => item.amount)} />
        <StatCard title="Presupuestos" value={data.quotes.filter((item) => item.status !== "Aprobado").length} subtitle="Pendientes o en revision" tone="blue" chart={data.quotes.map((item) => item.total)} />
        <StatCard title="OT en ejecucion" value={data.workOrders.filter((item) => item.status === "En ejecucion").length} subtitle={`${data.workOrders.length} ordenes totales`} tone="amber" chart={data.workOrders.map((item) => item.progress)} />
        <StatCard title="Cuentas por cobrar" value={money(sum(receivables, "total"))} subtitle={`${receivables.length} facturas pendientes`} tone="red" chart={receivables.map((item) => item.total)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5">
          <SectionTitle title="Gestion comercial" subtitle="Pipeline y presupuestos" action="Abrir" onAction={() => setActive("crm")} />
          <div className="mt-5">
            <DashboardLineChart values={commercialItems.map((item) => item.value)} labels={commercialItems.map((item) => item.label)} />
          </div>
          <div className="mt-5">
            <CleanBarList items={commercialItems} valueFormatter={money} />
          </div>
          <div className="mt-5 grid gap-3 rounded-lg border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm">
            <p className="flex justify-between gap-3 text-zinc-600">Pipeline <strong className="text-zinc-950">{money(pipelineTotal)}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Forecast <strong className="text-zinc-950">{money(winForecast)}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Presupuestos <strong className="text-zinc-950">{data.quotes.length}</strong></p>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Operacion" subtitle="OT, inventario y compras" action="Abrir" onAction={() => setActive("ot")} />
          <div className="mt-5">
            <DashboardRadialChart
              value={avgProgress}
              label="avance OT"
              details={[
                { label: "OT activas", value: data.workOrders.length, progress: Math.min(data.workOrders.length * 20, 100) },
                { label: "Stock bajo", value: stockAlerts.length, progress: Math.min(stockAlerts.length * 25, 100) },
                { label: "Compras abiertas", value: data.purchases.filter((item) => item.status !== "Recibida").length, progress: Math.min(data.purchases.filter((item) => item.status !== "Recibida").length * 35, 100) },
              ]}
            />
          </div>
          <div className="mt-5">
            <CleanBarList items={operationsItems} valueFormatter={(value) => `${value}%`} />
          </div>
          <div className="mt-5 grid gap-3 rounded-lg border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm">
            <p className="flex justify-between gap-3 text-zinc-600">OT activas <strong className="text-zinc-950">{data.workOrders.length}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Stock bajo minimo <strong className={stockAlerts.length ? "text-[#b42318]" : "text-zinc-950"}>{stockAlerts.length}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Compras abiertas <strong className="text-zinc-950">{data.purchases.filter((item) => item.status !== "Recibida").length}</strong></p>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Control" subtitle="Tareas, documentos y auditoria" action="Abrir" onAction={() => setActive("tareas")} />
          <div className="mt-5">
            <DashboardStackChart items={controlChartItems} />
          </div>
          <div className="mt-5">
            <CleanBarList items={controlItems} />
          </div>
          <div className="mt-5 grid gap-3">
            {data.tasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-lg border border-[#ecece6] bg-[#fbfbf8] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#050505]">{task.text}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">{task.owner} - {task.due}</p>
                  </div>
                  <Badge tone={task.priority === "Alta" ? "red" : "amber"}>{task.priority}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-5 shadow-none">
        <SectionTitle title="Alertas de stock" subtitle="Material bajo minimo" action="Ver inventario" onAction={() => setActive("inventario")} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stockAlerts.map((item) => (
            <div key={item.sku} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#050505]">{item.name}</span>
                <span className="font-semibold text-[#b42318]">{item.stock}/{item.min}</span>
              </div>
              <Progress value={(item.stock / item.min) * 100} tone="red" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Clientes({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const filtered = companies.filter((company) => {
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  function addContact(company) {
    if (!contactDraft.name.trim()) return;

    const contacts = [...companyContacts(company), {
      name: contactDraft.name.trim(),
      role: contactDraft.role.trim() || "Contacto",
      phone: contactDraft.phone.trim() || "-",
      email: contactDraft.email.trim(),
    }];
    const primary = contacts[0];
    const updated = { ...company, contacts, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
    setContactDraft({ name: "", role: "", phone: "", email: "" });
    setContactEditor(null);
  }

  function removeContact(company, index) {
    const contacts = companyContacts(company).filter((_, contactIndex) => contactIndex !== index);
    const normalized = contacts.length ? contacts : [{ name: "Sin asignar", role: "Principal", phone: "-", email: "" }];
    const primary = normalized[0];
    const updated = { ...company, contacts: normalized, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Agenda comercial compacta con multiples contactos" action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#ececf0] bg-[#fafaf8] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {["Empresa", "Rubro", "Contactos", "Localidad", "Estado", "Proxima accion", "Valor", "Acciones"].map((header) => (
                  <th key={header} className="px-3 py-2.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const contacts = companyContacts(company);
                const editingContacts = contactEditor === company.id;
                return (
                  <tr key={company.id} className="border-b border-[#f0f0ed] align-top last:border-b-0">
                    <td className="max-w-[220px] px-3 py-2.5">
                      <p className="truncate text-[13px] font-semibold text-zinc-950">{company.name}</p>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-600">{company.type}</td>
                    <td className="w-[330px] px-3 py-2.5">
                      <div className="space-y-1">
                        {contacts.slice(0, editingContacts ? contacts.length : 2).map((contact, index) => (
                          <div key={`${contact.name}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-[#ececf0] bg-white px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-900">{contact.name} <span className="font-medium text-zinc-400">/{contact.role}</span></p>
                              <p className="truncate text-[11px] font-medium text-zinc-500">{contact.phone}{contact.email ? ` · ${contact.email}` : ""}</p>
                            </div>
                            {editingContacts && (
                              <button type="button" onClick={() => removeContact(company, index)} className="text-[11px] font-semibold text-[#b42318]">Quitar</button>
                            )}
                          </div>
                        ))}
                        {!editingContacts && contacts.length > 2 && <p className="text-[11px] font-semibold text-zinc-500">+{contacts.length - 2} contactos</p>}
                        {editingContacts && (
                          <div className="grid gap-2 rounded-xl border border-[#ececf0] bg-[#fafaf8] p-2">
                            <div className="grid grid-cols-2 gap-2">
                              <TextInput value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} placeholder="Nombre" />
                              <TextInput value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Cargo/area" />
                              <TextInput value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="Telefono" />
                              <TextInput type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="Email" />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => addContact(company)}>Agregar contacto</Button>
                              <Button variant="ghost" onClick={() => setContactEditor(null)}>Cerrar</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-600">{company.city}</td>
                    <td className="w-[150px] px-3 py-2.5">
                      <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                        {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                      </Select>
                    </td>
                    <td className="max-w-[170px] px-3 py-2.5 font-medium text-zinc-600"><span className="line-clamp-1">{company.next}</span></td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-950">{money(company.value)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[#0f766e] transition hover:border-[#0f766e]" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</button>
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[#0f766e] transition hover:border-[#0f766e]" onClick={() => openEditor("clientes", company)}>Editar</button>
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#f3d2d2] bg-[#fff5f5] px-2.5 text-[11px] font-semibold text-[#b42318] transition hover:border-[#b42318]" onClick={() => removeRecord("companies", company.id)}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-medium text-zinc-500">Sin clientes para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ClientesCompact({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const filtered = companies.filter((company) => {
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  function addContact(company) {
    if (!contactDraft.name.trim()) return;
    const contacts = [...companyContacts(company), {
      name: contactDraft.name.trim(),
      role: contactDraft.role.trim() || "Contacto",
      phone: contactDraft.phone.trim() || "-",
      email: contactDraft.email.trim(),
    }];
    const primary = contacts[0];
    const updated = { ...company, contacts, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
    setContactDraft({ name: "", role: "", phone: "", email: "" });
  }

  function removeContact(company, index) {
    const contacts = companyContacts(company).filter((_, contactIndex) => contactIndex !== index);
    const normalized = contacts.length ? contacts : [{ name: "Sin asignar", role: "Principal", phone: "-", email: "" }];
    const primary = normalized[0];
    const updated = { ...company, contacts: normalized, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Datos compactos en una fila uniforme" action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#ececf0] bg-[#fafaf8] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {["Empresa", "Rubro", "Contacto", "Localidad", "Estado", "Proxima accion", "Valor", "Acciones"].map((header) => (
                  <th key={header} className="px-3 py-2.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const contacts = companyContacts(company);
                const primary = contacts[0] || { name: company.contact, phone: company.phone };
                const editingContacts = contactEditor === company.id;
                return (
                  <React.Fragment key={company.id}>
                    <tr className="border-b border-[#f0f0ed] align-middle">
                      <td className="px-3 py-2.5"><p className="truncate text-[13px] font-semibold text-zinc-950">{company.name}</p></td>
                      <td className="px-3 py-2.5 font-medium text-zinc-600"><span className="block truncate">{company.type}</span></td>
                      <td className="px-3 py-2.5">
                        <p className="truncate font-semibold text-zinc-900">{primary.name}</p>
                        <p className="truncate text-[11px] font-medium text-zinc-500">{primary.phone}{contacts.length > 1 ? ` - +${contacts.length - 1}` : ""}</p>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-zinc-600"><span className="block truncate">{company.city}</span></td>
                      <td className="px-3 py-2.5">
                        <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                          {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-zinc-600"><span className="block truncate">{company.next}</span></td>
                      <td className="px-3 py-2.5 font-semibold text-zinc-950"><span className="block truncate">{money(company.value)}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-nowrap gap-1.5">
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[#0f766e] transition hover:border-[#0f766e]" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</button>
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[#0f766e] transition hover:border-[#0f766e]" onClick={() => openEditor("clientes", company)}>Editar</button>
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#f3d2d2] bg-[#fff5f5] px-2.5 text-[11px] font-semibold text-[#b42318] transition hover:border-[#b42318]" onClick={() => removeRecord("companies", company.id)}>Borrar</button>
                        </div>
                      </td>
                    </tr>
                    {editingContacts && (
                      <tr className="border-b border-[#f0f0ed] bg-[#fafaf8]">
                        <td colSpan="8" className="px-3 py-3">
                          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-start">
                            <div className="grid gap-1">
                              {contacts.map((contact, index) => (
                                <div key={`${contact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#ececf0] bg-white px-3 py-2 text-xs">
                                  <span className="min-w-0 truncate font-semibold text-zinc-900">{contact.name} / {contact.role} - {contact.phone}{contact.email ? ` - ${contact.email}` : ""}</span>
                                  <button type="button" onClick={() => removeContact(company, index)} className="shrink-0 font-semibold text-[#b42318]">Quitar</button>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <TextInput value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} placeholder="Nombre" />
                              <TextInput value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Cargo/area" />
                              <TextInput value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="Telefono" />
                              <TextInput type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="Email" />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => addContact(company)}>Agregar contacto</Button>
                              <Button variant="ghost" onClick={() => setContactEditor(null)}>Cerrar</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-medium text-zinc-500">Sin clientes para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ClientesCards({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const filtered = companies.filter((company) => {
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  function addContact(company) {
    if (!contactDraft.name.trim()) return;
    const contacts = [...companyContacts(company), {
      name: contactDraft.name.trim(),
      role: contactDraft.role.trim() || "Contacto",
      phone: contactDraft.phone.trim() || "-",
      email: contactDraft.email.trim(),
    }];
    const primary = contacts[0];
    const updated = { ...company, contacts, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
    setContactDraft({ name: "", role: "", phone: "", email: "" });
  }

  function removeContact(company, index) {
    const contacts = companyContacts(company).filter((_, contactIndex) => contactIndex !== index);
    const normalized = contacts.length ? contacts : [{ name: "Sin asignar", role: "Principal", phone: "-", email: "" }];
    const primary = normalized[0];
    const updated = { ...company, contacts: normalized, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Tarjetas comerciales con contactos y estado" action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((company) => {
          const contacts = companyContacts(company);
          const primary = contacts[0] || { name: company.contact, role: "Principal", phone: company.phone, email: "" };
          const details = companyDetails(company);
          const editingContacts = contactEditor === company.id;
          return (
            <Panel key={company.id} className="flex min-h-[360px] flex-col overflow-hidden shadow-none">
              <div className="border-l-4 border-[#ff7900] bg-[#fff8f1] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d85f00]">Cliente</p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-zinc-950">{company.name}</h3>
                  </div>
                  <Badge tone={toneForStatus(company.status)}>{company.status}</Badge>
                </div>
              </div>

              <div className="grid flex-1 gap-3 p-4">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Rubro</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{company.type}</p>
                  </div>
                  <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Localidad</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{company.city}</p>
                  </div>
                  <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Valor potencial</p>
                    <p className="mt-1 truncate font-semibold text-[#d85f00]">{money(company.value)}</p>
                  </div>
                  <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Estado</p>
                    <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                      {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Proxima accion</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-800">{company.next}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">CUIT</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{details.taxId || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Direccion</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{details.address || "-"}</p>
                  </div>
                </div>
                {(details.websites.length > 0 || details.socialNetworks.length > 0) && (
                  <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3 text-xs font-semibold text-zinc-600">
                    <p className="truncate">{details.websites[0] || details.socialNetworks[0]}</p>
                    {(details.websites.length + details.socialNetworks.length) > 1 && <p className="mt-1 text-[11px] text-zinc-400">+{details.websites.length + details.socialNetworks.length - 1} enlaces</p>}
                  </div>
                )}

                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Contacto principal</p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">{primary.name} <span className="font-medium text-zinc-400">/{primary.role}</span></p>
                      <p className="truncate text-xs font-medium text-zinc-500">{primary.phone}{primary.email ? ` - ${primary.email}` : ""}</p>
                    </div>
                    {contacts.length > 1 && <Badge tone="blue">+{contacts.length - 1}</Badge>}
                  </div>
                </div>

                {editingContacts && (
                  <div className="grid gap-3 rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                    <div className="grid gap-1">
                      {contacts.map((contact, index) => (
                        <div key={`${contact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#ececf0] bg-white px-3 py-2 text-xs">
                          <span className="min-w-0 truncate font-semibold text-zinc-900">{contact.name} / {contact.role} - {contact.phone}{contact.email ? ` - ${contact.email}` : ""}</span>
                          <button type="button" onClick={() => removeContact(company, index)} className="shrink-0 font-semibold text-[#b42318]">Quitar</button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} placeholder="Nombre" />
                      <TextInput value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Cargo/area" />
                      <TextInput value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="Telefono" />
                      <TextInput type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="Email" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => addContact(company)}>Agregar contacto</Button>
                      <Button variant="ghost" onClick={() => setContactEditor(null)}>Cerrar</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto flex gap-2 border-t border-[#ececf0] p-4">
                <Button variant="ghost" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</Button>
                <Button variant="ghost" onClick={() => openEditor("clientes", company)}>Editar</Button>
                <Button variant="danger" onClick={() => removeRecord("companies", company.id)}>Borrar</Button>
              </div>
            </Panel>
          );
        })}
        {!filtered.length && <Panel className="p-5 text-sm font-medium text-zinc-500">Sin clientes para mostrar.</Panel>}
      </div>
    </div>
  );
}

function ImportarLeads({ companies, opportunities, onImportLeads }) {
  const [fileName, setFileName] = useState("");
  const [workbook, setWorkbook] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [source, setSource] = useState("Correo / WhatsApp");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  const normalizedLeads = useMemo(() => rows.map(normalizeLeadRow).filter((lead) => lead.company), [rows]);
  const existingCompanies = useMemo(() => new Set(companies.map((company) => normalizeKey(company.name))), [companies]);
  const existingOpportunities = useMemo(() => new Set(opportunities.map((item) => `${normalizeKey(item.company)}|${normalizeKey(item.service)}`)), [opportunities]);
  const summary = useMemo(() => {
    const companiesToCreate = normalizedLeads.filter((lead) => !existingCompanies.has(normalizeKey(lead.company))).length;
    const opportunitiesToCreate = normalizedLeads.filter((lead) => !existingOpportunities.has(`${normalizeKey(lead.company)}|${normalizeKey(lead.service)}`)).length;
    const contactCount = normalizedLeads.reduce((total, lead) => total + lead.contacts.length, 0);
    return { companiesToCreate, opportunitiesToCreate, contactCount };
  }, [existingCompanies, existingOpportunities, normalizedLeads]);

  function parseSheet(book, name) {
    const worksheet = book.Sheets[name];
    const parsedRows = worksheetToRows(worksheet);
    const validCount = parsedRows.map(normalizeLeadRow).filter((lead) => lead.company).length;
    const columns = Object.keys(parsedRows[0] || {}).slice(0, 6).join(", ");
    setRows(parsedRows);
    setSheetName(name);
    setMessage(`${parsedRows.length} filas leidas en "${name}". ${validCount} leads validos detectados${columns ? ` (${columns})` : ""}.`);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const book = XLSX.read(buffer, { type: "array" });
    const preferred = book.SheetNames.find((name) => normalizeKey(name).includes("top 30")) || book.SheetNames.find((name) => normalizeKey(name).includes("leads")) || book.SheetNames[0];
    setWorkbook(book);
    setFileName(file.name);
    parseSheet(book, preferred);
  }

  async function importRows() {
    if (!normalizedLeads.length) {
      setMessage("No hay leads validos para importar.");
      return;
    }
    const result = await onImportLeads(normalizedLeads, { source, sheetName, fileName });
    setMessage(`Importacion finalizada: ${result.companiesCreated} clientes nuevos, ${result.companiesUpdated} actualizados, ${result.contactsAdded} contactos agregados y ${result.opportunitiesCreated} oportunidades.`);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Importar leads" subtitle="Carga masiva desde Excel de correos, WhatsApp y prospeccion diaria" />

      <Panel className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_220px_180px_auto] xl:items-end">
          <Field label="Archivo Excel">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="block w-full rounded-xl border border-[#ececf0] bg-white px-3 py-2 text-sm font-medium text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff7900] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
          </Field>
          <Field label="Hoja">
            <Select value={sheetName} onChange={(event) => workbook && parseSheet(workbook, event.target.value)}>
              {(workbook?.SheetNames || []).map((name) => <option key={name}>{name}</option>)}
            </Select>
          </Field>
          <Field label="Origen">
            <Select value={source} onChange={(event) => setSource(event.target.value)}>
              {["Correo / WhatsApp", "Correo", "WhatsApp", "Prospeccion"].map((option) => <option key={option}>{option}</option>)}
            </Select>
          </Field>
          <Button onClick={importRows} disabled={!rows.length}>Importar leads</Button>
        </div>
        {message && <p className="mt-3 text-sm font-semibold text-[#d85f00]">{message}</p>}
      </Panel>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Leads detectados" value={normalizedLeads.length} subtitle={fileName || "Sin archivo"} tone="amber" />
        <StatCard title="Clientes nuevos" value={summary.companiesToCreate} subtitle="Empresas no existentes" tone="green" />
        <StatCard title="Contactos" value={summary.contactCount} subtitle="Se agregan sin duplicar email/tel." tone="blue" />
        <StatCard title="Oportunidades" value={summary.opportunitiesToCreate} subtitle="CRM en Nuevo prospecto" tone="red" />
      </div>

      <DataTable
        headers={["Rank", "Empresa", "Segmento", "Contacto", "Email", "Telefono", "Localidad", "Accion"]}
        rows={normalizedLeads.slice(0, 40).map((lead) => {
          const primary = lead.contacts[0] || {};
          return [
            <Badge tone={lead.priority?.startsWith("A") ? "green" : "blue"}>{lead.rank || "-"}</Badge>,
            <strong>{lead.company}</strong>,
            lead.segment || "-",
            primary.name || "-",
            primary.email || "-",
            primary.phone || "-",
            lead.city,
            <span className="line-clamp-2 text-xs font-medium text-zinc-600">{lead.next}</span>,
          ];
        })}
        empty="Subi un Excel para previsualizar los leads"
      />
      {normalizedLeads.length > 40 && <p className="text-sm font-medium text-zinc-500">Vista previa limitada a 40 filas. La importacion procesa todas las filas validas.</p>}
    </div>
  );
}

function CRM({ opportunities, setOpportunities, persistUpdate, openEditor, removeRecord }) {
  const stages = ["Nuevo prospecto", "Reunion", "Presupuesto enviado", "Negociacion", "Ganado", "PERDIDO"];
  const stageProbability = {
    "Nuevo prospecto": 20,
    "Reunion": 40,
    "Presupuesto enviado": 65,
    Negociacion: 75,
    Ganado: 100,
    PERDIDO: 0,
  };

  function moveOpportunity(id, stage) {
    const current = opportunities.find((item) => item.id === id);
    const updated = { ...current, stage, probability: stageProbability[stage] || current.probability };
    setOpportunities((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("opportunities", id, updated);
  }

  function moveByOffset(opportunity, offset) {
    const currentIndex = stages.indexOf(opportunity.stage);
    const nextStage = stages[clamp(currentIndex + offset, 0, stages.length - 1)];
    if (nextStage && nextStage !== opportunity.stage) moveOpportunity(opportunity.id, nextStage);
  }

  const compactAction = "inline-flex h-8 items-center justify-center rounded-lg border border-[#ececf0] bg-white px-2.5 text-xs font-semibold text-zinc-700";

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="CRM comercial" subtitle="Canvas de oportunidades por etapa" />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Pipeline" value={money(sum(opportunities, "amount"))} subtitle={`${opportunities.length} oportunidades`} tone="green" />
        <StatCard title="Forecast" value={money(weightedPipeline(opportunities))} subtitle="Probabilidad aplicada" tone="blue" />
        <StatCard title="Ganadas" value={opportunities.filter((item) => item.stage === "Ganado").length} subtitle="Cierres confirmados" tone="amber" />
        <StatCard title="Perdidas" value={opportunities.filter((item) => item.stage === "PERDIDO").length} subtitle="Oportunidades perdidas" tone="red" />
      </div>
      <div className="grid gap-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const cards = opportunities.filter((opportunity) => opportunity.stage === stage);
          const stageTotal = sum(cards, "amount");
          return (
            <Panel key={stage} className="min-h-[460px] min-w-0 p-3 shadow-none">
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-950">{stage}</h3>
                  <Badge>{cards.length}</Badge>
                </div>
                <div className="mt-2 rounded-xl border border-[#ececf0] bg-[#fafaf8] p-2.5">
                  <p className="text-xs font-semibold text-zinc-500">Valor etapa</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-zinc-950">{money(stageTotal)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {cards.map((opportunity) => (
                  <article key={opportunity.id} className="flex min-h-[340px] flex-col rounded-2xl border border-[#ececf0] bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-tight text-zinc-950">{opportunity.company}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-zinc-500">{opportunity.service}</p>
                      </div>
                      <Badge tone={opportunity.stage === "Ganado" ? "green" : "blue"}>{opportunity.stage}</Badge>
                    </div>
                    <div className="mt-4">
                      <ProgressRing value={opportunity.probability} label="Prob." />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-zinc-400">Monto</p>
                        <p className="mt-1 truncate font-semibold text-[#d85f00]">{money(opportunity.amount)}</p>
                      </div>
                      <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-zinc-400">Cierre</p>
                        <p className="mt-1 font-semibold text-zinc-950">{opportunity.due}</p>
                      </div>
                      <div className="col-span-2 rounded-xl border border-[#ececf0] bg-white p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-zinc-400">Responsable</p>
                        <p className="mt-1 truncate font-semibold text-zinc-950">{opportunity.owner}</p>
                      </div>
                    </div>
                    <div className="hidden">
                      <button type="button" className={compactAction} onClick={() => moveByOffset(opportunity, -1)}>←</button>
                      <button type="button" className={compactAction} onClick={() => moveByOffset(opportunity, 1)}>→</button>
                      <button type="button" className={compactAction} onClick={() => openEditor("crm", opportunity)}>Editar</button>
                      <button type="button" className={`${compactAction} border-[#f3d2d2] text-[#b42318] hover:border-[#b42318] hover:text-[#b42318]`} onClick={() => removeRecord("opportunities", opportunity.id)}>Borrar</button>
                    </div>
                    <div className="mt-auto grid gap-2 pt-4">
                      <Select value={opportunity.stage} onChange={(event) => moveOpportunity(opportunity.id, event.target.value)}>
                        {stages.map((option) => <option key={option}>{option}</option>)}
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" onClick={() => moveByOffset(opportunity, -1)}>Anterior</Button>
                        <Button variant="ghost" onClick={() => moveByOffset(opportunity, 1)}>Siguiente</Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => openEditor("crm", opportunity)}>Editar</Button>
                        <Button variant="danger" onClick={() => removeRecord("opportunities", opportunity.id)}>Borrar</Button>
                      </div>
                    </div>
                  </article>
                ))}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">Sin oportunidades</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function CRMCanvas({ opportunities, setOpportunities, persistUpdate, openEditor, removeRecord }) {
  const [expandedCards, setExpandedCards] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const stages = ["Nuevo prospecto", "Reunion", "Presupuesto enviado", "Negociacion", "Ganado", "PERDIDO"];
  const stageProbability = {
    "Nuevo prospecto": 20,
    "Reunion": 40,
    "Presupuesto enviado": 65,
    Negociacion: 75,
    Ganado: 100,
    PERDIDO: 0,
  };

  function moveOpportunity(id, stage) {
    const current = opportunities.find((item) => item.id === id);
    if (!current || current.stage === stage) return;
    const updated = { ...current, stage, probability: stageProbability[stage] || current.probability };
    setOpportunities((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("opportunities", id, updated);
  }

  function moveByOffset(opportunity, offset) {
    const currentIndex = stages.indexOf(opportunity.stage);
    const nextStage = stages[clamp(currentIndex + offset, 0, stages.length - 1)];
    if (nextStage) moveOpportunity(opportunity.id, nextStage);
  }

  function toggleExpanded(id) {
    setExpandedCards((current) => ({ ...current, [id]: !current[id] }));
  }

  function startDrag(event, opportunity) {
    setDraggingId(opportunity.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(opportunity.id));
  }

  function dropOnStage(event, stage) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain") || draggingId);
    if (id) moveOpportunity(id, stage);
    setDraggingId(null);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="CRM comercial" subtitle="Pestanas de oportunidades por estado. Arrastrar para cambiar etapa." />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Pipeline" value={money(sum(opportunities, "amount"))} subtitle={`${opportunities.length} oportunidades`} tone="green" />
        <StatCard title="Forecast" value={money(weightedPipeline(opportunities))} subtitle="Probabilidad aplicada" tone="blue" />
        <StatCard title="Ganadas" value={opportunities.filter((item) => item.stage === "Ganado").length} subtitle="Cierres confirmados" tone="amber" />
        <StatCard title="Perdidas" value={opportunities.filter((item) => item.stage === "PERDIDO").length} subtitle="Oportunidades perdidas" tone="red" />
      </div>
      <div className="grid gap-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const cards = opportunities.filter((opportunity) => opportunity.stage === stage);
          const stageTotal = sum(cards, "amount");
          return (
            <Panel
              key={stage}
              className={`min-h-[520px] min-w-0 p-3 shadow-none transition ${draggingId ? "ring-1 ring-[#ff7900]/20" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOnStage(event, stage)}
            >
              <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-[#ececf0] bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-950">{stage}</h3>
                  <Badge>{cards.length}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-zinc-500">
                  <span>Valor etapa</span>
                  <span className="truncate text-[#d85f00]">{money(stageTotal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {cards.map((opportunity) => {
                  const expanded = !!expandedCards[opportunity.id];
                  return (
                    <article
                      key={opportunity.id}
                      draggable
                      onDragStart={(event) => startDrag(event, opportunity)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition ${draggingId === opportunity.id ? "border-[#ff7900] opacity-60" : "border-[#ececf0]"}`}
                    >
                      <button type="button" onClick={() => toggleExpanded(opportunity.id)} className="flex w-full items-stretch justify-between gap-3 border-l-4 border-[#ff7900] bg-[#fff8f1] px-3 py-3 text-left transition hover:bg-[#fff1e5]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#d85f00]">Cliente</p>
                          <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-zinc-950">{opportunity.company}</p>
                          <p className="mt-1 truncate text-[11px] font-medium text-zinc-500">{opportunity.service}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-center">
                          <span className="rounded-full bg-[#fff1e5] px-2 py-1 text-[11px] font-semibold text-[#d85f00]">{opportunity.probability}%</span>
                          <span className="text-xs font-semibold text-zinc-400">{expanded ? "Cerrar" : "Abrir"}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-[#ececf0] px-3 pb-3 pt-3">
                          <ProgressRing value={opportunity.probability} label="Prob." />
                          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                            <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-zinc-400">Monto</p>
                              <p className="mt-1 truncate font-semibold text-[#d85f00]">{money(opportunity.amount)}</p>
                            </div>
                            <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-zinc-400">Cierre</p>
                              <p className="mt-1 font-semibold text-zinc-950">{opportunity.due}</p>
                            </div>
                            <div className="col-span-2 rounded-xl border border-[#ececf0] bg-white p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-zinc-400">Responsable</p>
                              <p className="mt-1 truncate font-semibold text-zinc-950">{opportunity.owner}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <Select value={opportunity.stage} onChange={(event) => moveOpportunity(opportunity.id, event.target.value)}>
                              {stages.map((option) => <option key={option}>{option}</option>)}
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" title="Estado anterior" onClick={() => moveByOffset(opportunity, -1)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[#ececf0] bg-white text-base font-semibold text-zinc-600 transition hover:border-[#ff7900] hover:text-[#d85f00]">{"<"}</button>
                              <button type="button" title="Estado siguiente" onClick={() => moveByOffset(opportunity, 1)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[#ececf0] bg-white text-base font-semibold text-zinc-600 transition hover:border-[#ff7900] hover:text-[#d85f00]">{">"}</button>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openEditor("crm", opportunity)} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2 text-[11px] font-semibold text-[#0f766e] transition hover:border-[#0f766e]">Editar</button>
                              <button type="button" onClick={() => removeRecord("opportunities", opportunity.id)} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[#f3d2d2] bg-[#fff5f5] px-2 text-[11px] font-semibold text-[#b42318] transition hover:border-[#b42318]">Borrar</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">Sin oportunidades</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function Presupuestos({ quotes, setQuotes, persistUpdate, openEditor, removeRecord, setActive, currentProfile }) {
  const readOnlyClient = currentProfile?.role === "cliente";
  const visibleQuotes = readOnlyClient && currentProfile?.companyName ? quotes.filter((quote) => quote.client === currentProfile.companyName) : quotes;
  const pendingQuotes = visibleQuotes.filter((quote) => quote.status !== "Aprobado");
  const approvedQuotes = visibleQuotes.filter((quote) => quote.status === "Aprobado");
  const quoteTotal = sum(visibleQuotes, "total");

  function approveQuote(number) {
    const current = quotes.find((item) => item.number === number);
    const updated = { ...current, status: "Aprobado" };
    setQuotes((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("quotes", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Presupuestos" subtitle={readOnlyClient ? `Cotizaciones visibles para ${currentProfile?.companyName || "tu empresa"}` : "Cotizaciones cargadas, estados y vencimientos"} action={readOnlyClient ? null : "Abrir cotizador"} onAction={readOnlyClient ? null : () => setActive("cotizador")} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Cotizaciones" value={visibleQuotes.length} subtitle={`${pendingQuotes.length} pendientes`} tone="blue" />
        <StatCard title="Aprobadas" value={approvedQuotes.length} subtitle="Presupuestos ganados" tone="green" />
        <StatCard title="Total cotizado" value={money(quoteTotal)} subtitle="Importe bruto cargado" tone="amber" />
      </div>
      <DataTable
        headers={["Numero", "Cliente", "Servicio", "Items", "Subtotal", "IVA", "Total", "Estado", "Valido hasta", "Acciones"]}
        rows={visibleQuotes.map((quote) => [
          quote.number,
          quote.client,
          quote.service,
          Array.isArray(quote.lineItems) && quote.lineItems.length ? quote.lineItems.length : 1,
          money(quote.subtotal),
          money(quote.tax),
          <strong>{money(quote.total)}</strong>,
          <Badge tone={toneForStatus(quote.status)}>{quote.status}</Badge>,
          quote.validUntil,
          readOnlyClient ? <Button variant="ghost" onClick={() => generateQuotePdf(quote)}>PDF</Button> : <div className="flex gap-2">
            <Button variant="ghost" onClick={() => generateQuotePdf(quote)}>PDF</Button>
            <Button variant="ghost" onClick={() => approveQuote(quote.number)}>Aprobar</Button>
            <Button variant="ghost" onClick={() => openEditor("presupuestos", quote)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("quotes", quote.number)}>Borrar</Button>
          </div>,
        ])}
        empty="No hay presupuestos para mostrar"
      />
    </div>
  );
}

function Cotizador({ companies, setCompanies, quotes, setQuotes, persistRecord, getDocumentNumber }) {
  const defaultValidUntil = addDaysIso(quoteParameters.offerValidityDays || 7);
  const [clientMode, setClientMode] = useState("existing");
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.name || "");
  const [clientDetails, setClientDetails] = useState({ name: companies[0]?.name || "", taxId: "", contact: companies[0]?.contact || "", phone: companies[0]?.phone || "", email: "", address: "" });
  const [service, setService] = useState("Trabajo metalurgico");
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [lineItems, setLineItems] = useState([]);
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialProvider, setMaterialProvider] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState(1);
  const [selectedLaborId, setSelectedLaborId] = useState(laborRates[0]?.id || "");
  const [laborHours, setLaborHours] = useState(1);
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredMaterials = materialQuery.trim().length < 2 ? [] : materialPriceCatalog
    .filter((item) => (!materialProvider || item.provider === materialProvider) &&
      `${item.name} ${item.category} ${item.spec} ${item.provider} ${item.sku} ${item.brand}`.toLowerCase().includes(materialQuery.toLowerCase()))
    .slice(0, 60);
  const selectedMaterial = materialPriceCatalog.find((item) => item.id === selectedMaterialId) || null;
  const selectedLabor = laborRates.find((item) => item.id === selectedLaborId) || laborRates[0];
  const subtotal = lineItems.reduce((total, line) => total + quoteLineTotal(line), 0);
  const tax = Math.round(subtotal * Number(quoteParameters.iva || 0));
  const total = subtotal + tax;

  useEffect(() => {
    if (!selectedCompany && companies[0]?.name) {
      updateClientFromCompany(companies[0].name);
    }
  }, [companies, selectedCompany]);

  function updateClientFromCompany(name) {
    const company = companies.find((item) => item.name === name);
    setSelectedCompany(name);
    setClientDetails({
      name,
      taxId: "",
      contact: company?.contact || "",
      phone: company?.phone || "",
      email: companyContacts(company || {})[0]?.email || "",
      address: company?.city || "",
    });
  }

  function updateLine(index, patch) {
    setGeneratedQuote(null);
    setLineItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addLine() {
    setGeneratedQuote(null);
    setLineItems((items) => [...items, { id: Date.now(), detail: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(index) {
    setGeneratedQuote(null);
    setLineItems((items) => items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addMaterialLine() {
    if (!selectedMaterial) return;
    const price = catalogPrice(selectedMaterial);
    const meta = {
      category: selectedMaterial.category || "",
      sku: selectedMaterial.sku || "",
      unit: selectedMaterial.unit || "",
      provider: selectedMaterial.provider || "",
      source: selectedMaterial.source || "",
      spec: selectedMaterial.spec || "",
    };
    const detail = [
      selectedMaterial.name,
      meta.spec,
      meta.unit ? `Unidad: ${meta.unit}` : "",
      meta.provider ? `Proveedor: ${meta.provider}` : "",
      meta.sku ? `SKU: ${meta.sku}` : "",
      `Precio base: ${money(price)}`,
    ].filter(Boolean).join(" - ");

    setGeneratedQuote(null);
    setLineItems((items) => [...items, {
      id: `mat-${selectedMaterial.id}-${Date.now()}`,
      type: "material",
      detail,
      quantity: Number(materialQuantity || 1),
      unitPrice: price,
      sourceId: selectedMaterial.id,
      meta,
    }]);
  }

  function addLaborLine() {
    if (!selectedLabor) return;
    const meta = {
      category: selectedLabor.category || "",
      agreement: selectedLabor.agreement || "",
      unit: "hora",
      provider: "Mano de obra Bizon",
      source: "Tarifario interno",
    };
    const detail = `${selectedLabor.trade} - ${selectedLabor.category} - ${selectedLabor.agreement}`;

    setGeneratedQuote(null);
    setLineItems((items) => [...items, {
      id: `labor-${selectedLabor.id}-${Date.now()}`,
      type: "labor",
      detail,
      quantity: Number(laborHours || 1),
      unitPrice: Number(selectedLabor.quoteHour || 0),
      sourceId: selectedLabor.id,
      meta,
    }]);
  }

  function buildQuote(number) {
    const normalizedLines = lineItems.map((line) => ({
      detail: line.detail || "Producto sin detalle",
      quantity: Number(line.quantity || 0),
      unitPrice: Number(line.unitPrice || 0),
      total: quoteLineTotal(line),
      type: line.type || "manual",
      sourceId: line.sourceId || "",
      meta: line.meta || {},
    }));
    return {
      number,
      client: clientDetails.name || selectedCompany || "Cliente sin nombre",
      service: service || normalizedLines[0]?.detail || "Presupuesto",
      subtotal,
      tax,
      total,
      status: "Borrador",
      validUntil,
      lineItems: normalizedLines,
      clientDetails,
    };
  }

  async function saveQuote({ openPdf = false, pdfWindow = null } = {}) {
    if (openPdf && generatedQuote) {
      generateQuotePdf(generatedQuote, pdfWindow);
      return generatedQuote;
    }

    setSaving(true);
    try {
      let companyName = clientDetails.name?.trim();
      if (clientMode === "new" && companyName && !companies.some((company) => normalizeKey(company.name) === normalizeKey(companyName))) {
        const record = {
          id: Date.now(),
          name: companyName,
          type: "Cliente",
          city: clientDetails.address || "Neuquen",
          status: "Prospecto",
          contact: clientDetails.contact || "Sin asignar",
          phone: clientDetails.phone || "-",
          contacts: [{ name: clientDetails.contact || "Sin asignar", role: "Principal", phone: clientDetails.phone || "-", email: clientDetails.email || "" }],
          next: "Seguimiento presupuesto",
          value: total,
        };
        setCompanies((items) => [...items, record]);
        await persistRecord("companies", record);
      }

      const number = await getDocumentNumber("quote", quotes, "P", 4);
      const quote = buildQuote(number);
      setQuotes((items) => [...items, quote]);
      await persistRecord("quotes", quote);
      setGeneratedQuote(quote);
      if (openPdf) generateQuotePdf(quote, pdfWindow);
      return quote;
    } catch (error) {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.document.open();
        pdfWindow.document.write(`
          <!doctype html>
          <html>
            <head><title>Error al generar presupuesto</title></head>
            <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#fff5f5;font-family:Arial,sans-serif;color:#991b1b">
              <div style="max-width:520px;padding:24px;border:1px solid #fecaca;border-radius:10px;background:white">
                <h1 style="margin:0 0 8px;font-size:22px">No se pudo generar el PDF</h1>
                <p style="margin:0;color:#52525b">${htmlEscape(error?.message || "Error desconocido")}</p>
              </div>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function handleGeneratePdf() {
    const pdfWindow = openQuotePdfWindow();
    saveQuote({ openPdf: true, pdfWindow }).catch((error) => {
      console.error("No se pudo generar el presupuesto PDF:", error);
    });
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Cotizador Bizon" subtitle="Armado de presupuesto con empresa, detalle de productos, cantidades, precios y PDF" />

      <Panel className="p-5 shadow-none">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente">
              <Select value={clientMode} onChange={(event) => setClientMode(event.target.value)}>
                <option value="existing">Empresa cargada</option>
                <option value="new">Empresa nueva</option>
              </Select>
            </Field>
            {clientMode === "existing" ? (
              <Field label="Empresa">
                <Select value={selectedCompany} onChange={(event) => updateClientFromCompany(event.target.value)}>
                  {companies.map((company) => <option key={company.id || company.name} value={company.name}>{company.name}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Empresa">
                <TextInput value={clientDetails.name} onChange={(event) => setClientDetails({ ...clientDetails, name: event.target.value })} placeholder="Razon social" />
              </Field>
            )}
            <Field label="CUIT"><TextInput value={clientDetails.taxId} onChange={(event) => setClientDetails({ ...clientDetails, taxId: event.target.value })} placeholder="30-00000000-0" /></Field>
            <Field label="Contacto"><TextInput value={clientDetails.contact} onChange={(event) => setClientDetails({ ...clientDetails, contact: event.target.value })} /></Field>
            <Field label="Telefono"><TextInput value={clientDetails.phone} onChange={(event) => setClientDetails({ ...clientDetails, phone: event.target.value })} /></Field>
            <Field label="Email"><TextInput type="email" value={clientDetails.email} onChange={(event) => setClientDetails({ ...clientDetails, email: event.target.value })} /></Field>
            <Field label="Direccion / ciudad"><TextInput value={clientDetails.address} onChange={(event) => setClientDetails({ ...clientDetails, address: event.target.value })} /></Field>
            <Field label="Valido hasta"><TextInput type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></Field>
          </div>
          <div className="rounded-2xl border border-[#ececf0] bg-[#fafaf8] p-4">
            <p className="text-sm font-semibold text-zinc-950">Resumen</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between"><span>Numero</span><strong>{generatedQuote?.number || "Automatico"}</strong></div>
              <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="flex justify-between"><span>IVA</span><strong>{money(tax)}</strong></div>
              <div className="border-t border-[#e6e6e2] pt-2" />
              <div className="flex justify-between text-base text-zinc-950"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
            {generatedQuote && <Badge tone="green">Generado {generatedQuote.number}</Badge>}
          </div>
        </div>
      </Panel>

      <Panel className="p-5 shadow-none">
        <Field label="Titulo / detalle general del trabajo">
          <TextInput value={service} onChange={(event) => { setGeneratedQuote(null); setService(event.target.value); }} placeholder="Ej. Estructura metalica para nave" />
        </Field>
      </Panel>

      <Panel className="p-5 shadow-none">
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="grid gap-3">
            <SectionTitle title="Base de materiales" subtitle={`${materialPriceCatalog.length} materiales disponibles para agregar al detalle`} />
            <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_96px_max-content] md:items-end">
              <Field label="Proveedor">
                <Select value={materialProvider} onChange={(event) => { setMaterialProvider(event.target.value); setSelectedMaterialId(""); }}>
                  <option value="">Todos</option>
                  {["Carlos Isla", "Neucon", "Ferromundo"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Buscar material">
                <TextInput value={materialQuery} onChange={(event) => { setMaterialQuery(event.target.value); setSelectedMaterialId(""); }} placeholder="Nombre, categoría, SKU, marca…" />
              </Field>
              <Field label="Cantidad">
                <TextInput type="number" min="0" step="0.01" value={materialQuantity} onChange={(event) => setMaterialQuantity(event.target.value)} />
              </Field>
              <Button onClick={addMaterialLine} disabled={!selectedMaterial}>Agregar material</Button>
            </div>
            {filteredMaterials.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[#ececf0] divide-y divide-[#ececf0]">
                {filteredMaterials.map((item) => {
                  const isSelected = selectedMaterial?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(item.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50 text-zinc-800"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 w-12 h-12 rounded overflow-hidden flex items-center justify-center ${isSelected ? "bg-zinc-700" : "bg-zinc-100"} ${item.imagen ? "cursor-zoom-in" : ""}`}
                          onClick={item.imagen ? (e) => { e.stopPropagation(); setLightboxImage({ src: item.imagen, name: item.name }); } : undefined}
                        >
                          {item.imagen
                            ? <img src={item.imagen} alt={item.name} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                            : <span className="text-lg">{item.provider === "Carlos Isla" ? "🏗️" : item.provider === "Neucon" ? "🧱" : "🔧"}</span>
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold leading-snug truncate ${isSelected ? "text-white" : "text-zinc-900"}`}>{item.name}</p>
                          {item.spec && <p className={`text-xs mt-0.5 ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>{item.spec}</p>}
                          <p className={`text-xs mt-0.5 ${isSelected ? "text-zinc-400" : "text-zinc-400"}`}>
                            {[item.brand, item.sku, item.unit ? `Unidad: ${item.unit}` : null, item.provider].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-bold text-sm whitespace-nowrap ${isSelected ? "text-white" : "text-zinc-900"}`}>{money(catalogPrice(item))}</p>
                          {item.stock !== null && (
                            <p className={`text-xs mt-0.5 ${item.stock > 0 ? (isSelected ? "text-green-300" : "text-green-600") : (isSelected ? "text-red-300" : "text-red-500")}`}>
                              {item.stock > 0 ? `Stock: ${item.stock}` : "Sin stock"}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {materialQuery && filteredMaterials.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-4">Sin resultados para "{materialQuery}"</p>
            )}
          </div>

          <div className="grid gap-3">
            <SectionTitle title="Mano de obra" subtitle="Carga de horas por oficio con tarifa de cotizacion" />
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_max-content] md:items-end">
              <Field label="Oficio">
                <Select value={selectedLaborId} onChange={(event) => setSelectedLaborId(event.target.value)}>
                  {laborRates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.trade} - {money(item.quoteHour)}/h
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Horas">
                <TextInput type="number" min="0" step="0.25" value={laborHours} onChange={(event) => setLaborHours(event.target.value)} />
              </Field>
              <Button onClick={addLaborLine} disabled={!selectedLabor}>Agregar horas</Button>
            </div>
            {selectedLabor && (
              <div className="rounded-lg border border-[#ececf0] bg-[#fafaf8] p-3 text-sm text-zinc-600">
                <p className="font-semibold text-zinc-950">{selectedLabor.trade}</p>
                <p>{selectedLabor.category}</p>
                <p className="mt-1">Convenio: {selectedLabor.agreement} · Tarifa: <strong>{money(selectedLabor.quoteHour)}/h</strong></p>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#ececf0] p-5 md:flex-row md:items-center md:justify-between">
          <SectionTitle title="Detalle de productos" subtitle="Columnas de producto, cantidad, precio unitario y precio total" />
          <Button onClick={addLine}>Agregar renglon</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#fafaf8] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Detalle del producto</th>
                <th className="w-[150px] px-4 py-3">Cantidad</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio unitario</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio total</th>
                <th className="w-[100px] px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeec]">
              {lineItems.map((line, index) => (
                <tr key={line.id || index} className="align-top">
                  <td className="px-4 py-4">
                    <TextInput value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} placeholder="Producto, trabajo o servicio cotizado" />
                    {(line.meta?.unit || line.meta?.provider || line.meta?.sku || line.meta?.source || line.meta?.spec) && (
                      <div className="mt-2 grid gap-1 text-xs font-medium text-zinc-500">
                        {line.meta?.spec && <p>{line.meta.spec}</p>}
                        <p>
                          {[
                            line.meta?.unit ? `Unidad: ${line.meta.unit}` : "",
                            line.meta?.provider ? `Proveedor: ${line.meta.provider}` : "",
                            line.meta?.sku ? `SKU: ${line.meta.sku}` : "",
                            line.meta?.source ? `Base: ${line.meta.source}` : "",
                          ].filter(Boolean).join(" | ")}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <TextInput type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                  </td>
                  <td className="px-4 py-4">
                    <TextInput type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="text-base font-semibold text-zinc-950">{money(quoteLineTotal(line))}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="danger" onClick={() => removeLine(index)}>Quitar</Button>
                  </td>
                </tr>
              ))}
              {!lineItems.length && (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500" colSpan={5}>
                    Agrega materiales desde la base, horas de mano de obra o un renglon manual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="p-5 shadow-none">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <p className="text-sm text-zinc-500">Revisar el detalle, generar la numeracion automatica y abrir el PDF del presupuesto.</p>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button onClick={handleGeneratePdf} disabled={saving || !total}>{saving ? "Generando..." : "Generar presupuesto PDF"}</Button>
            {generatedQuote && <Button variant="ghost" onClick={() => generateQuotePdf(generatedQuote)}>Reimprimir PDF</Button>}
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">La numeracion se asigna automaticamente al generar el PDF usando el contador de Presupuestos.</p>
      </Panel>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <p className="text-sm font-semibold text-zinc-800 truncate pr-4">{lightboxImage.name}</p>
              <button
                onClick={() => setLightboxImage(null)}
                className="shrink-0 text-zinc-400 hover:text-zinc-700 text-xl leading-none"
              >✕</button>
            </div>
            <div className="flex items-center justify-center bg-zinc-50 p-6 min-h-[280px]">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.name}
                className="max-h-72 max-w-full object-contain"
                onError={(e) => { e.target.src = ""; e.target.alt = "Sin imagen"; }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value, label = "Avance" }) {
  const safeValue = clamp(Number(value || 0), 0, 100);
  const ringColor = safeValue >= 85 ? "#ff7900" : safeValue >= 50 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(${ringColor} ${safeValue * 3.6}deg, #eeeeec 0deg)` }}>
      <div className="absolute inset-3 rounded-full bg-white" />
      <div className="relative text-center">
        <p className="text-3xl font-semibold tracking-tight text-zinc-950">{safeValue}%</p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function OrdenesTrabajo({ workOrders, setWorkOrders, persistUpdate, openEditor, removeRecord, currentProfile }) {
  const readOnlyClient = currentProfile?.role === "cliente";
  const visibleWorkOrders = readOnlyClient && currentProfile?.companyName ? workOrders.filter((order) => order.client === currentProfile.companyName) : workOrders;

  function setProgress(number, progress) {
    if (readOnlyClient) return;
    const current = workOrders.find((item) => item.number === number);
    const updated = { ...current, progress: clamp(progress, 0, 100), status: progress >= 100 ? "Terminada" : current.status };
    setWorkOrders((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("workOrders", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Ordenes de trabajo" subtitle={readOnlyClient ? `Ordenes visibles para ${currentProfile?.companyName || "tu empresa"}` : "Planificacion, equipo asignado, avance y margen"} />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {visibleWorkOrders.map((order) => {
          const marginTone = order.margin < 30 ? "text-[#b42318]" : "text-[#d85f00]";
          return (
            <Panel key={order.number} className="flex min-h-[420px] flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{order.number}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-zinc-950">{order.client}</h3>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-zinc-500">{order.service}</p>
                </div>
                <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
              </div>

              <div className="mt-5">
                <ProgressRing value={order.progress} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Equipo</p>
                  <p className="mt-1 line-clamp-1 font-semibold text-zinc-950">{order.team}</p>
                </div>
                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Margen</p>
                  <p className={`mt-1 text-lg font-semibold ${marginTone}`}>{order.margin}%</p>
                </div>
                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Inicio</p>
                  <p className="mt-1 font-semibold text-zinc-950">{order.start}</p>
                </div>
                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Entrega</p>
                  <p className="mt-1 font-semibold text-zinc-950">{order.end}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-500">
                  <span>Actualizar avance</span>
                  <span>{order.progress}%</span>
                </div>
                <input className="w-full accent-[#ff7900] disabled:opacity-50" type="range" min="0" max="100" value={order.progress} disabled={readOnlyClient} onChange={(event) => setProgress(order.number, event.target.value)} />
              </div>

              {readOnlyClient ? (
                <div className="mt-auto pt-4"><Badge tone="blue">Solo lectura</Badge></div>
              ) : (
                <div className="mt-auto flex gap-2 pt-4">
                  <Button variant="ghost" onClick={() => openEditor("ot", order)}>Editar</Button>
                  <Button variant="danger" onClick={() => removeRecord("workOrders", order.number)}>Borrar</Button>
                </div>
              )}
            </Panel>
          );
        })}
        {!visibleWorkOrders.length && <Panel className="p-5 text-sm font-medium text-zinc-500">No hay ordenes de trabajo para mostrar.</Panel>}
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
  if (!isValidDateValue(value)) return "";
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
  return events.filter((item) => toDateKey(item.date));
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
              <h2 className="text-xl font-semibold text-[#050505]">{cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</h2>
              <p className="text-sm text-zinc-500">Vencimientos, hitos y tareas</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => changeMonth(-1)}>Anterior</Button>
              <Button variant="ghost" onClick={() => changeMonth(1)}>Siguiente</Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
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
                <span className="text-sm font-semibold text-[#050505]">{cell.day}</span>
                <div className="mt-2 space-y-1">
                  {(cell.events || []).slice(0, 3).map((event) => (
                    <div key={event.id} className="truncate rounded-md bg-[#050505] px-2 py-1 text-[11px] font-semibold text-white">{event.type}</div>
                  ))}
                  {(cell.events || []).length > 3 && <div className="text-[11px] font-semibold text-[#ff7900]">+{cell.events.length - 3}</div>}
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
                      <p className="mt-2 font-semibold text-[#050505]">{event.title}</p>
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
          formatDateTime(event.createdAt),
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

function Usuarios({ userProfiles, companies, currentProfile, onCreateUserProfile, onUpdateUserProfile, onRefreshUsers }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", role: "ventas", status: "active", companyName: "" });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [menuDraft, setMenuDraft] = useState([]);
  const filtered = userProfiles.filter((user) => `${user.fullName} ${user.role} ${user.status} ${user.companyName || ""}`.toLowerCase().includes(query.toLowerCase()));
  const selectedUser = userProfiles.find((user) => user.id === selectedUserId) || filtered[0] || null;
  const selectedRoleScreens = selectedUser ? screensForRole(selectedUser.role) : [];
  const statusTone = {
    active: "green",
    pending: "amber",
    suspended: "red",
  };

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserId("");
      setMenuDraft([]);
      return;
    }
    if (selectedUser.id !== selectedUserId) setSelectedUserId(selectedUser.id);
    setMenuDraft(Array.isArray(selectedUser.menuKeys) && selectedUser.menuKeys.length ? selectedUser.menuKeys : selectedRoleScreens.map((screen) => screen.key));
  }, [selectedUserId, selectedUser?.id, selectedUser?.role, selectedUser?.menuKeys?.join("|")]);

  async function updateProfile(user, patch) {
    if (user.id === currentProfile?.id && patch.status && patch.status !== "active") {
      setMessage("No podes suspender tu propia cuenta administradora.");
      return;
    }

    try {
      await onUpdateUserProfile(user.id, patch);
      setMessage("Usuario actualizado.");
    } catch (error) {
      setMessage(error.message || "No se pudo actualizar el usuario.");
    }
  }

  function toggleMenuKey(key) {
    setMenuDraft((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function saveUserMenu() {
    if (!selectedUser) return;
    const allowedKeys = new Set(selectedRoleScreens.map((screen) => screen.key));
    let nextKeys = menuDraft.filter((key) => allowedKeys.has(key));

    if (selectedUser.id === currentProfile?.id && selectedUser.role === "admin" && !nextKeys.includes("usuarios")) {
      nextKeys = [...nextKeys, "usuarios"];
      setMessage("Se mantuvo Usuarios activo para que no pierdas acceso a tu administracion.");
    }

    try {
      await onUpdateUserProfile(selectedUser.id, { menuKeys: nextKeys });
      setMessage("Menu del usuario actualizado.");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar el menu del usuario.");
    }
  }

  async function resetUserMenu() {
    if (!selectedUser) return;

    try {
      await onUpdateUserProfile(selectedUser.id, { menuKeys: [] });
      setMessage("Menu restablecido segun el rol.");
    } catch (error) {
      setMessage(error.message || "No se pudo restablecer el menu.");
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      await onCreateUserProfile(newUser);
      setNewUser({ fullName: "", email: "", password: "", role: "ventas", status: "active", companyName: "" });
      setMessage("Usuario creado.");
    } catch (error) {
      setMessage(error.message || "No se pudo crear el usuario.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Usuarios" subtitle="Alta operativa, roles y estado de cuentas" action="Actualizar" onAction={onRefreshUsers} />
      <Panel className="p-4">
        <SectionTitle title="Crear usuario" subtitle="Alta directa para personal autorizado" />
        <form onSubmit={createUser} className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.3fr_1fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <Field label="Nombre">
            <TextInput required value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} placeholder="Nombre y apellido" />
          </Field>
          <Field label="Email">
            <TextInput type="email" required value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="usuario@bizon.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={6} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="Min. 6" />
          </Field>
          <Field label="Rol">
            <Select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>
              {userRoles.map((role) => <option key={role}>{role}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={newUser.status} onChange={(event) => setNewUser({ ...newUser, status: event.target.value })}>
              {accountStatuses.map((status) => <option key={status}>{status}</option>)}
            </Select>
          </Field>
          <Field label="Empresa cliente">
            <Select value={newUser.companyName} onChange={(event) => setNewUser({ ...newUser, companyName: event.target.value })}>
              <option value="">Sin empresa</option>
              {companies.map((company) => <option key={company.id} value={company.name}>{company.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">{creating ? "Creando..." : "Crear"}</Button>
        </form>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Activos" value={userProfiles.filter((item) => item.status === "active").length} subtitle="Pueden operar el ERP" tone="green" />
        <StatCard title="Pendientes" value={userProfiles.filter((item) => item.status === "pending").length} subtitle="Esperan aprobacion admin" tone="amber" />
        <StatCard title="Suspendidos" value={userProfiles.filter((item) => item.status === "suspended").length} subtitle="Acceso operativo bloqueado" tone="red" />
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar usuario, rol o estado" />
      {message && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
      <DataTable
        headers={["Usuario", "Rol", "Empresa", "Estado", "Menu", "Creado", "Acciones"]}
        rows={filtered.map((user) => [
          <TextInput value={user.fullName} onChange={(event) => updateProfile(user, { fullName: event.target.value })} />,
          <Select value={user.role} onChange={(event) => updateProfile(user, { role: event.target.value })}>
            {userRoles.map((role) => <option key={role}>{role}</option>)}
          </Select>,
          <Select value={user.companyName || ""} onChange={(event) => updateProfile(user, { companyName: event.target.value })}>
            <option value="">Sin empresa</option>
            {companies.map((company) => <option key={company.id} value={company.name}>{company.name}</option>)}
          </Select>,
          <div className="grid gap-2">
            <Badge tone={statusTone[user.status] || "zinc"}>{user.status}</Badge>
            <Select value={user.status} onChange={(event) => updateProfile(user, { status: event.target.value })}>
              {accountStatuses.map((status) => <option key={status}>{status}</option>)}
            </Select>
          </div>,
          <div className="grid gap-2">
            <Badge tone={Array.isArray(user.menuKeys) && user.menuKeys.length ? "blue" : "zinc"}>
              {Array.isArray(user.menuKeys) && user.menuKeys.length ? `${user.menuKeys.length} modulos` : "Por rol"}
            </Badge>
            <Button variant="ghost" onClick={() => setSelectedUserId(user.id)}>Administrar</Button>
          </div>,
          formatDate(user.createdAt),
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => updateProfile(user, { status: "active" })}>Activar</Button>
            <Button variant="danger" onClick={() => updateProfile(user, { status: "suspended" })}>Baja</Button>
          </div>,
        ])}
        empty="No hay usuarios para mostrar"
      />
      {selectedUser && (
        <Panel className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              title="Administracion de menu"
              subtitle={`${selectedUser.fullName} - ${selectedUser.role}`}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={resetUserMenu}>Usar menu por rol</Button>
              <Button onClick={saveUserMenu}>Guardar menu</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selectedRoleScreens.map((screen) => (
              <label key={screen.key} className="flex min-h-11 items-center gap-3 rounded-lg border border-[#e6e6e2] bg-white px-3 py-2 text-sm font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={menuDraft.includes(screen.key)}
                  onChange={() => toggleMenuKey(screen.key)}
                  disabled={selectedUser.id === currentProfile?.id && screen.key === "usuarios"}
                  className="h-4 w-4 accent-[#ff7900]"
                />
                <span>{screen.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">Si no se guarda una configuracion personalizada, el usuario ve automaticamente todos los modulos habilitados para su rol.</p>
        </Panel>
      )}
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
  const [companyForm, setCompanyForm] = useState(() => initialCompanyForm());
  const title = `Nuevo registro - ${screens.find((item) => item.key === active)?.label || "ERP"}`;

  async function submit(event) {
    event.preventDefault();
    await onCreate(active, active === "clientes" ? companyForm : form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4">
      <form onSubmit={submit} className={`max-h-[92vh] w-full overflow-y-auto rounded-lg bg-white p-5 shadow-xl ${active === "clientes" ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{active === "clientes" ? "Ficha completa de empresa, datos comerciales y contacto principal." : "Alta rapida para alimentar el modulo actual."}</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {active === "clientes" ? (
          <CompanyFormFields form={companyForm} setForm={setCompanyForm} />
        ) : (
          <div className="mt-5 grid gap-3">
            <Field label="Nombre / cliente"><TextInput required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={data.companies[0]?.name || "Cliente"} /></Field>
            <Field label="Detalle / servicio"><TextInput required value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} placeholder="Servicio, concepto o tarea" /></Field>
            <Field label="Importe estimado"><TextInput type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" /></Field>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{active === "clientes" ? "Guardar empresa" : "Crear"}</Button>
        </div>
      </form>
    </div>
  );
}

function CompanyFormFields({ form, setForm }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="mt-5 grid gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Nombre de empresa"><TextInput required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Razon social o nombre comercial" /></Field>
        <Field label="CUIT"><TextInput value={form.taxId} onChange={(event) => update("taxId", event.target.value)} placeholder="30-00000000-0" /></Field>
        <Field label="Rubro"><TextInput value={form.type} onChange={(event) => update("type", event.target.value)} placeholder="Industria, construccion, oil & gas" /></Field>
        <Field label="Tipo de cliente"><TextInput value={form.clientCategory} onChange={(event) => update("clientCategory", event.target.value)} placeholder="Cliente, prospecto, proveedor" /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Contacto"><TextInput value={form.contact} onChange={(event) => update("contact", event.target.value)} placeholder="Nombre y apellido" /></Field>
        <Field label="Cargo"><TextInput value={form.role} onChange={(event) => update("role", event.target.value)} placeholder="Compras, operaciones, gerencia" /></Field>
        <Field label="Telefonos"><TextArea value={form.phones} onChange={(event) => update("phones", event.target.value)} placeholder="Uno por linea o separados por coma" /></Field>
        <Field label="Mails"><TextArea value={form.emails} onChange={(event) => update("emails", event.target.value)} placeholder="contacto@empresa.com" /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Direccion"><TextInput value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Calle, numero, piso" /></Field>
        <Field label="Localidad"><TextInput value={form.locality} onChange={(event) => update("locality", event.target.value)} placeholder="Neuquen" /></Field>
        <Field label="Paginas web"><TextArea value={form.websites} onChange={(event) => update("websites", event.target.value)} placeholder="https://empresa.com" /></Field>
        <Field label="Redes sociales"><TextArea value={form.socialNetworks} onChange={(event) => update("socialNetworks", event.target.value)} placeholder="LinkedIn, Instagram, Facebook" /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Clientes / referencias"><TextArea value={form.clients} onChange={(event) => update("clients", event.target.value)} placeholder="Clientes, obras o referencias relevantes" /></Field>
        <Field label="Estado">
          <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
            {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
          </Select>
        </Field>
        <Field label="Proxima accion"><TextArea value={form.next} onChange={(event) => update("next", event.target.value)} placeholder="Llamar, enviar presupuesto, agendar visita" /></Field>
        <Field label="Valor potencial"><TextInput type="number" value={form.value} onChange={(event) => update("value", event.target.value)} placeholder="0" /></Field>
      </div>

      <Field label="Notas"><TextArea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Observaciones comerciales, condiciones, origen del contacto" /></Field>
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
  const [companyForm, setCompanyForm] = useState(() => initialCompanyForm(editTarget.module === "clientes" ? editTarget.record : null));
  const fields = editFields[editTarget.module] || [];
  const title = `Editar ${screens.find((item) => item.key === editTarget.module)?.label || "registro"}`;

  function submit(event) {
    event.preventDefault();
    onSave(editTarget.module, editTarget.module === "clientes" ? companyRecordFromForm(companyForm, editTarget.record) : form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4">
      <form onSubmit={submit} className={`max-h-[92vh] w-full overflow-y-auto rounded-lg bg-white p-5 shadow-xl ${editTarget.module === "clientes" ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">Los cambios se guardan en Supabase si la base esta conectada.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {editTarget.module === "clientes" ? (
          <CompanyFormFields form={companyForm} setForm={setCompanyForm} />
        ) : (
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
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
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
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">{mode === "login" ? "Ingresar" : "Crear usuario"}</h1>
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

function AccountStatusScreen({ profile, onSignOut }) {
  const status = profile?.status || "pending";
  const title = status === "suspended" ? "Cuenta suspendida" : "Cuenta pendiente";
  const detail = status === "suspended"
    ? "Un administrador debe reactivar esta cuenta para volver a operar."
    : "Un administrador debe activar tu cuenta y asignarte un rol antes de usar el ERP.";

  return (
    <div className="grid min-h-screen place-items-center bg-[#f5f5f3] p-4">
      <Panel className="w-full max-w-md p-5">
        <div className="mb-5">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="mb-4 h-14 w-14 rounded-lg bg-black object-contain p-1" />
          <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{detail}</p>
        </div>
        <div className="rounded-lg border border-[#e4e4de] bg-[#fbfbf8] p-3 text-sm text-zinc-700">
          <p><strong>Usuario:</strong> {profile?.fullName || "Sin perfil"}</p>
          <p><strong>Estado:</strong> {status}</p>
        </div>
        <div className="mt-4">
          <Button variant="ghost" onClick={onSignOut}>Salir</Button>
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
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">Configurar base real</h1>
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

function GlobalStyles() {
  return (
    <style>{`
      body {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      .scrollbar-none {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }
    `}</style>
  );
}

function ScriptBox({ boxId, text, copied, onCopy }) {
  return (
    <div className="relative mt-3 rounded-xl border border-[#ececf0] bg-[#f9f8f6] p-4">
      <button
        type="button"
        onClick={() => onCopy(text, boxId)}
        className="absolute right-3 top-3 rounded-lg border border-[#e4e4e7] bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-[#ff7900] hover:text-[#ff7900]"
      >
        {copied === boxId ? "Copiado ✓" : "Copiar"}
      </button>
      <pre className="mr-16 whitespace-pre-wrap font-[inherit] text-[13px] leading-relaxed text-zinc-700">{text}</pre>
    </div>
  );
}

function ProcesoVentas() {
  const [copied, setCopied] = useState(null);

  function copyText(text, id) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const box = (id, text) => <ScriptBox key={id} boxId={id} text={text} copied={copied} onCopy={copyText} />;

  const processSteps = [
    { stage: "Etapa 1", title: "Preparar contacto", desc: "Identificar empresa, rubro, contacto probable y posible necesidad.", meta: "Meta: evitar mensaje genérico.", decision: false },
    { stage: "Etapa 2", title: "Primer WhatsApp", desc: "Mensaje corto, claro y profesional. Pedir contacto correcto o permiso para presentar servicios.", meta: "Meta: lograr respuesta.", decision: false },
    { stage: "Decisión", title: "¿Responde?", desc: "Sí: clasificar necesidad. No: seguimiento cada 2 a 5 días.", meta: "Meta: no quemar el contacto.", decision: true },
    { stage: "Etapa 3", title: "Diagnóstico", desc: "Preguntar si tercerizan, qué necesitan y quién decide.", meta: "Meta: detectar oportunidad real.", decision: false },
    { stage: "Etapa 4", title: "Valor", desc: "Presentar a Bizon como solución técnica seria, disponible y capaz.", meta: "Meta: diferenciarte.", decision: false },
    { stage: "Etapa 5", title: "Cierre suave", desc: "Reunión, visita técnica, carpeta, registro proveedor o cotización.", meta: "Meta: próximo paso concreto.", decision: false },
  ];

  const followUpDays = [
    { day: "Día 0", title: "Primer contacto", desc: "Mensaje personalizado para ubicar decisor o abrir conversación." },
    { day: "Día 2", title: "Seguimiento 1", desc: "\"Hola, [Nombre]. Te consulto si pudiste ver mi mensaje. Queremos presentarnos como proveedor técnico para futuras necesidades.\"" },
    { day: "Día 5", title: "Seguimiento 2", desc: "\"¿Actualmente están incorporando proveedores o cotizando trabajos técnicos?\"" },
    { day: "Día 10", title: "Valor útil", desc: "Enviar presentación corta o recordar un servicio puntual: urgencias, mantenimiento, obra o electricidad." },
    { day: "Día 15", title: "Cierre elegante", desc: "\"Para no insistirte, te dejo nuestros datos. Cuando necesiten cotizar, quedamos disponibles.\"" },
  ];

  const matrixRows = [
    { resp: "\"Mandame información\"", og: "\"Claro. Para enviarte algo útil, ¿conviene enfocarlo en mantenimiento, soldadura, electricidad, reparaciones o registro como proveedor?\"", cons: "\"Claro. ¿Te sirve que lo enfoque en trabajos para obra, estructuras, electricidad o soluciones para proyectos de arquitectura?\"" },
    { resp: "\"Ya tenemos proveedor\"", og: "\"Perfecto. Muchas empresas igual nos tienen como alternativa para urgencias, paradas, exceso de trabajo o cotizaciones comparativas.\"", cons: "\"Perfecto. Podemos quedar como segunda opción para trabajos puntuales, refuerzos de obra o cuando necesiten resolver algo rápido.\"" },
    { resp: "\"No me interesa\"", og: "\"Entiendo. ¿Es porque tienen todo cubierto o porque ahora no hay necesidad? Te lo consulto para no enviarte algo que no corresponda.\"", cons: "\"Entiendo. ¿Actualmente no están incorporando proveedores o no están con obras que requieran estos servicios?\"" },
    { resp: "\"Pasame precio\"", og: "\"Para cotizar responsablemente necesitamos alcance, ubicación, condiciones y urgencia. Si me pasás esos datos, lo revisamos bien.\"", cons: "\"Podemos cotizar por fotos, planos o visita. Así evitamos pasar un número que después no represente bien el trabajo.\"" },
    { resp: "\"Hablá con compras\"", og: "\"Perfecto. ¿Me podrías pasar contacto de compras o el procedimiento para alta de proveedor?\"", cons: "\"Perfecto. ¿Compras centraliza proveedores o lo define cada jefe de obra/proyecto?\"" },
    { resp: "\"Tenemos algo para cotizar\"", og: "\"Excelente. Pasame fotos, alcance, ubicación, fecha estimada y requisitos de ingreso/documentación. Lo revisamos para cotizar.\"", cons: "\"Excelente. Podés pasarme fotos, planos, medidas, ubicación y plazo esperado. Si hace falta, coordinamos visita a obra.\"" },
  ];

  const funnelSteps = [
    { label: "100 contactos cargados", w: "100%" },
    { label: "60 WhatsApp personalizados enviados", w: "85%" },
    { label: "25 respuestas o derivaciones", w: "70%" },
    { label: "12 presentaciones / registros proveedor", w: "55%" },
    { label: "5 oportunidades de reunión o cotización", w: "40%" },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-950">Proceso comercial por WhatsApp</h1>
        <p className="mt-1.5 max-w-3xl text-[14px] text-zinc-500">Flujo práctico para contactar empresas Oil & Gas, constructoras, arquitectos y estudios. El objetivo es identificar necesidad, llegar al decisor, generar confianza y avanzar hacia registro como proveedor, visita técnica, reunión o cotización.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Soldadura industrial", "Electricidad industrial", "Reparaciones", "Construcción", "WhatsApp B2B"].map((tag) => (
            <Badge key={tag} tone="zinc">{tag}</Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">1</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Mapa general del proceso</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {processSteps.map((step, i) => (
            <Panel key={i} className={`p-4 ${step.decision ? "bg-amber-50" : ""}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">{step.stage}</p>
              <p className="mt-1.5 text-[13px] font-semibold text-zinc-900">{step.title}</p>
              <p className="mt-1 text-[12px] text-zinc-500">{step.desc}</p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">{step.meta}</p>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">2</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Dos caminos comerciales</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #4a55c8" }}>
            <h3 className="font-semibold text-zinc-950">Empresas Oil & Gas / Industria</h3>
            <p className="mt-2 text-[13px] text-zinc-500"><span className="font-semibold text-zinc-700">Dolores:</span> urgencias operativas, paradas, seguridad, documentación, mantenimiento correctivo, proveedores disponibles.</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-600">
              <li>• <span className="font-medium">Enfoque:</span> continuidad operativa y respuesta técnica.</li>
              <li>• <span className="font-medium">Decisor:</span> mantenimiento, operaciones, compras, HSE, ingeniería.</li>
              <li>• <span className="font-medium">Cierre:</span> registro proveedor, visita/relevamiento o cotización técnica.</li>
            </ul>
          </div>
          <div className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #ff7900" }}>
            <h3 className="font-semibold text-zinc-950">Constructoras / Arquitectos / Estudios</h3>
            <p className="mt-2 text-[13px] text-zinc-500"><span className="font-semibold text-zinc-700">Dolores:</span> cumplimiento de obra, coordinación, proveedores que no responden, trabajos metálicos y eléctricos puntuales.</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-600">
              <li>• <span className="font-medium">Enfoque:</span> apoyo en obra, resolución y cumplimiento.</li>
              <li>• <span className="font-medium">Decisor:</span> dueño, jefe de obra, arquitecto, compras o administración técnica.</li>
              <li>• <span className="font-medium">Cierre:</span> carpeta, reunión breve, cotización por planos/fotos o visita a obra.</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">3</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Speech WhatsApp para Oil & Gas</h2>
        </div>
        <div className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #4a55c8" }}>
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Primer contacto</p>
              {box("og-1", "Hola, [Nombre]. ¿Cómo estás? Soy [Tu nombre], de Bizon Soluciones Industriales.\n\nBrindamos servicios de soldadura industrial, electricidad industrial, reparaciones y trabajos técnicos para empresas, bases, plantas y operaciones.\n\nQuería consultar quién ve en [Empresa] el tema de proveedores técnicos para mantenimiento, reparaciones, obra o urgencias operativas.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Cuando responde la persona correcta</p>
              {box("og-2", "Gracias, [Nombre]. Te cuento brevemente.\n\nEn Bizon trabajamos como apoyo técnico para empresas que necesitan resolver trabajos de soldadura industrial, electricidad, reparaciones, mantenimiento correctivo o trabajos especiales en campo/planta.\n\nLa idea es presentarnos como proveedor alternativo para urgencias, trabajos programados o futuras cotizaciones.\n\n¿Actualmente trabajan con proveedores externos para este tipo de servicios?")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Diagnóstico</p>
              {box("og-3", "Para orientarme mejor, ¿qué tipo de trabajos suelen tercerizar más?\n\n1. Soldadura industrial\n2. Electricidad / tableros / instalaciones\n3. Reparaciones y mantenimiento\n4. Estructuras metálicas\n5. Trabajos en obra, base o planta\n6. Urgencias o paradas\n\nCon eso te envío una presentación más enfocada y no algo genérico.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Cierre</p>
              {box("og-4", "Perfecto, [Nombre]. ¿Cuál sería el proceso para que Bizon quede registrado como proveedor o pueda ser considerado en próximas cotizaciones?\n\nTambién podemos coordinar una visita/relevamiento si tienen algún trabajo pendiente o necesidad actual.")}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">4</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Speech WhatsApp para constructoras y arquitectos</h2>
        </div>
        <div className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #ff7900" }}>
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Primer contacto para constructora</p>
              {box("cons-1", "Hola, [Nombre]. ¿Cómo estás? Soy [Tu nombre], de Bizon Soluciones Industriales.\n\nTrabajamos con servicios de soldadura, electricidad, reparaciones y apoyo técnico para obras y empresas constructoras.\n\nQuería consultar quién ve en [Empresa] la incorporación o evaluación de proveedores para trabajos en obra, estructuras metálicas, electricidad o reparaciones.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Primer contacto para arquitectos / estudios</p>
              {box("cons-2", "Hola, [Nombre]. ¿Cómo estás? Soy [Tu nombre], de Bizon Soluciones Industriales.\n\nQuería presentarnos como apoyo técnico para estudios de arquitectura y obras: realizamos trabajos de soldadura, estructuras metálicas, electricidad, reparaciones y soluciones constructivas.\n\n¿Suelen trabajar con proveedores externos para ejecutar este tipo de trabajos en sus proyectos?")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Diagnóstico para obra</p>
              {box("cons-3", "Para entender si podemos serles útiles, te consulto:\n\n¿Actualmente tienen obras en ejecución o próximas donde necesiten apoyo en soldadura, estructuras, electricidad, reparaciones o trabajos especiales?\n\nPodemos cotizar por planos, fotos, visita a obra o alcance preliminar.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Cierre</p>
              {box("cons-4", "Si te parece, te envío una presentación breve de Bizon con servicios y datos de contacto.\n\nY si tienen algún trabajo puntual, nos pueden pasar fotos, planos o ubicación para revisar y cotizar.")}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">5</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Mapa de respuestas según reacción</h2>
        </div>
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#ececf0] bg-[#fff4ea]">
                  <th className="w-44 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">Respuesta</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#4a55c8]">Oil & Gas / Industria</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#d85f00]">Constructoras / Arquitectos</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, i) => (
                  <tr key={i} className={`border-b border-[#ececf0] last:border-0 ${i % 2 === 1 ? "bg-[#fafaf9]" : ""}`}>
                    <td className="w-44 border-r border-[#ececf0] px-4 py-3 align-top text-[12px] font-semibold text-zinc-800">{row.resp}</td>
                    <td className="border-r border-[#ececf0] px-4 py-3 align-top text-[12px] text-zinc-600">{row.og}</td>
                    <td className="px-4 py-3 align-top text-[12px] text-zinc-600">{row.cons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">6</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Secuencia de seguimiento</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {followUpDays.map((d, i) => (
            <Panel key={i} className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">{d.day}</p>
              <p className="mt-1.5 text-[13px] font-semibold text-zinc-900">{d.title}</p>
              <p className="mt-1.5 text-[12px] text-zinc-500 leading-relaxed">{d.desc}</p>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">7</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Embudo comercial sugerido</h2>
        </div>
        <Panel className="p-6">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
            {funnelSteps.map((step, i) => (
              <div key={i} className="rounded-xl border border-[#ffe0c2] bg-[#fff4ea] px-4 py-3 text-center text-[13px] font-semibold text-[#d85f00]" style={{ width: step.w }}>
                {step.label}
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-[12.5px] text-zinc-500">La métrica clave no es solo venta inmediata: es contacto correcto, empresa registrada, cotización abierta y reunión técnica generada.</p>
        </Panel>
      </div>

      <div className="rounded-[22px] border border-[#ffe0c2] bg-[#fff8f0] p-5" style={{ borderLeft: "4px solid #ff7900" }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">Frase central</p>
        <p className="mt-2 text-[14px] font-semibold leading-relaxed text-zinc-900">Bizon no se presenta como un proveedor más de soldadura o electricidad; se presenta como una solución técnica confiable para empresas que necesitan resolver trabajos industriales, obras, reparaciones y urgencias con rapidez, cumplimiento y responsabilidad.</p>
      </div>
    </div>
  );
}

export default function MiniErpBizonPrototype() {
  const useLocalDemo = !isDatabaseConfigured && !shouldBlockUnconfiguredDatabase;
  const [active, setActive] = useState("dashboard");
  const [session, setSession] = useState(isDatabaseConfigured ? null : useLocalDemo ? { user: { id: "demo" } } : null);
  const [profile, setProfile] = useState(isDatabaseConfigured ? null : useLocalDemo ? { id: "demo", fullName: "Modo demo", role: "admin", status: "active", menuKeys: null } : null);
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
  const [userProfiles, setUserProfiles] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [localDatabaseReady, setLocalDatabaseReady] = useState(isDatabaseConfigured || shouldBlockUnconfiguredDatabase);
  const [databaseStatus, setDatabaseStatus] = useState(isDatabaseConfigured ? "Conectando..." : useLocalDemo ? "Base local" : "Configurar Supabase");

  useEffect(() => {
    let cancelled = false;

    async function bootAuth() {
      if (!isDatabaseConfigured) return;

      try {
        const initialSession = await withTimeout(getInitialSession(), 8000, "La validacion de sesion");
        if (cancelled) return;
        setSession(initialSession);
        if (initialSession) {
          const currentProfile = await withTimeout(getCurrentProfile(), 8000, "La carga del perfil");
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
        setProfile(await withTimeout(getCurrentProfile(), 8000, "La carga del perfil"));
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
      if (!isDatabaseConfigured || !session || profile?.status !== "active") return;

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
  }, [session, profile?.status]);

  async function refreshUserProfiles() {
    if (!isDatabaseConfigured || profile?.role !== "admin" || profile?.status !== "active") return;

    try {
      const users = await listUserProfiles();
      setUserProfiles(users);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudieron cargar usuarios:", error);
      setDatabaseStatus("Error de base");
    }
  }

  useEffect(() => {
    refreshUserProfiles();
  }, [session, profile?.role, profile?.status]);

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
  const availableScreens = screens.filter((item) => canAccessScreen(item, profile || { role: "ventas", menuKeys: null }));

  useEffect(() => {
    if (availableScreens.length && !availableScreens.some((item) => item.key === active)) {
      setActive(availableScreens[0].key);
    }
  }, [active, availableScreens]);

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

  async function persistUserProfile(id, patch) {
    if (!isDatabaseConfigured) return;

    const updated = await updateUserProfile(id, patch);
    setUserProfiles((items) => items.map((item) => item.id === id ? updated : item));
    if (id === profile?.id) {
      setProfile((current) => ({ ...current, ...updated }));
    }
    audit("update", "usuarios", { id }, `Actualizacion de usuario ${updated.fullName}`);
  }

  async function createManagedUser(payload) {
    if (!isDatabaseConfigured) return;

    const created = await createUserAccount(payload);
    setUserProfiles((items) => [created, ...items]);
    audit("create", "usuarios", { id: created.id }, `Alta de usuario ${created.fullName}`);
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

  async function importLeads(leads, context = {}) {
    const now = Date.now();
    const companyMap = new Map(companies.map((company) => [normalizeKey(company.name), { ...company, contacts: companyContacts(company) }]));
    const opportunityKeys = new Set(opportunities.map((item) => `${normalizeKey(item.company)}|${normalizeKey(item.service)}`));
    const companyRecords = [];
    const opportunityRecords = [];
    let companiesCreated = 0;
    let companiesUpdated = 0;
    let contactsAdded = 0;
    let opportunitiesCreated = 0;

    leads.forEach((lead, index) => {
      const companyKey = normalizeKey(lead.company);
      if (!companyKey) return;

      const existing = companyMap.get(companyKey);
      const contacts = existing ? [...companyContacts(existing)] : [];
      lead.contacts.forEach((contact) => {
        const contactKey = `${normalizeKey(contact.email)}|${normalizeKey(contact.phone)}|${normalizeKey(contact.name)}`;
        const duplicate = contacts.some((item) => `${normalizeKey(item.email)}|${normalizeKey(item.phone)}|${normalizeKey(item.name)}` === contactKey);
        if (!duplicate) {
          contacts.push(contact);
          contactsAdded += 1;
        }
      });

      const primary = contacts[0] || lead.contacts[0] || { name: "Sin asignar", phone: "-", email: "" };
      const companyRecord = {
        ...(existing || {}),
        id: existing?.id || now + index,
        name: lead.company,
        type: lead.segment || existing?.type || "Lead comercial",
        city: lead.city || existing?.city || "Sin localidad",
        status: existing?.status || "Prospecto",
        contact: primary.name,
        phone: primary.phone,
        contacts,
        next: lead.next,
        value: existing?.value || 0,
        leadSource: context.source || lead.sources || "Carga masiva",
        leadScore: lead.score,
        notes: [lead.reason, lead.indicators, lead.sources].filter(Boolean).join(" | "),
      };

      companyMap.set(companyKey, companyRecord);
      companyRecords.push({ record: companyRecord, exists: !!existing });
      if (existing) companiesUpdated += 1;
      else companiesCreated += 1;

      const service = lead.service || "Oportunidad comercial";
      const opportunityKey = `${companyKey}|${normalizeKey(service)}`;
      if (!opportunityKeys.has(opportunityKey)) {
        const opportunity = {
          id: now + 10000 + index,
          company: lead.company,
          service,
          stage: "Nuevo prospecto",
          amount: 0,
          probability: lead.probability,
          owner: lead.owner,
          due: lead.due,
          priority: lead.priority,
          score: lead.score,
          source: context.source || lead.sources || "Carga masiva",
          next: lead.next,
          notes: [lead.reason, lead.indicators].filter(Boolean).join(" | "),
        };
        opportunityRecords.push(opportunity);
        opportunityKeys.add(opportunityKey);
        opportunitiesCreated += 1;
      }
    });

    const mergedCompanies = [...companyMap.values()];
    setCompanies(mergedCompanies);
    if (opportunityRecords.length) setOpportunities((items) => [...items, ...opportunityRecords]);

    for (const item of companyRecords) {
      if (item.exists) await persistUpdate("companies", item.record.id, item.record);
      else await persistRecord("companies", item.record);
    }
    for (const opportunity of opportunityRecords) {
      await persistRecord("opportunities", opportunity);
    }

    audit("import", "opportunities", { recordKey: context.fileName || "leads" }, `Carga masiva de ${leads.length} leads desde ${context.fileName || "Excel"}`, context);
    return { companiesCreated, companiesUpdated, contactsAdded, opportunitiesCreated };
  }

  async function createRecord(module, form) {
    const amount = Number(form.amount || 0);
    if (module === "clientes") {
      const record = companyRecordFromForm(form);
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

  const screenProps = { data, setActive, companies, setCompanies, opportunities, setOpportunities, quotes, setQuotes, workOrders, setWorkOrders, persistRecord, persistUpdate, getDocumentNumber, openEditor, removeRecord, uploadDocument, createCalendarEvent, userProfiles, currentProfile: profile, onCreateUserProfile: createManagedUser, onUpdateUserProfile: persistUserProfile, onRefreshUsers: refreshUserProfiles, onImportLeads: importLeads, onNewRecord: () => setModalOpen(true) };
  const Screen = {
    dashboard: <Dashboard {...screenProps} />,
    clientes: <ClientesCards {...screenProps} />,
    crm: <CRMCanvas {...screenProps} />,
    importar: <ImportarLeads {...screenProps} />,
    presupuestos: <Presupuestos {...screenProps} />,
    cotizador: <Cotizador {...screenProps} />,
    ventas: <ProcesoVentas />,
    ot: <OrdenesTrabajo {...screenProps} />,
    inventario: <Inventario {...screenProps} inventory={data.inventory} />,
    compras: <Compras {...screenProps} purchases={data.purchases} />,
    finanzas: <Finanzas {...screenProps} invoices={data.invoices} />,
    rrhh: <RRHH {...screenProps} employees={data.employees} />,
    tareas: <Tareas {...screenProps} />,
    calendario: <Calendario {...screenProps} />,
    documentos: <Documentos {...screenProps} />,
    auditoria: <Auditoria {...screenProps} />,
    usuarios: <Usuarios {...screenProps} />,
    reportes: <Reportes {...screenProps} />,
  }[active] || <Dashboard {...screenProps} />;

  if (shouldBlockUnconfiguredDatabase) {
    return <DatabaseSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f5f3] p-4">
        <Panel className="p-5 text-center">
          <p className="font-semibold text-zinc-950">Cargando acceso...</p>
          <p className="mt-1 text-sm text-zinc-500">Validando sesion y permisos.</p>
        </Panel>
      </div>
    );
  }

  if (isDatabaseConfigured && !session) {
    return <LoginScreen onSessionReady={setSession} />;
  }

  if (isDatabaseConfigured && profile && profile.status !== "active") {
    return <AccountStatusScreen profile={profile} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-zinc-900">
      <GlobalStyles />
      <div className="flex">
        <Sidebar
          active={active}
          setActive={setActive}
          availableScreens={availableScreens}
          databaseStatus={databaseStatus}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onExportBackup={exportBackup}
          onResetLocal={useLocalDemo ? resetLocalDatabase : null}
          onSignOut={isDatabaseConfigured ? handleSignOut : null}
          onNew={active === "usuarios" ? null : () => setModalOpen(true)}
        />
        <main className="min-h-screen flex-1">
          <Header
            activeLabel={activeLabel}
            databaseStatus={databaseStatus}
            profile={profile}
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
