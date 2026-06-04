/**
 * Re-fetches product pages for rows where the scraped name doesn't match
 * the URL slug, then overwrites catalogo_carlosisla.csv with corrected names.
 *
 * Usage:
 *   node scripts/fix-catalog-names.mjs
 *   node scripts/fix-catalog-names.mjs --dry-run   (show what would change, no writes)
 *   node scripts/fix-catalog-names.mjs --limit 20  (process only first N mismatches)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'catalogo_carlosisla.csv');
const DELAY_MS = 400;   // between requests — be polite to the server
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

// ── CSV helpers ────────────────────────────────────────────────────────────────

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

function quoteField(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function serializeRow(values) {
  return values.map(quoteField).join(',');
}

// ── Mismatch detection (same heuristic as the analysis) ───────────────────────

function isMismatch(url, nombre) {
  if (!nombre) return false;
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1] || '';
    // Strip the 5-char random suffix Tiendanube appends (e.g. -hgr43)
    const cleanSlug = slug.replace(/-[a-z0-9]{4,6}$/, '');
    const slugWords = cleanSlug.split('-').filter(w => w.length > 3 && !/^\d+$/.test(w));
    if (slugWords.length === 0) return false;
    const nombreLower = nombre.toLowerCase();
    return slugWords.every(w => !nombreLower.includes(w));
  } catch {
    return false;
  }
}

// ── HTML name extraction ───────────────────────────────────────────────────────

function extractNameFromHtml(html) {
  // 1. JSON-LD ProductGroup name (most reliable on Tiendanube)
  const ldMatch = html.match(/"@type"\s*:\s*"ProductGroup"[\s\S]*?"name"\s*:\s*"([^"]+)"/);
  if (ldMatch) return decodeHtmlEntities(ldMatch[1]);

  // 2. JSON-LD Product name (single-variant pages)
  const ldProductMatch = html.match(/"@type"\s*:\s*"Product"[\s\S]*?"name"\s*:\s*"([^"]+)"/);
  if (ldProductMatch) return decodeHtmlEntities(ldProductMatch[1]);

  // 3. og:title meta tag
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (ogMatch) return decodeHtmlEntities(ogMatch[1]);

  // 4. First <h1> tag
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) return decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, '').trim());

  return null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

async function fetchName(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; catalog-fixer/1.0)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return extractNameFromHtml(html);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ───────────────────────────────────────────────────────────────────────

const raw = readFileSync(CSV_PATH, 'utf-8');
// Preserve original BOM if present
const BOM = raw.charCodeAt(0) === 0xFEFF ? '﻿' : '';
const content = BOM ? raw.slice(1) : raw;

const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
const headerLine = lines[0];
const headers = parseCSVLine(headerLine).map(h => h.trim());
const nombreIdx = headers.indexOf('nombre');
const urlIdx = headers.indexOf('url');

if (nombreIdx === -1 || urlIdx === -1) {
  console.error('CSV must have "url" and "nombre" columns');
  process.exit(1);
}

// Collect rows to fix
const rowsToFix = [];
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const cols = parseCSVLine(lines[i]);
  const url = (cols[urlIdx] || '').trim();
  const nombre = (cols[nombreIdx] || '').trim();
  if (url && isMismatch(url, nombre)) {
    rowsToFix.push({ lineIdx: i, url, oldName: nombre });
  }
}

console.log(`Found ${rowsToFix.length} mismatched rows.`);
if (DRY_RUN) console.log('[DRY RUN] No files will be written.\n');

const toProcess = rowsToFix.slice(0, LIMIT);
let fixed = 0, failed = 0;

// Work on a mutable copy of lines
const outputLines = [...lines];

for (let i = 0; i < toProcess.length; i++) {
  const { lineIdx, url, oldName } = toProcess[i];
  process.stdout.write(`[${i + 1}/${toProcess.length}] ${url.replace('https://carlosisla.com.ar', '')} ... `);

  try {
    const newName = await fetchName(url);
    if (!newName) {
      console.log('SKIP (name not found in HTML)');
      failed++;
    } else if (newName === oldName) {
      console.log('SAME (no change needed)');
    } else {
      console.log(`OK: "${oldName}" → "${newName}"`);
      if (!DRY_RUN) {
        const cols = parseCSVLine(outputLines[lineIdx]);
        cols[nombreIdx] = newName;
        outputLines[lineIdx] = serializeRow(cols);
      }
      fixed++;
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    failed++;
  }

  if (i < toProcess.length - 1) await sleep(DELAY_MS);
}

console.log(`\nDone. Fixed: ${fixed}  Failed/skipped: ${failed}`);

if (!DRY_RUN && fixed > 0) {
  const output = BOM + outputLines.join('\n');
  writeFileSync(CSV_PATH, output, 'utf-8');
  console.log(`CSV updated: ${CSV_PATH}`);
} else if (fixed === 0) {
  console.log('Nothing written (no changes).');
}
