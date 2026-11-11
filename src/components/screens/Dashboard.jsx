import { Button, Badge, Panel, StatCard, SectionTitle, CleanBarList, DashboardLineChart, DashboardRadialChart, DashboardStackChart } from "../ui";
import { money, sum, weightedPipeline, addDaysIso, dueWithinDays, overdueWorkOrders, quotesByStatus } from "../../lib/utils";

export function Dashboard({ data, setActive, organization, openCotizador }) {
  const today = addDaysIso(0);
  const openOpportunities = data.opportunities.filter((item) => !["Ganado", "Perdido"].includes(item.stage));
  const pipelineTotal = sum(openOpportunities, "amount");
  const winForecast = weightedPipeline(openOpportunities);
  const dueSoon = dueWithinDays(openOpportunities, addDaysIso(30));
  const quoteCounts = quotesByStatus(data.quotes);
  const awaitingQuotes = data.quotes.filter((item) => ["Enviado", "En revision"].includes(item.status));
  const executingOrders = data.workOrders.filter((item) => item.status === "En ejecucion");
  const lateOrders = overdueWorkOrders(executingOrders, today);
  const activeCompanies = data.companies.filter((item) => item.status === "Activo");
  const prospects = data.companies.filter((item) => ["Prospecto", "Contactado", "Negociacion"].includes(item.status));
  const overdueTasks = data.tasks.filter((task) => task.due && String(task.due).slice(0, 10) < today);

  const commercialItems = [...openOpportunities]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 5)
    .map((item) => ({ label: item.company, value: item.amount, caption: `${item.probability}% probabilidad - ${item.stage}` }));
  const operationsItems = data.workOrders
    .filter((order) => order.status !== "Terminada")
    .map((order) => ({ label: order.number, value: order.progress, caption: `${order.client} - ${order.team}` }));
  const avgProgress = operationsItems.length ? operationsItems.reduce((total, item) => total + Number(item.value || 0), 0) / operationsItems.length : 0;
  const controlItems = [
    { label: "Tareas", value: data.tasks.length, caption: overdueTasks.length ? `${overdueTasks.length} vencidas` : "al dia" },
    { label: "Documentos", value: data.documents.length, caption: "Adjuntos registrados" },
    { label: "Auditoria", value: data.auditLog.length, caption: "Eventos recientes" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Panel className="p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand)]">Vista general</p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-[var(--text)]">Operacion diaria {organization?.name || "Bizon"}</h2>
            <p className="mt-2 max-w-2xl text-[15px] font-semibold text-[var(--text-muted)]">Resumen ejecutivo de ventas, trabajos en curso y pendientes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setActive("reportes")}>Ver reportes</Button>
            <Button onClick={() => openCotizador()}>Nuevo presupuesto</Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pipeline abierto"
          value={money(pipelineTotal)}
          subtitle={`${openOpportunities.length} oportunidades`}
          tone="green"
          chart={openOpportunities.map((item) => item.amount)}
          detail={`${dueSoon.length} vencen en 30 dias · forecast ${money(winForecast)}`}
          onAction={() => setActive("crm")}
          actionLabel="Ver CRM"
        />
        <StatCard
          title="Presupuestos"
          value={awaitingQuotes.length}
          subtitle="Esperando respuesta del cliente"
          tone="blue"
          chart={data.quotes.map((item) => item.total)}
          detail={`${quoteCounts["Borrador"] || 0} borrador · ${quoteCounts["Aprobado"] || 0} aprobados · ${quoteCounts["Rechazado"] || 0} rechazados`}
          onAction={() => setActive("presupuestos")}
          actionLabel="Ver presupuestos"
        />
        <StatCard
          title="OT en ejecucion"
          value={executingOrders.length}
          subtitle={`${data.workOrders.length} ordenes totales`}
          tone="amber"
          chart={data.workOrders.map((item) => item.progress)}
          detail={`${lateOrders.length} atrasadas`}
          detailTone={lateOrders.length ? "danger" : undefined}
          onAction={() => setActive("ot")}
          actionLabel="Ver ordenes"
        />
        <StatCard
          title="Clientes activos"
          value={activeCompanies.length}
          subtitle={`${data.companies.length} empresas cargadas`}
          tone="green"
          chart={activeCompanies.map((item) => item.value)}
          detail={`${prospects.length} en prospeccion o negociacion`}
          onAction={() => setActive("clientes")}
          actionLabel="Ver clientes"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="p-5">
          <SectionTitle title="Gestion comercial" subtitle="Mayores oportunidades abiertas" action="Abrir" onAction={() => setActive("crm")} />
          <div className="mt-5">
            <DashboardLineChart values={commercialItems.map((item) => item.value)} labels={commercialItems.map((item) => item.label)} />
          </div>
          <div className="mt-5">
            {commercialItems.length ? <CleanBarList items={commercialItems} valueFormatter={money} /> : <p className="text-sm text-[var(--text-muted)]">Sin oportunidades abiertas.</p>}
          </div>
          <div className="mt-5 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">Pipeline <strong className="text-[var(--text)]">{money(pipelineTotal)}</strong></p>
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">Forecast <strong className="text-[var(--text)]">{money(winForecast)}</strong></p>
            <p className="flex justify-between gap-3 text-[var(--text-muted)]">Presupuestos <strong className="text-[var(--text)]">{data.quotes.length}</strong></p>
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Operacion" subtitle="Ordenes de trabajo en curso" action="Abrir" onAction={() => setActive("ot")} />
          <div className="mt-5">
            <DashboardRadialChart
              value={avgProgress}
              label="avance OT"
              details={[
                { label: "OT en curso", value: operationsItems.length, progress: Math.min(operationsItems.length * 20, 100) },
                { label: "OT atrasadas", value: lateOrders.length, progress: Math.min(lateOrders.length * 25, 100) },
                { label: "Tareas vencidas", value: overdueTasks.length, progress: Math.min(overdueTasks.length * 25, 100) },
              ]}
            />
          </div>
          <div className="mt-5">
            {operationsItems.length ? <CleanBarList items={operationsItems} valueFormatter={(value) => `${value}%`} /> : <p className="text-sm text-[var(--text-muted)]">Sin ordenes en curso.</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle title="Control" subtitle="Tareas, documentos y auditoria" action="Abrir" onAction={() => setActive("tareas")} />
          <div className="mt-5">
            <DashboardStackChart items={controlItems.map(({ label, value }) => ({ label, value }))} />
          </div>
          <div className="mt-5">
            <CleanBarList items={controlItems} />
          </div>
          <div className="mt-5 grid gap-3">
            {[...data.tasks].sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999"))).slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{task.text}</p>
                    <p className={`mt-1 text-xs font-semibold ${task.due && task.due < today ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>{task.owner} - {task.due || "sin fecha"}</p>
                  </div>
                  <Badge tone={task.priority === "Alta" ? "red" : "amber"}>{task.priority}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
