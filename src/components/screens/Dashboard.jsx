import { Button, Badge, Panel, StatCard, SectionTitle, Progress, CleanBarList, DashboardLineChart, DashboardRadialChart, DashboardStackChart } from "../ui";
import { money, sum, weightedPipeline } from "../../lib/utils";

export function Dashboard({ data, setActive }) {
  const pipelineTotal = sum(data.opportunities, "amount");
  const winForecast = weightedPipeline(data.opportunities);
  const receivables = data.invoices.filter((item) => item.status !== "Cobrada");
  const stockAlerts = data.inventory.filter((item) => item.stock <= item.min);
  const avgMargin = data.workOrders.reduce((total, order) => total + order.margin, 0) / data.workOrders.length;
  const commercialItems = data.opportunities.slice(0, 5).map((item) => ({
    label: item.company,
    value: item.amount,
    caption: `${item.probability}% probabilidad - ${item.stage}`,
  }));
  const operationsItems = data.workOrders.map((order) => ({ label: order.number, value: order.progress, caption: `${order.client} - ${order.team}` }));
  const controlItems = [
    { label: "Tareas", value: data.tasks.length, caption: `${data.tasks.filter((item) => item.priority === "Alta").length} prioridad alta` },
    { label: "Documentos", value: data.documents.length, caption: "Adjuntos registrados" },
    { label: "Auditoria", value: data.auditLog.length, caption: "Eventos recientes" },
  ];
  const avgProgress = data.workOrders.length ? data.workOrders.reduce((total, order) => total + Number(order.progress || 0), 0) / data.workOrders.length : 0;
  const controlChartItems = [
    { label: "Tareas", value: data.tasks.length },
    { label: "Documentos", value: data.documents.length },
    { label: "Auditoria", value: data.auditLog.length },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Panel className="p-7 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Vista general</p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-zinc-950">Operacion diaria Bizon</h2>
            <p className="mt-2 max-w-2xl text-[15px] font-semibold text-zinc-500">Resumen ejecutivo para ubicar ventas, produccion y control sin ruido visual.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setActive("reportes")}>Ver reportes</Button>
            <Button onClick={() => setActive("presupuestos")}>Nuevo presupuesto</Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pipeline abierto" value={money(pipelineTotal)} subtitle={`${data.opportunities.length} oportunidades`} tone="green" chart={data.opportunities.map((item) => item.amount)} />
        <StatCard title="Presupuestos" value={data.quotes.filter((item) => item.status !== "Aprobado").length} subtitle="Pendientes o en revision" tone="blue" chart={data.quotes.map((item) => item.total)} />
        <StatCard title="OT en ejecucion" value={data.workOrders.filter((item) => item.status === "En ejecucion").length} subtitle={`${data.workOrders.length} ordenes totales`} tone="amber" chart={data.workOrders.map((item) => item.progress)} />
        <StatCard title="Cuentas por cobrar" value={money(sum(receivables, "total"))} subtitle={`${receivables.length} facturas pendientes`} tone="red" chart={receivables.map((item) => item.total)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5">
          <SectionTitle title="Gestion comercial" subtitle="Pipeline y presupuestos" action="Abrir" onAction={() => setActive("crm")} />
          <div className="mt-5">
            <DashboardLineChart values={commercialItems.map((item) => item.value)} labels={commercialItems.map((item) => item.label)} />
          </div>
          <div className="mt-5">
            <CleanBarList items={commercialItems} valueFormatter={money} />
          </div>
          <div className="mt-5 grid gap-3 rounded-lg border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm">
            <p className="flex justify-between gap-3 text-zinc-600">Pipeline <strong className="text-zinc-950">{money(pipelineTotal)}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Forecast <strong className="text-zinc-950">{money(winForecast)}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Presupuestos <strong className="text-zinc-950">{data.quotes.length}</strong></p>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Operacion" subtitle="OT, inventario y compras" action="Abrir" onAction={() => setActive("ot")} />
          <div className="mt-5">
            <DashboardRadialChart
              value={avgProgress}
              label="avance OT"
              details={[
                { label: "OT activas", value: data.workOrders.length, progress: Math.min(data.workOrders.length * 20, 100) },
                { label: "Stock bajo", value: stockAlerts.length, progress: Math.min(stockAlerts.length * 25, 100) },
                { label: "Compras abiertas", value: data.purchases.filter((item) => item.status !== "Recibida").length, progress: Math.min(data.purchases.filter((item) => item.status !== "Recibida").length * 35, 100) },
              ]}
            />
          </div>
          <div className="mt-5">
            <CleanBarList items={operationsItems} valueFormatter={(value) => `${value}%`} />
          </div>
          <div className="mt-5 grid gap-3 rounded-lg border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm">
            <p className="flex justify-between gap-3 text-zinc-600">OT activas <strong className="text-zinc-950">{data.workOrders.length}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Stock bajo minimo <strong className={stockAlerts.length ? "text-[#b42318]" : "text-zinc-950"}>{stockAlerts.length}</strong></p>
            <p className="flex justify-between gap-3 text-zinc-600">Compras abiertas <strong className="text-zinc-950">{data.purchases.filter((item) => item.status !== "Recibida").length}</strong></p>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Control" subtitle="Tareas, documentos y auditoria" action="Abrir" onAction={() => setActive("tareas")} />
          <div className="mt-5">
            <DashboardStackChart items={controlChartItems} />
          </div>
          <div className="mt-5">
            <CleanBarList items={controlItems} />
          </div>
          <div className="mt-5 grid gap-3">
            {data.tasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-lg border border-[#ecece6] bg-[#fbfbf8] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#050505]">{task.text}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">{task.owner} - {task.due}</p>
                  </div>
                  <Badge tone={task.priority === "Alta" ? "red" : "amber"}>{task.priority}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-5 shadow-none">
        <SectionTitle title="Alertas de stock" subtitle="Material bajo minimo" action="Ver inventario" onAction={() => setActive("inventario")} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stockAlerts.map((item) => (
            <div key={item.sku} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#050505]">{item.name}</span>
                <span className="font-semibold text-[#b42318]">{item.stock}/{item.min}</span>
              </div>
              <Progress value={(item.stock / item.min) * 100} tone="red" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
