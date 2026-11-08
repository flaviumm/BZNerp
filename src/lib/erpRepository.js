import { isDatabaseConfigured, shouldBlockUnconfiguredDatabase, supabase } from "./supabaseClient";

export { isDatabaseConfigured, shouldBlockUnconfiguredDatabase };

function normalizeContacts(item) {
  const contacts = Array.isArray(item.contacts) && item.contacts.length ? item.contacts : [{ name: item.contact, role: "Principal", phone: item.phone, email: "" }];
  const companyDetails = {
    taxId: item.taxId || "",
    clientCategory: item.clientCategory || "",
    address: item.address || "",
    locality: item.locality || item.city || "",
    websites: Array.isArray(item.websites) ? item.websites : [],
    socialNetworks: Array.isArray(item.socialNetworks) ? item.socialNetworks : [],
    clients: item.clients || "",
    notes: item.notes || "",
  };

  return contacts.map((contact, index) => ({
    ...contact,
    companyDetails: index === 0 ? { ...(contact.companyDetails || {}), ...companyDetails } : contact.companyDetails,
  }));
}

function companyDetailsFromContacts(contacts) {
  const primary = Array.isArray(contacts) ? contacts[0] : null;
  return primary?.companyDetails || {};
}

const modules = {
  companies: {
    table: "companies",
    toDb: (item) => ({
      name: item.name,
      type: item.type,
      city: item.city,
      status: item.status,
      contact: item.contact,
      phone: item.phone,
      contacts: normalizeContacts(item),
      next_action: item.next,
      value: Number(item.value || 0),
    }),
    fromDb: (item) => {
      const contacts = Array.isArray(item.contacts) && item.contacts.length ? item.contacts : [{ name: item.contact, role: "Principal", phone: item.phone, email: "" }];
      const details = companyDetailsFromContacts(contacts);
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        city: details.locality || item.city,
        status: item.status,
        contact: item.contact,
        phone: item.phone,
        contacts,
        next: item.next_action,
        value: Number(item.value || 0),
        taxId: details.taxId || "",
        clientCategory: details.clientCategory || "",
        address: details.address || "",
        locality: details.locality || item.city || "",
        websites: Array.isArray(details.websites) ? details.websites : [],
        socialNetworks: Array.isArray(details.socialNetworks) ? details.socialNetworks : [],
        clients: details.clients || "",
        notes: details.notes || "",
      };
    },
  },
  opportunities: {
    table: "opportunities",
    toDb: (item) => ({
      company: item.company,
      service: item.service,
      stage: item.stage,
      amount: Number(item.amount || 0),
      probability: Number(item.probability || 0),
      owner: item.owner,
      due: item.due,
    }),
    fromDb: (item) => ({ id: item.id, company: item.company, service: item.service, stage: item.stage, amount: Number(item.amount || 0), probability: Number(item.probability || 0), owner: item.owner, due: item.due }),
  },
  quotes: {
    table: "quotes",
    toDb: (item) => ({
      number: item.number,
      client: item.client,
      service: item.service,
      subtotal: Number(item.subtotal || 0),
      tax: Number(item.tax || 0),
      total: Number(item.total || 0),
      status: item.status,
      valid_until: item.validUntil,
      line_items: item.lineItems || [],
      client_details: item.clientDetails || {},
      pricing: {
        jobTitle: item.jobTitle || "",
        adminAmount: Number(item.adminAmount || 0),
        adminOverheadRate: Number(item.adminOverheadRate || 0),
        contingencyAmount: Number(item.contingencyAmount || 0),
        technicalContingencyRate: Number(item.technicalContingencyRate || 0),
        ivaRate: Number(item.ivaRate ?? 0.21),
      },
    }),
    fromDb: (item) => ({ number: item.number, client: item.client, service: item.service, subtotal: Number(item.subtotal || 0), tax: Number(item.tax || 0), total: Number(item.total || 0), status: item.status, validUntil: item.valid_until, lineItems: Array.isArray(item.line_items) ? item.line_items : [], clientDetails: item.client_details || {}, ...(item.pricing || {}) }),
  },
  workOrders: {
    table: "work_orders",
    toDb: (item) => ({
      number: item.number,
      client: item.client,
      service: item.service,
      status: item.status,
      progress: Number(item.progress || 0),
      margin: Number(item.margin || 0),
      start_date: item.start,
      end_date: item.end,
      team: item.team,
    }),
    fromDb: (item) => ({ number: item.number, client: item.client, service: item.service, status: item.status, progress: Number(item.progress || 0), margin: Number(item.margin || 0), start: item.start_date, end: item.end_date, team: item.team }),
  },
  inventory: {
    table: "inventory_items",
    toDb: (item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      stock: Number(item.stock || 0),
      min_stock: Number(item.min || 0),
      unit: item.unit,
      cost: Number(item.cost || 0),
    }),
    fromDb: (item) => ({ sku: item.sku, name: item.name, category: item.category, stock: Number(item.stock || 0), min: Number(item.min_stock || 0), unit: item.unit, cost: Number(item.cost || 0) }),
  },
  purchases: {
    table: "purchase_orders",
    toDb: (item) => ({
      number: item.number,
      supplier: item.supplier,
      area: item.area,
      total: Number(item.total || 0),
      status: item.status,
      due: item.due,
    }),
    fromDb: (item) => ({ number: item.number, supplier: item.supplier, area: item.area, total: Number(item.total || 0), status: item.status, due: item.due }),
  },
  invoices: {
    table: "invoices",
    toDb: (item) => ({
      number: item.number,
      client: item.client,
      concept: item.concept,
      total: Number(item.total || 0),
      status: item.status,
      due: item.due,
    }),
    fromDb: (item) => ({ number: item.number, client: item.client, concept: item.concept, total: Number(item.total || 0), status: item.status, due: item.due }),
  },
  employees: {
    table: "employees",
    toDb: (item) => ({
      name: item.name,
      role: item.role,
      team: item.team,
      status: item.status,
      hours: Number(item.hours || 0),
    }),
    fromDb: (item) => ({ id: item.id, name: item.name, role: item.role, team: item.team, status: item.status, hours: Number(item.hours || 0) }),
  },
  tasks: {
    table: "tasks",
    toDb: (item) => ({
      text: item.text,
      owner: item.owner,
      priority: item.priority,
      due: item.due,
      event_type: item.eventType || "Tarea",
      start_time: item.startTime || null,
      end_time: item.endTime || null,
      notes: item.notes || "",
    }),
    fromDb: (item) => ({ id: item.id, text: item.text, owner: item.owner, priority: item.priority, due: item.due, eventType: item.event_type || "Tarea", startTime: item.start_time, endTime: item.end_time, notes: item.notes || "" }),
  },
  documents: {
    table: "document_files",
    toDb: (item) => ({
      kind: item.kind,
      related_type: item.relatedType,
      related_number: item.relatedNumber,
      name: item.name,
      mime_type: item.mimeType,
      size_bytes: Number(item.size || item.sizeBytes || 0),
      storage_path: item.storagePath,
      public_url: item.url,
      notes: item.notes || "",
    }),
    fromDb: (item) => ({
      id: item.id,
      kind: item.kind,
      relatedType: item.related_type,
      relatedNumber: item.related_number,
      name: item.name,
      mimeType: item.mime_type,
      size: Number(item.size_bytes || 0),
      storagePath: item.storage_path,
      url: item.public_url,
      notes: item.notes || "",
      createdAt: item.created_at,
    }),
  },
  audit: {
    table: "audit_log",
    toDb: (item) => ({
      action: item.action,
      module: item.module,
      record_key: String(item.recordKey || "-"),
      summary: item.summary || "",
      actor_name: item.actorName || "Sistema",
      metadata: item.metadata || {},
    }),
    fromDb: (item) => ({
      id: item.id,
      action: item.action,
      module: item.module,
      recordKey: item.record_key,
      summary: item.summary,
      actorName: item.actor_name,
      metadata: item.metadata || {},
      createdAt: item.created_at,
    }),
  },
};

