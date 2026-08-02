import { Panel, StatCard, SectionTitle } from "../ui";
import { money, pct, sum, weightedPipeline } from "../../lib/utils";

export function Reportes({ data }) {
  const pipeline = sum(data.opportunities, "amount");
  const won = sum(data.opportunities.filter((item) => item.stage === "Ganado"), "amount");
  const quoteTotal = sum(data.quotes, "total");
  const purchasing = sum(data.purchases, "total");
  const stockValue = data.inventory.reduce((total, item) => total + item.stock * item.cost, 0);
  const indicators = [
    { label: "Conversion comercial", value: pct((won / pipeline) * 100), tone: "green" },
    { label: "Presupuestos emitidos", value: money(quoteTotal), tone: "blue" },
    { label: "Compras comprometidas", value: money(purchasing), tone: "amber" },
    { label: "Inventario valorizado", value: money(stockValue), tone: "green" },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Reportes gerenciales" subtitle="Indicadores integrados de ventas, operaciones, compras y caja" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {indicators.map((item) => <StatCard key={item.label} title={item.label} value={item.value} subtitle="Calculado sobre datos demo" tone={item.tone} />)}
      </div>
      <Panel className="p-4">
        <SectionTitle title="Resumen ejecutivo" subtitle="Lectura rapida para reunion semanal" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">El pipeline total es de <strong>{money(pipeline)}</strong>, con forecast ponderado de <strong>{money(weightedPipeline(data.opportunities))}</strong>.</p>
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">Hay <strong>{data.inventory.filter((item) => item.stock <= item.min).length}</strong> materiales bajo minimo y <strong>{data.workOrders.filter((item) => item.status === "En ejecucion").length}</strong> ordenes en ejecucion.</p>
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">Las cuentas por cobrar abiertas suman <strong>{money(sum(data.invoices.filter((item) => item.status !== "Cobrada"), "total"))}</strong>.</p>
          <p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">La dotacion registra <strong>{sum(data.employees, "hours")}</strong> horas mensuales informadas.</p>
        </div>
      </Panel>
    </div>
  );
}
