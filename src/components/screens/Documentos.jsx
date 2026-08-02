import { useState } from "react";
import { Button, Badge, Panel, Field, TextInput, Select, StatCard, SectionTitle, DataTable } from "../ui";

export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function Documentos({ data, uploadDocument, removeRecord }) {
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
