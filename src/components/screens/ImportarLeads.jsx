import * as XLSX from "xlsx";
import { useState, useMemo } from "react";
import { Button, Badge, Panel, Field, Select, StatCard, SectionTitle, DataTable } from "../ui";
import { clamp, normalizeKey, worksheetToRows, normalizeLeadRow } from "../../lib/utils";

export function ImportarLeads({ companies, opportunities, onImportLeads }) {
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
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="block w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
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
        {message && <p className="mt-3 text-sm font-semibold text-[var(--brand-hover)]">{message}</p>}
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
