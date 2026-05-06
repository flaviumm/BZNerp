import { isDatabaseConfigured, supabase } from "./supabaseClient";

export { isDatabaseConfigured };

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
      next_action: item.next,
      value: Number(item.value || 0),
    }),
    fromDb: (item) => ({ id: item.id, name: item.name, type: item.type, city: item.city, status: item.status, contact: item.contact, phone: item.phone, next: item.next_action, value: Number(item.value || 0) }),
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
    }),
    fromDb: (item) => ({ number: item.number, client: item.client, service: item.service, subtotal: Number(item.subtotal || 0), tax: Number(item.tax || 0), total: Number(item.total || 0), status: item.status, validUntil: item.valid_until }),
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

export async function uploadDocumentFile(file, metadata) {
  if (!isDatabaseConfigured) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = `${metadata.relatedType || "General"}/${metadata.relatedNumber || "sin-numero"}`;
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
