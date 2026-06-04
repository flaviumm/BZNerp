// Converts catalogo_carlosisla.csv → JS array for pricingData.js
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseCSVLine(line) {
  const result = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  result.push(field);
  return result;
}

function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function inferUnit(category, name) {
  const s = ((category || '') + ' ' + (name || '')).toLowerCase();
  if (/alambre/.test(s)) return 'kg';
  if (/electrodo/.test(s)) return 'kg';
  if (/clavo/.test(s)) return 'kg';
  if (/chapa/.test(s)) return 'hoja';
  if (/hierro|perfil|tubo|ca[ñn]o|viga|angular|[aá]ngulo|planchuela/.test(s)) return 'barra';
  if (/bul[oó]n|tornillo|perno|tuerca|arandela|remache/.test(s)) return 'unidad';
  if (/bolsa/.test(s)) return 'bolsa';
  if (/rollo/.test(s)) return 'rollo';
  return 'unidad';
}

function slugToId(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1] || parts[parts.length - 2] || String(Math.random());
    return 'ci-' + slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  } catch {
    return 'ci-' + String(Math.random()).slice(2);
  }
}

const csvPath = join(__dirname, '..', 'catalogo_carlosisla.csv');
const content = readFileSync(csvPath, 'utf-8');
const rows = parseCSV(content);

const seen = new Set();
const catalog = [];

for (const row of rows) {
  let id = slugToId(row.url || '');
  // Ensure uniqueness
  if (seen.has(id)) {
    let n = 2;
    while (seen.has(`${id}-${n}`)) n++;
    id = `${id}-${n}`;
  }
  seen.add(id);

  const listPrice = parseFloat(row.precio_lista) || 0;
  const transferPrice = parseFloat(row.precio_transferencia) || 0;
  const basePrice = transferPrice || listPrice;

  const variante = (row.variante || '').trim();
  const desc = (row.descripcion || '').trim();
  const spec = [desc, variante && variante !== 'único' ? `Variante: ${variante}` : '']
    .filter(Boolean).join(' | ') || '';

  const nombre = (row.nombre || '').trim();
  const name = nombre || id.replace(/^ci-/, '').replace(/-/g, ' ');

  catalog.push({
    id,
    source: 'Carlos Isla',
    category: (row.categoria || '').trim(),
    name,
    spec,
    unit: inferUnit(row.categoria, row.nombre),
    sku: (row.sku || '').trim(),
    brand: (row.marca || '').trim(),
    stock: row.stock !== '' ? (parseInt(row.stock, 10) || null) : null,
    listPrice,
    transferPrice,
    basePrice,
    pricePerMeter: null,
    provider: 'Carlos Isla',
    date: '2026-06-04',
  });
}

process.stdout.write(JSON.stringify(catalog, null, 2) + '\n');
process.stderr.write(`Converted ${catalog.length} items\n`);
