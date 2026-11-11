import { useState } from "react";
import { Button, Badge, Select, StatCard, SectionTitle, DataTable } from "../ui";
import { money, sum, toneForStatus } from "../../lib/utils";
import { generateQuotePdf } from "../../cotizador/Cotizador";

// Ciclo de vida de un presupuesto. El cotizador crea en Borrador.
export const QUOTE_STATUSES = ["Borrador", "Enviado", "En revision", "Aprobado", "Rechazado"];

export function Presupuestos({ quotes, setQuotes, persistUpdate, openCotizador, removeRecord, currentProfile }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const readOnlyClient = currentProfile?.role === "cliente";
  const ownQuotes = readOnlyClient && currentProfile?.companyName ? quotes.filter((quote) => quote.client === currentProfile.companyName) : quotes;
  const visibleQuotes = ownQuotes
    .filter((quote) => !statusFilter || quote.status === statusFilter)
    .filter((quote) => `${quote.number} ${quote.client} ${quote.service || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => String(b.number).localeCompare(String(a.number)));
  const approved = ownQuotes.filter((quote) => quote.status === "Aprobado");
  const awaiting = ownQuotes.filter((quote) => ["Enviado", "En revision"].includes(quote.status));

  function setStatus(number, status) {
    const current = quotes.find((item) => item.number === number);
    const updated = { ...current, status };
    setQuotes((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("quotes", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle
        title="Presupuestos"
        subtitle={readOnlyClient ? `Cotizaciones de ${currentProfile?.companyName || "tu empresa"}` : "Cotizaciones cargadas, estados y vencimientos"}
        action={readOnlyClient ? null : "Nuevo presupuesto"}
        onAction={readOnlyClient ? null : () => openCotizador()}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Esperando respuesta" value={awaiting.length} subtitle={money(sum(awaiting, "total"))} tone="amber" />
        <StatCard title="Aprobados" value={approved.length} subtitle={money(sum(approved, "total"))} tone="green" />
        <StatCard title="Total cotizado" value={money(sum(ownQuotes, "total"))} subtitle={`${ownQuotes.length} presupuestos`} tone="blue" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por numero, cliente o servicio"
          className="min-h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-[13px] font-medium text-[var(--text)] outline-none focus:border-[var(--brand)]"
        />
        <div className="sm:w-48">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {QUOTE_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </Select>
        </div>
      </div>
      <DataTable
        headers={["Numero", "Cliente", "Servicio", "Items", "Total", "Estado", "Valido hasta", "Acciones"]}
        rows={visibleQuotes.map((quote) => [
          quote.number,
          quote.client,
          quote.service || quote.jobTitle || "-",
          Array.isArray(quote.lineItems) && quote.lineItems.length ? quote.lineItems.length : 1,
          <strong>{money(quote.total)}</strong>,
          readOnlyClient ? (
            <Badge tone={toneForStatus(quote.status)}>{quote.status}</Badge>
          ) : (
            <Select value={quote.status} onChange={(event) => setStatus(quote.number, event.target.value)}>
              {QUOTE_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </Select>
          ),
          quote.validUntil || "-",
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => generateQuotePdf(quote)}>PDF</Button>
            {!readOnlyClient && <Button variant="ghost" onClick={() => openCotizador(quote)}>Editar</Button>}
            {!readOnlyClient && <Button variant="danger" onClick={() => removeRecord("quotes", quote.number)}>Borrar</Button>}
          </div>,
        ])}
        empty={statusFilter || query ? "Ningun presupuesto coincide con el filtro" : "Todavia no hay presupuestos. Crea el primero desde el cotizador."}
      />
    </div>
  );
}