export async function loadErpData() {
  if (!isDatabaseConfigured) return null;

  const entries = await Promise.all(Object.entries(modules).map(async ([key, config]) => {
    const { data, error } = await supabase.from(config.table).select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return [key, data.map(config.fromDb)];
  }));

  return Object.fromEntries(entries);
}

export async function saveErpRecord(module, record) {
  if (!isDatabaseConfigured) return null;

  const config = modules[module];
  if (!config) return null;

  const payload = config.toDb(record);
  const { data, error } = await supabase.from(config.table).insert(payload).select("*").single();
  if (error) throw error;
  return config.fromDb(data);
}

export async function updateErpRecord(module, key, record) {
  if (!isDatabaseConfigured) return null;

  const config = modules[module];
  if (!config) return null;

  const primaryKey = {
    companies: "id",
    opportunities: "id",
    quotes: "number",
    workOrders: "number",
    inventory: "sku",
    purchases: "number",
    invoices: "number",
    employees: "id",
    tasks: "id",
    documents: "id",
    audit: "id",
  }[module];

  const payload = config.toDb(record);
  const { data, error } = await supabase.from(config.table).update(payload).eq(primaryKey, key).select("*").single();
  if (error) throw error;
  return config.fromDb(data);
}

export async function deleteErpRecord(module, key) {
  if (!isDatabaseConfigured) return null;

  const config = modules[module];
  if (!config) return null;

  const primaryKey = {
    companies: "id",
    opportunities: "id",
    quotes: "number",
    workOrders: "number",
    inventory: "sku",
    purchases: "number",
    invoices: "number",
    employees: "id",
    tasks: "id",
    documents: "id",
    audit: "id",
  }[module];

  const { error } = await supabase.from(config.table).delete().eq(primaryKey, key);
  if (error) throw error;
  return true;
}

