import { Button, Badge, StatCard, SectionTitle, DataTable } from "../ui";
import { money, sum, generateQuotePdf, toneForStatus } from "../../lib/utils";

export function Presupuestos({ quotes, setQuotes, persistUpdate, openEditor, removeRecord, setActive, currentProfile }) {
  const readOnlyClient = currentProfile?.role === "cliente";
  const visibleQuotes = readOnlyClient && currentProfile?.companyName ? quotes.filter((quote) => quote.client === currentProfile.companyName) : quotes;
  const pendingQuotes = visibleQuotes.filter((quote) => quote.status !== "Aprobado");
  const approvedQuotes = visibleQuotes.filter((quote) => quote.status === "Aprobado");
  const quoteTotal = sum(visibleQuotes, "total");

  function approveQuote(number) {
    const current = quotes.find((item) => item.number === number);
    const updated = { ...current, status: "Aprobado" };
    setQuotes((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("quotes", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Presupuestos" subtitle={readOnlyClient ? `Cotizaciones visibles para ${currentProfile?.companyName || "tu empresa"}` : "Cotizaciones cargadas, estados y vencimientos"} action={readOnlyClient ? null : "Abrir cotizador"} onAction={readOnlyClient ? null : () => setActive("cotizador")} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Cotizaciones" value={visibleQuotes.length} subtitle={`${pendingQuotes.length} pendientes`} tone="blue" />
        <StatCard title="Aprobadas" value={approvedQuotes.length} subtitle="Presupuestos ganados" tone="green" />
        <StatCard title="Total cotizado" value={money(quoteTotal)} subtitle="Importe bruto cargado" tone="amber" />
      </div>
      <DataTable
        headers={["Numero", "Cliente", "Servicio", "Items", "Subtotal", "IVA", "Total", "Estado", "Valido hasta", "Acciones"]}
        rows={visibleQuotes.map((quote) => [
          quote.number,
          quote.client,
          quote.service,
          Array.isArray(quote.lineItems) && quote.lineItems.length ? quote.lineItems.length : 1,
          money(quote.subtotal),
          money(quote.tax),
          <strong>{money(quote.total)}</strong>,
          <Badge tone={toneForStatus(quote.status)}>{quote.status}</Badge>,
          quote.validUntil,
          readOnlyClient ? <Button variant="ghost" onClick={() => generateQuotePdf(quote)}>PDF</Button> : <div className="flex gap-2">
            <Button variant="ghost" onClick={() => generateQuotePdf(quote)}>PDF</Button>
            <Button variant="ghost" onClick={() => approveQuote(quote.number)}>Aprobar</Button>
            <Button variant="ghost" onClick={() => openEditor("presupuestos", quote)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("quotes", quote.number)}>Borrar</Button>
          </div>,
        ])}
        empty="No hay presupuestos para mostrar"
      />
    </div>
  );
}
