// Generates src/lib/pricingData.js from catalogo_carlosisla.csv
import { readFileSync, writeFileSync } from 'fs';
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

function esc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
}

const csvPath = join(__dirname, '..', 'catalogo_carlosisla.csv');
const content = readFileSync(csvPath, 'utf-8');
const rows = parseCSV(content);

const seen = new Set();
const entries = [];

for (const row of rows) {
  let id = slugToId(row.url || '');
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
  const spec = variante && variante !== 'único' ? `Variante: ${variante}` : '';

  const nombre = (row.nombre || '').trim();
  const name = nombre || id.replace(/^ci-/, '').replace(/-/g, ' ');
  const stockRaw = row.stock !== '' ? (parseInt(row.stock, 10) || null) : null;
  const unit = inferUnit(row.categoria, row.nombre);
  const category = (row.categoria || '').trim();
  const sku = (row.sku || '').trim();
  const brand = (row.marca || '').trim();

  entries.push(
    `  { id: "${id}", source: "Carlos Isla", category: "${esc(category)}", name: "${esc(name)}", spec: "${esc(spec)}", unit: "${unit}", sku: "${esc(sku)}", brand: "${esc(brand)}", stock: ${stockRaw === null ? 'null' : stockRaw}, listPrice: ${listPrice}, transferPrice: ${transferPrice}, basePrice: ${basePrice}, pricePerMeter: null, provider: "Carlos Isla", date: "2026-06-04" }`
  );
}

const catalogBlock = `export const materialPriceCatalog = [\n${entries.join(',\n')},\n];`;

const newFile = `export const quotePricingSources = [
  {
    name: "Carlos Isla",
    date: "2026-06-04",
    type: "web-catalog",
    url: "https://carlosisla.com.ar",
    note: "Catálogo completo Carlos Isla Neuquén. Confirmar stock, medida y condiciones antes de emitir oferta formal.",
  },
];

export const quoteParameters = {
  iva: 0.21,
  iibb: 0.035,
  targetProfit: 0.25,
  adminOverhead: 0.1,
  technicalContingency: 0.05,
  energyPerKwh: 150,
  travelPerKm: 700,
  roundTo: 1000,
  offerValidityDays: 7,
};

export const laborRates = [
  { id: "soldador", trade: "Soldador", agreement: "UOM CCT 260/75", category: "Oficial Multiple / Oficial Superior CNC", baseHour: 6112.95, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 16975.62 },
  { id: "soldador-especializado", trade: "Soldador especializado", agreement: "UOM CCT 260/75", category: "Oficial Multiple Superior CNC", baseHour: 6541.35, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 18127.8 },
  { id: "electricista-taller", trade: "Electricista taller", agreement: "UOM CCT 260/75", category: "Oficial", baseHour: 5675.08, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 15797.98 },
  { id: "electricista-obra", trade: "Electricista obra", agreement: "UOCRA CCT 76/75", category: "Oficial - Lineas e Instalacion", baseHour: 5113, monthlyBonus: 134100, monthlyHours: 176, loadFactor: 0.65, quoteHour: 15800.63 },
  { id: "electricista-obra-especializado", trade: "Electricista obra especializado", agreement: "UOCRA CCT 76/75", category: "Oficial Especializado - Lineas e Instalacion", baseHour: 6279, monthlyBonus: 147000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 19133.72 },
  { id: "ayudante", trade: "Ayudante", agreement: "UOM CCT 260/75", category: "Medio Oficial", baseHour: 4796.27, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 13434.41 },
];

${catalogBlock}

export function roundUp(value, step = quoteParameters.roundTo) {
  const numeric = Number(value || 0);
  const roundStep = Number(step || 1);
  return Math.ceil(numeric / roundStep) * roundStep;
}

export function calculateQuotePricing({ materialLines = [], laborLines = [], directExtras = [], parameters = quoteParameters }) {
  const materials = materialLines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitCost || 0), 0);
  const labor = laborLines.reduce((total, line) => total + Number(line.hours || 0) * Number(line.hourCost || 0), 0);
  const extras = directExtras.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitCost || 0), 0);
  const directSubtotal = materials + labor + extras;
  const overhead = directSubtotal * Number(parameters.adminOverhead || 0);
  const contingency = directSubtotal * Number(parameters.technicalContingency || 0);
  const costBeforeProfit = directSubtotal + overhead + contingency;
  const profit = costBeforeProfit * Number(parameters.targetProfit || 0);
  const subtotalBeforeTax = costBeforeProfit + profit;
  const iibb = subtotalBeforeTax * Number(parameters.iibb || 0);
  const taxableSubtotal = subtotalBeforeTax + iibb;
  const iva = taxableSubtotal * Number(parameters.iva || 0);
  const total = taxableSubtotal + iva;

  return {
    materials,
    labor,
    extras,
    directSubtotal,
    overhead,
    contingency,
    costBeforeProfit,
    profit,
    subtotalBeforeTax,
    iibb,
    taxableSubtotal,
    iva,
    total,
    roundedTotal: roundUp(total, parameters.roundTo),
    marginOnSaleWithoutIva: taxableSubtotal ? profit / taxableSubtotal : 0,
  };
}
`;

const outPath = join(__dirname, '..', 'src', 'lib', 'pricingData.js');
writeFileSync(outPath, newFile, 'utf-8');
console.log(`Written ${entries.length} catalog items to ${outPath}`);