export async function nextDocumentNumber(counterCode) {
  if (!isDatabaseConfigured) return null;

  const { data, error } = await supabase.rpc("next_document_number", { counter_code: counterCode });
  if (error) throw error;
  return data;
}

export async function uploadDocumentFile(file, metadata, organizationId) {
  if (!isDatabaseConfigured) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const orgFolder = organizationId || "sin-organizacion";
  const folder = `${orgFolder}/${metadata.relatedType || "General"}/${metadata.relatedNumber || "sin-numero"}`;
  const storagePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("erp-documents").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const record = {
    ...metadata,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
    url: null,
  };

  return saveErpRecord("documents", record);
}

export async function logAuditEvent(event) {
  if (!isDatabaseConfigured) return null;
  return saveErpRecord("audit", event);
}

// --- Configuracion de precios por organizacion -----------------------------
// labor_rate_catalog y quote_calculation_profiles ya estaban escopeados por
// organization_id en la base (migracion multiempresa), pero no tenian CRUD
// propio: la unica forma de cargarlos era un INSERT a mano en el SQL Editor
// de Supabase (database/pricing.sql). Esto le da a cada organizacion una
// pantalla para administrar sus propias tarifas sin depender de un dev de
// Bizon.

function laborRateToDb(item) {
  return {
    trade: item.trade,
    agreement: item.agreement || "",
    category: item.category || "",
    base_hour: Number(item.baseHour || 0),
    monthly_bonus: Number(item.monthlyBonus || 0),
    monthly_hours: Number(item.monthlyHours || 176),
    load_factor: Number(item.loadFactor || 0),
    quote_hour: Number(item.quoteHour || 0),
  };
}

