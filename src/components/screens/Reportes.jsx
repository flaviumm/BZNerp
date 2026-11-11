import { Panel, StatCard, SectionTitle, CleanBarList } from "../ui";
import { money, pct, sum, weightedPipeline, addDaysIso, overdueWorkOrders } from "../../lib/utils";
import { QUOTE_STATUSES } from "./Presupuestos";

// Indicadores calculados sobre clientes, oportunidades, presupuestos, OT y tareas reales.
export function Reportes({ data }) {
  const today = addDaysIso(0);
  const { companies, opportunities, quotes, workOrders, tasks } = data;

  const won = opportunities.filter((item) => item.stage === "Ganado");
  const lost = opportunities.filter((item) => item.stage.toUpperCase() === "PERDIDO");
  const closed = won.length + lost.length;
  const openPipeline = opportunities.filter((item) => item.stage !== "Ganado" && String(item.stage).toUpperCase() !== "PERDIDO");

  const approvedQuotes = quotes.filter((item) => item.status === "Aprobado");
  const decidedQuotes = quotes.filter((item) => ["Aprobado", "Rechazado"].includes(item.status));
  const quoteRows = QUOTE_STATUSES.map((status) => {
    const list = quotes.filter((item) => item.status === status);
    return { status, count: list.length, total: sum(list, "total") };
  });

  const executing = workOrders.filter((item) => item.status === "En ejecucion");
  const lateOrders = overdueWorkOrders(executing, today);
  const overdueTasks = tasks.filter((task) => task.due && String(task.due).slice(0, 10) < today);

  const companiesByStatus = ["Activo", "Negociacion", "Contactado", "Prospecto", "Inactivo"].map((status) => ({
    label: status,
    value: companies.filter((item) => item.status === status).length,
  }));
  const topCompanies = [...companies]
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
    .slice(0, 5)
    .map((item) => ({ label: item.name, value: Number(item.value || 0), caption: `${item.status} - ${item.city || ""}` }));

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Reportes gerenciales" subtitle="Ventas, presupuestos y operacion con datos reales" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pipeline abierto" value={money(sum(openPipeline, "amount"))} subtitle={`forecast ponderado ${money(weightedPipeline(openPipeline))}`} tone="blue" />
        <StatCard title="Conversion comercial" value={closed ? pct((won.length / closed) * 100) : "-"} subtitle={`${won.length} ganadas de ${closed} cerradas`} tone="green" />
        <StatCard title="Presupuestos aprobados" value={money(sum(approvedQuotes, "total"))} subtitle={decidedQuotes.length ? `${pct((approvedQuotes.length / decidedQuotes.length) * 100)} de los decididos` : "sin decisiones todavia"} tone="green" />
        <StatCard title="OT atrasadas" value={lateOrders.length} subtitle={`${executing.length} en ejecucion`} tone={lateOrders.length ? "red" : "amber"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title="Presupuestos por estado" subtitle="Cantidad e importe" />
          <div className="mt-4 grid gap-2 text-sm">
            {quoteRows.map((row) => (
              <p key={row.status} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-muted)]">
                <span>{row.status} <strong className="ml-2 text-[var(--text)]">{row.count}</strong></span>
                <strong className="text-[var(--text)]">{money(row.total)}</strong>
              </p>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Clientes por estado" subtitle={`${companies.length} empresas cargadas`} />
          <div className="mt-5">
            <CleanBarList items={companiesByStatus} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5">
          <SectionTitle title="Top clientes por valor potencial" subtitle="Segun la ficha comercial" />
          <div className="mt-5">
            {topCompanies.length ? <CleanBarList items={topCompanies} valueFormatter={money} /> : <p className="text-sm text-[var(--text-muted)]">Sin clientes con valor cargado.</p>}
          </div>
        </Panel>
        <Panel className="p-5">
          <SectionTitle title="Operacion" subtitle="Ordenes de trabajo y tareas" />
          <div className="mt-4 grid gap-3 text-sm">
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">OT en ejecucion <strong className="text-[var(--text)]">{executing.length}</strong></p>
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">OT atrasadas <strong className={lateOrders.length ? "text-[var(--danger)]" : "text-[var(--text)]"}>{lateOrders.length}</strong></p>
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">OT terminadas <strong className="text-[var(--text)]">{workOrders.filter((item) => item.status === "Terminada").length}</strong></p>
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">Tareas abiertas <strong className="text-[var(--text)]">{tasks.length}</strong></p>
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">Tareas vencidas <strong className={overdueTasks.length ? "text-[var(--danger)]" : "text-[var(--text)]"}>{overdueTasks.length}</strong></p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
