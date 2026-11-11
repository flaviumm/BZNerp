import { Button, Badge, Panel, Select, StatCard, SectionTitle, DataTable, ProgressRing } from "../ui";
import { clamp, toneForStatus } from "../../lib/utils";

export const WORK_ORDER_STATUSES = ["Pendiente", "En ejecucion", "Terminada"];
export const TASK_PRIORITIES = ["Alta", "Media", "Baja"];

export function OrdenesTrabajo({ workOrders, setWorkOrders, persistUpdate, openEditor, removeRecord, currentProfile, onNewRecord }) {
  const readOnlyClient = currentProfile?.role === "cliente";
  const visibleWorkOrders = readOnlyClient && currentProfile?.companyName ? workOrders.filter((order) => order.client === currentProfile.companyName) : workOrders;

  function patchOrder(number, patch) {
    if (readOnlyClient) return;
    const current = workOrders.find((item) => item.number === number);
    const updated = { ...current, ...patch };
    setWorkOrders((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("workOrders", number, updated);
  }

  function setProgress(number, progress) {
    const value = clamp(Number(progress), 0, 100);
    const current = workOrders.find((item) => item.number === number);
    patchOrder(number, { progress: value, status: value >= 100 ? "Terminada" : value > 0 && current.status === "Pendiente" ? "En ejecucion" : current.status });
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle
        title="Ordenes de trabajo"
        subtitle={readOnlyClient ? `Ordenes visibles para ${currentProfile?.companyName || "tu empresa"}` : "Planificacion, equipo asignado, avance y margen"}
        action={readOnlyClient ? null : "Nueva orden"}
        onAction={readOnlyClient ? null : onNewRecord}
      />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {visibleWorkOrders.map((order) => {
          const marginTone = order.margin < 30 ? "text-[var(--danger)]" : "text-[var(--brand-hover)]";
          return (
            <Panel key={order.number} className="flex min-h-[420px] flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{order.number}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-[var(--text)]">{order.client}</h3>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-[var(--text-muted)]">{order.service}</p>
                </div>
                {readOnlyClient ? (
                  <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
                ) : (
                  <Select value={order.status} onChange={(event) => patchOrder(order.number, { status: event.target.value })}>
                    {WORK_ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </Select>
                )}
              </div>

              <div className="mt-5">
                <ProgressRing value={order.progress} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Equipo</p>
                  <p className="mt-1 line-clamp-1 font-semibold text-[var(--text)]">{order.team}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Margen</p>
                  <p className={`mt-1 text-lg font-semibold ${marginTone}`}>{order.margin}%</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Inicio</p>
                  <p className="mt-1 font-semibold text-[var(--text)]">{order.start || "-"}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Entrega</p>
                  <p className="mt-1 font-semibold text-[var(--text)]">{order.end || "-"}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--text-muted)]">
                  <span>Actualizar avance</span>
                  <span>{order.progress}%</span>
                </div>
                <input className="w-full accent-[var(--brand)] disabled:opacity-50" type="range" min="0" max="100" value={order.progress} disabled={readOnlyClient} onChange={(event) => setProgress(order.number, event.target.value)} />
              </div>

              {readOnlyClient ? (
                <div className="mt-auto pt-4"><Badge tone="blue">Solo lectura</Badge></div>
              ) : (
                <div className="mt-auto flex gap-2 pt-4">
                  <Button variant="ghost" onClick={() => openEditor("ot", order)}>Editar</Button>
                  <Button variant="danger" onClick={() => removeRecord("workOrders", order.number)}>Borrar</Button>
                </div>
              )}
            </Panel>
          );
        })}
        {!visibleWorkOrders.length && <Panel className="p-5 text-sm font-medium text-[var(--text-muted)]">No hay ordenes de trabajo para mostrar.</Panel>}
      </div>
    </div>
  );
}

export function Tareas({ data, openEditor, removeRecord, onNewRecord }) {
  const tasks = [...data.tasks].sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
  const highPriority = tasks.filter((task) => task.priority === "Alta").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter((task) => task.due && task.due < today).length;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Tareas" subtitle="Seguimiento de pendientes por responsable y fecha" action="Nueva tarea" onAction={onNewRecord} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Tareas abiertas" value={tasks.length} subtitle="Pendientes registradas" tone="blue" />
        <StatCard title="Alta prioridad" value={highPriority} subtitle="Requieren seguimiento" tone={highPriority ? "red" : "green"} />
        <StatCard title="Vencidas" value={overdue} subtitle="Con fecha pasada" tone={overdue ? "red" : "green"} />
      </div>
      <DataTable
        headers={["Tarea", "Responsable", "Prioridad", "Vencimiento", "Acciones"]}
        rows={tasks.map((task) => [
          <strong className="text-[var(--text)]">{task.text}</strong>,
          task.owner,
          <Badge tone={task.priority === "Alta" ? "red" : task.priority === "Baja" ? "green" : "amber"}>{task.priority}</Badge>,
          <span className={task.due && task.due < today ? "font-semibold text-[var(--danger)]" : ""}>{task.due || "-"}</span>,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => removeRecord("tasks", task.id, { label: "tarea", silent: true })}>Hecha</Button>
            <Button variant="ghost" onClick={() => openEditor("tareas", task)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("tasks", task.id)}>Borrar</Button>
          </div>,
        ])}
        empty="No hay tareas pendientes"
      />
    </div>
  );
}
