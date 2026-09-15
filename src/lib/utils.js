import * as XLSX from "xlsx";

export function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function pct(value) {
  return `${Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max);
}

export function sum(list, field) {
  return list.reduce((total, item) => total + Number(item[field] || 0), 0);
}

export function quoteLineTotal(line) {
  if (line.type === "title") return 0;
  return Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

export function catalogPrice(item) {
  return Number(item?.basePrice || item?.transferPrice || item?.listPrice || item?.pricePerMeter || 0);
}

export function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function openQuotePdfWindow() {
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

export function generateQuotePdf(quote, targetWindow = null) {
  if (!quote?.number) return;

  const allLines = Array.isArray(quote.lineItems) && quote.lineItems.length
    ? quote.lineItems
    : [{ detail: quote.service, quantity: 1, unitPrice: quote.total, total: quote.total }];
  const client = quote.clientDetails || {};
  const logoUrl = `${window.location.origin}/brand/logo_principal_horizontal.png`;

  // Agrupar renglones en secciones separadas por filas tipo "title"
  const sections = [];
  let cur = { title: null, items: [] };
  for (const line of allLines) {
    if (line.type === "title") {
      sections.push(cur);
      cur = { title: line.detail || "", items: [] };
    } else {
      cur.items.push(line);
    }
  }
  sections.push(cur);
  const validSections = sections.filter((s) => s.title !== null || s.items.length > 0);
  const hasSections = validSections.some((s) => s.title !== null);

  // Paleta de colores por seccion
  const palette = [
    { hd: "#1e40af", lt: "#EFF6FF", br: "#93C5FD" },
    { hd: "#92400e", lt: "#FFFBEB", br: "#FCD34D" },
    { hd: "#14532d", lt: "#F0FDF4", br: "#86EFAC" },
    { hd: "#581c87", lt: "#FAF5FF", br: "#D8B4FE" },
    { hd: "#134e4a", lt: "#F0FDFA", br: "#5EEAD4" },
  ];

  let ci = 0;
  let tableRows = "";

  for (const section of validSections) {
    const col = palette[ci % palette.length];
    if (section.title !== null) ci++;

    // Encabezado de seccion
    if (section.title !== null) {
      tableRows += `
        <tr>
          <td colspan="4" style="background:${col.hd};color:#fff;font-weight:700;font-size:12px;padding:10px 14px;letter-spacing:0.07em;text-transform:uppercase;border:none;">${htmlEscape(section.title)}</td>
        </tr>`;
    }

    // Renglones de la seccion
    let secTotal = 0;
    for (const line of section.items) {
      const lt = Number(line.total ?? quoteLineTotal(line));
      secTotal += lt;
      const rowBg = section.title !== null ? `background:${col.lt};` : "";
      const rowBd = section.title !== null ? `border-bottom:1px solid ${col.br};` : "border-bottom:1px solid #e4e4e7;";

      if (line.type === "labor") {
        const m = line.meta || {};
        const typeLabel = [m.category, m.agreement].filter(Boolean).join(" · ");
        const qty = Number(line.quantity || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
        tableRows += `
          <tr style="${rowBg}">
            <td style="padding:10px 14px;${rowBd}">
              <div style="font-weight:600;color:#18181b;">${htmlEscape(line.detail)}</div>
              ${typeLabel ? `<div style="font-size:11px;color:#71717a;margin-top:3px;">${htmlEscape(typeLabel)}</div>` : ""}
            </td>
            <td class="num" style="padding:10px 14px;${rowBd}color:#52525b;">${qty} h</td>
            <td class="num" style="padding:10px 14px;${rowBd}color:#52525b;">${money(line.unitPrice)}/h</td>
            <td class="num strong" style="padding:10px 14px;${rowBd}">${money(lt)}</td>
          </tr>`;
      } else {
        tableRows += `
          <tr style="${rowBg}">
            <td style="padding:10px 14px;${rowBd}">${htmlEscape(line.detail)}</td>
            <td class="num" style="padding:10px 14px;${rowBd}">${Number(line.quantity || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</td>
            <td class="num" style="padding:10px 14px;${rowBd}">${money(line.unitPrice)}</td>
            <td class="num strong" style="padding:10px 14px;${rowBd}">${money(lt)}</td>
          </tr>`;
      }
    }

    // Subtotal de seccion (solo cuando la sección tiene título explícito)
    if (section.items.length > 0 && hasSections && section.title !== null) {
      const label = section.title ? `Subtotal — ${section.title}` : "Subtotal";
      tableRows += `
        <tr>
          <td colspan="3" style="padding:8px 14px;background:${col.lt};border-top:2px solid ${col.br};text-align:right;font-size:12px;font-weight:700;color:${col.hd};">${htmlEscape(label)}</td>
          <td class="num" style="padding:8px 14px;background:${col.lt};border-top:2px solid ${col.br};font-weight:700;color:${col.hd};white-space:nowrap;">${money(secTotal)}</td>
        </tr>`;
    }
  }

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
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 24px 0 20px; }
          .box { border: 1px solid #e4e4e7; padding: 14px; border-radius: 6px; }
          .box h2 { margin: 0 0 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a; font-weight: 700; }
          .box p { margin: 5px 0; font-size: 13px; }
          .box span { display: inline-block; width: 80px; color: #71717a; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; }
          thead tr { background: #18181b; }
          th { color: white; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { vertical-align: top; }
          .num { text-align: right; white-space: nowrap; }
          .strong { font-weight: 700; }
          .totals { width: 340px; margin-left: auto; margin-top: 24px; font-size: 13px; border: 1px solid #e4e4e7; border-radius: 6px; overflow: hidden; }
          .totals div { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #e4e4e7; }
          .totals .grand { font-size: 18px; font-weight: 700; color: #ff7900; border-bottom: 0; padding: 12px 14px; background: #fff8f3; }
          footer { margin-top: 36px; color: #71717a; font-size: 11px; line-height: 1.6; border-top: 1px solid #e4e4e7; padding-top: 14px; }
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
          <section class="info-grid">
            <div class="box">
              <h2>Cliente</h2>
              ${clientRows || `<p><span>Empresa</span>${htmlEscape(quote.client)}</p>`}
            </div>
            <div class="box">
              <h2>Obra / Trabajo</h2>
              <p><span>Descripcion</span>${htmlEscape(quote.service || "-")}</p>
              <p><span>Estado</span>${htmlEscape(quote.status || "Borrador")}</p>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Descripcion</th>
                <th class="num">Cantidad</th>
                <th class="num">Precio unitario</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <section class="totals">
            <div><span>Subtotal</span><strong>${money(quote.subtotal)}</strong></div>
            <div><span>IVA (21%)</span><strong>${money(quote.tax)}</strong></div>
            <div class="grand"><span>Total</span><strong>${money(quote.total)}</strong></div>
          </section>
          <footer>
            Presupuesto emitido por Bizon Metalurgica. Los precios estan expresados sin IVA salvo indicacion contraria y quedan sujetos a confirmacion de disponibilidad, alcance tecnico y condiciones comerciales finales.
          </footer>
        </main>
        <script>
          window.addEventListener("load", () => { setTimeout(() => window.print(), 250); });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function withTimeout(promise, milliseconds, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} demoro demasiado.`)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function weightedPipeline(list) {
  return list.reduce((total, item) => total + (item.amount * item.probability) / 100, 0);
}

export function nextLocalNumber(items, prefix, padding = 4, field = "number") {
  const max = items.reduce((highest, item) => {
    const value = String(item[field] || "");
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(padding, "0")}`;
}

export function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeKey(value) {
  return normalizeText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function splitLeadField(value) {
  return normalizeText(value)
    .split(/;|\n|\r|\|/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function leadValue(row, labels) {
  const entries = Object.entries(row || {});
  const wanted = labels.map(normalizeKey);
  const match = entries.find(([key]) => wanted.includes(normalizeKey(key)));
  return normalizeText(match?.[1]);
}

export function worksheetToRows(worksheet) {
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

export function probabilityForPriority(priority, score) {
  const text = normalizeKey(priority);
  if (text.startsWith("a")) return 35;
  if (text.startsWith("b")) return 25;
  if (text.startsWith("c")) return 15;
  return clamp(Math.round(Number(score || 0) / 3), 10, 40);
}

export function addDaysIso(days) {
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0;
  const date = new Date();
  date.setDate(date.getDate() + safeDays);
  return date.toISOString().slice(0, 10);
}

export function isValidDateValue(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function formatDate(value, fallback = "-") {
  if (!isValidDateValue(value)) return fallback;
  return new Date(value).toLocaleDateString("es-AR");
}

export function formatDateTime(value, fallback = "-") {
  if (!isValidDateValue(value)) return fallback;
  return new Date(value).toLocaleString("es-AR");
}

export function buildLeadContacts(row) {
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

export function normalizeLeadRow(row) {
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

export function toneForStatus(status) {
  if (["Activo", "Ganado", "Cobrada", "Recibida", "Disponible"].includes(status)) return "green";
  if (["Pendiente", "Por vencer", "Programada", "Autorizacion", "Contactado"].includes(status)) return "amber";
  if (["Borrador", "Prospecto", "Nuevo prospecto"].includes(status)) return "blue";
  if (["Vencida", "Bloqueado", "PERDIDO"].includes(status)) return "red";
  return "zinc";
}

function isoDay(value) {
  return String(value).slice(0, 10);
}

export function dueWithinDays(list, limitIso, field = "due") {
  return list.filter((item) => isValidDateValue(item[field]) && isoDay(item[field]) <= limitIso);
}

export function overdueWorkOrders(list, todayIso) {
  return list.filter((order) => isValidDateValue(order.end) && isoDay(order.end) < todayIso && Number(order.progress || 0) < 100);
}

export function overdueReceivables(list, todayIso) {
  return list.filter((invoice) => invoice.status !== "Cobrada" && isValidDateValue(invoice.due) && isoDay(invoice.due) < todayIso);
}

export function quotesByStatus(list) {
  return list.reduce((counts, quote) => {
    counts[quote.status] = (counts[quote.status] || 0) + 1;
    return counts;
  }, {});
}
