import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const backupPath = process.argv[2];

if (!url || !serviceRoleKey) {
  console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!backupPath || !existsSync(backupPath)) {
  console.error("Uso: npm.cmd run restore -- C:\\ruta\\al\\backup");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

const restoreOrder = [
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

for (const table of restoreOrder) {
  const file = join(backupPath, `${table}.json`);
  if (!existsSync(file)) continue;

  const rows = JSON.parse(readFileSync(file, "utf8"));
  if (!rows.length) continue;

  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    console.warn(`No se pudo restaurar ${table}: ${error.message}`);
    continue;
  }

  console.log(`Restaurado ${table}: ${rows.length} filas`);
}

async function uploadFolder(root, prefix = "") {
  if (!existsSync(root)) return;

  for (const item of readdirSync(root, { withFileTypes: true })) {
    const fullPath = join(root, item.name);
    const storagePath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.isDirectory()) {
      await uploadFolder(fullPath, storagePath);
      continue;
    }

    const bytes = readFileSync(fullPath);
    const { error } = await supabase.storage.from("erp-documents").upload(storagePath, bytes, { upsert: true });
    if (error) {
      console.warn(`No se pudo subir ${storagePath}: ${error.message}`);
      continue;
    }
    console.log(`Restaurado archivo: ${storagePath}`);
  }
}

await uploadFolder(join(backupPath, "storage", "erp-documents"));

console.log("Restauracion finalizada.");