function laborRateFromDb(item) {
  return {
    id: item.id,
    trade: item.trade,
    agreement: item.agreement || "",
    category: item.category || "",
    baseHour: Number(item.base_hour || 0),
    monthlyBonus: Number(item.monthly_bonus || 0),
    monthlyHours: Number(item.monthly_hours || 176),
    loadFactor: Number(item.load_factor || 0),
    quoteHour: Number(item.quote_hour || 0),
  };
}

function slugifyId(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `tarifa-${Date.now()}`;
}

export async function listOwnLaborRates() {
  if (!isDatabaseConfigured) return [];
  const { data, error } = await supabase.from("labor_rate_catalog").select("*").order("trade", { ascending: true });
  if (error) throw error;
  return data.map(laborRateFromDb);
}

export async function createLaborRate(item) {
  if (!isDatabaseConfigured) return null;
  // organization_id lo completa el trigger set_organization_id en base a la
  // sesion -- no se manda desde el cliente (ver 20260801120000_multiempresa.sql).
  const payload = { id: item.id || slugifyId(item.trade), ...laborRateToDb(item) };
  const { data, error } = await supabase.from("labor_rate_catalog").insert(payload).select("*").single();
  if (error) throw error;
  return laborRateFromDb(data);
}

export async function updateLaborRate(id, item) {
  if (!isDatabaseConfigured) return null;
  const { data, error } = await supabase.from("labor_rate_catalog").update(laborRateToDb(item)).eq("id", id).select("*").single();
  if (error) throw error;
  return laborRateFromDb(data);
}

export async function deleteLaborRate(id) {
  if (!isDatabaseConfigured) return null;
  const { error } = await supabase.from("labor_rate_catalog").delete().eq("id", id);
  if (error) throw error;
  return true;
}

function quoteProfileToDb(item) {
  return {
    name: item.name,
    iva: Number(item.iva ?? 0.21),
    iibb: Number(item.iibb ?? 0.035),
    target_profit: Number(item.targetProfit ?? 0.25),
    admin_overhead: Number(item.adminOverhead ?? 0.10),
    technical_contingency: Number(item.technicalContingency ?? 0.05),
    energy_per_kwh: Number(item.energyPerKwh ?? 150),
    travel_per_km: Number(item.travelPerKm ?? 700),
    round_to: Number(item.roundTo ?? 1000),
    validity_days: Number(item.validityDays ?? 7),
  };
}

function quoteProfileFromDb(item) {
  return {
    id: item.id,
    name: item.name,
    iva: Number(item.iva || 0),
    iibb: Number(item.iibb || 0),
    targetProfit: Number(item.target_profit || 0),
    adminOverhead: Number(item.admin_overhead || 0),
    technicalContingency: Number(item.technical_contingency || 0),
    energyPerKwh: Number(item.energy_per_kwh || 0),
    travelPerKm: Number(item.travel_per_km || 0),
    roundTo: Number(item.round_to || 1000),
    validityDays: Number(item.validity_days || 7),
  };
}

// Convencion de 1 perfil por organizacion: el trigger seed_default_quote_calculation_profile
// (20261108100100) crea la fila con id = organization_id al dar de alta la
// empresa. Si por algun motivo no existe (organizaciones creadas antes de esa
// migracion), se toma la primera fila de esa organizacion que haya.
export async function getOwnQuoteCalculationProfile(organizationId) {
  if (!isDatabaseConfigured || !organizationId) return null;
  const { data, error } = await supabase
    .from("quote_calculation_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? quoteProfileFromDb(data) : null;
}

export async function saveOwnQuoteCalculationProfile(organizationId, patch, existingId) {
  if (!isDatabaseConfigured || !organizationId) return null;
  const payload = { id: existingId || organizationId, organization_id: organizationId, ...quoteProfileToDb(patch) };
  const { data, error } = await supabase
    .from("quote_calculation_profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return quoteProfileFromDb(data);
}
