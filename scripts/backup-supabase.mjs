import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

const tables = [
  "profiles",
  "companies",
  "opportunities",
  "quotes",
  "work_orders",
  "inventory_items",
  "purchase_orders",
  "invoices",
  "employees",
  "tasks",
  "document_counters",
  "document_files",
  "audit_log",
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = join(process.cwd(), "backups", stamp);
const storageRoot = join(backupRoot, "storage", "erp-documents");

mkdirSync(storageRoot, { recursive: true });

const manifest = {
  createdAt: new Date().toISOString(),
  source: url,
  tables: {},
  storage: [],
};

for (const table of tables) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.warn(`No se pudo exportar ${table}: ${error.message}`);
    manifest.tables[table] = { ok: false, error: error.message, rows: 0 };
    continue;
  }

  writeFileSync(join(backupRoot, `${table}.json`), JSON.stringify(data, null, 2));
  manifest.tables[table] = { ok: true, rows: data.length };
}

async function downloadFolder(prefix = "") {
  const { data, error } = await supabase.storage.from("erp-documents").list(prefix, { limit: 1000 });
  if (error) {
    console.warn(`No se pudo listar storage ${prefix || "/"}: ${error.message}`);
    return;
  }

  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata === null) {
      await downloadFolder(path);
      continue;
    }

    const { data: blob, error: downloadError } = await supabase.storage.from("erp-documents").download(path);
    if (downloadError) {
      console.warn(`No se pudo descargar ${path}: ${downloadError.message}`);
      continue;
    }

    const bytes = Buffer.from(await blob.arrayBuffer());
    const fullPath = join(storageRoot, ...path.split("/"));
    const dir = fullPath.slice(0, fullPath.lastIndexOf("\\"));
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, bytes);
    manifest.storage.push({ bucket: "erp-documents", path, bytes: bytes.length });
  }
}

await downloadFolder();

writeFileSync(join(backupRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`Backup generado en: ${backupRoot}`);
