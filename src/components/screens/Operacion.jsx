import { useState } from "react";
import { Button, Badge, Panel, Field, Select, StatCard, SectionTitle, DataTable, ProgressRing } from "../ui";
import { money, clamp, sum, toneForStatus } from "../../lib/utils";

export function OrdenesTrabajo({ workOrders, setWorkOrders, persistUpdate, openEditor, removeRecord, currentProfile }) {
  const readOnlyClient = currentProfile?.role === "cliente";
  const visibleWorkOrders = readOnlyClient && currentProfile?.companyName ? workOrders.filter((order) => order.client === currentProfile.companyName) : workOrders;

  function setProgress(number, progress) {
    if (readOnlyClient) return;
    const current = workOrders.find((item) => item.number === number);
    const updated = { ...current, progress: clamp(progress, 0, 100), status: progress >= 100 ? "Terminada" : current.status };
    setWorkOrders((items) => items.map((item) => item.number === number ? updated : item));
    persistUpdate("workOrders", number, updated);
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Ordenes de trabajo" subtitle={readOnlyClient ? `Ordenes visibles para ${currentProfile?.companyName || "tu empresa"}` : "Planificacion, equipo asignado, avance y margen"} />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {visibleWorkOrders.map((order) => {
          const marginTone = order.margin < 30 ? "text-[#b42318]" : "text-[#d85f00]";
          return (
            <Panel key={order.number} className="flex min-h-[420px] flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{order.number}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-tight text-zinc-950">{order.client}</h3>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-zinc-500">{order.service}</p>
                </div>
                <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
              </div>

              <div className="mt-5">
                <ProgressRing value={order.progress} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Equipo</p>
                  <p className="mt-1 line-clamp-1 font-semibold text-zinc-950">{order.team}</p>
                </div>
                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Margen</p>
                  <p className={`mt-1 text-lg font-semibold ${marginTone}`}>{order.margin}%</p>
                </div>
                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Inicio</p>
                  <p className="mt-1 font-semibold text-zinc-950">{order.start}</p>
                </div>
                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
                  <p className="font-semibold uppercase tracking-wide text-zinc-400">Entrega</p>
                  <p className="mt-1 font-semibold text-zinc-950">{order.end}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-500">
                  <span>Actualizar avance</span>
                  <span>{order.progress}%</span>
                </div>
                <input className="w-full accent-[#ff7900] disabled:opacity-50" type="range" min="0" max="100" value={order.progress} disabled={readOnlyClient} onChange={(event) => setProgress(order.number, event.target.value)} />
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
        {!visibleWorkOrders.length && <Panel className="p-5 text-sm font-medium text-zinc-500">No hay ordenes de trabajo para mostrar.</Panel>}
      </div>
    </div>
  );
}

export function Inventario({ inventory, openEditor, removeRecord }) {
  const [category, setCategory] = useState("Todos");
  const categories = ["Todos", ...Array.from(new Set(inventory.map((item) => item.category)))];
  const rows = inventory.filter((item) => category === "Todos" || item.category === category);
  const totalValue = inventory.reduce((total, item) => total + item.stock * item.cost, 0);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Inventario" subtitle="Stock minimo, valorizacion y reposicion" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Valor de stock" value={money(totalValue)} subtitle="Costo promedio demo" tone="green" />
        <StatCard title="Items bajo minimo" value={inventory.filter((item) => item.stock <= item.min).length} subtitle="Requieren compra" tone="red" />
        <Panel className="p-4">
          <Field label="Categoria">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
        </Panel>
      </div>
      <DataTable
        headers={["SKU", "Material", "Categoria", "Stock", "Minimo", "Unidad", "Costo", "Estado", "Acciones"]}
        rows={rows.map((item) => [
          item.sku,
          <strong className="text-zinc-950">{item.name}</strong>,
          item.category,
          item.stock,
          item.min,
          item.unit,
          money(item.cost),
          <Badge tone={item.stock <= item.min ? "red" : "green"}>{item.stock <= item.min ? "Reponer" : "OK"}</Badge>,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("inventario", item)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("inventory", item.sku)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

export function Compras({ purchases, openEditor, removeRecord }) {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Compras" subtitle="Ordenes de compra, autorizaciones y entregas" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Compras abiertas" value={money(sum(purchases.filter((item) => item.status !== "Recibida"), "total"))} subtitle="Pendiente de recibir" tone="amber" />
        <StatCard title="OC pendientes" value={purchases.filter((item) => item.status !== "Recibida").length} subtitle="Seguimiento semanal" tone="blue" />
        <StatCard title="OC recibidas" value={purchases.filter((item) => item.status === "Recibida").length} subtitle="Ultimos movimientos" tone="green" />
      </div>
      <DataTable
        headers={["OC", "Proveedor", "Area", "Total", "Estado", "Fecha esperada", "Acciones"]}
        rows={purchases.map((item) => [
          item.number,
          item.supplier,
          item.area,
          money(item.total),
          <Badge tone={toneForStatus(item.status)}>{item.status}</Badge>,
          item.due,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("compras", item)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("purchases", item.number)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

export function Finanzas({ invoices, openEditor, removeRecord }) {
  const collected = sum(invoices.filter((item) => item.status === "Cobrada"), "total");
  const pending = sum(invoices.filter((item) => item.status !== "Cobrada"), "total");

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Finanzas" subtitle="Facturacion, cobranzas y caja proyectada" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Cobrado" value={money(collected)} subtitle="Facturas cerradas" tone="green" />
        <StatCard title="Por cobrar" value={money(pending)} subtitle="Pendiente y por vencer" tone="amber" />
        <StatCard title="Caja proyectada" value={money(collected + pending)} subtitle="Ingresos demo" tone="blue" />
      </div>
      <DataTable
        headers={["Factura", "Cliente", "Concepto", "Total", "Estado", "Vencimiento", "Acciones"]}
        rows={invoices.map((invoice) => [
          invoice.number,
          invoice.client,
          invoice.concept,
          money(invoice.total),
          <Badge tone={toneForStatus(invoice.status)}>{invoice.status}</Badge>,
          invoice.due,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("finanzas", invoice)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("invoices", invoice.number)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

export function RRHH({ employees, openEditor, removeRecord }) {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="RRHH" subtitle="Dotacion, equipos, disponibilidad y horas" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Personas activas" value={employees.length} subtitle="Dotacion demo" tone="green" />
        <StatCard title="Horas mensuales" value={sum(employees, "hours")} subtitle="Carga declarada" tone="blue" />
        <StatCard title="Disponibles" value={employees.filter((item) => item.status === "Disponible").length} subtitle="Sin asignacion critica" tone="amber" />
      </div>
      <DataTable
        headers={["Nombre", "Rol", "Equipo", "Estado", "Horas", "Acciones"]}
        rows={employees.map((employee) => [
          <strong className="text-zinc-950">{employee.name}</strong>,
          employee.role,
          employee.team,
          <Badge tone={toneForStatus(employee.status)}>{employee.status}</Badge>,
          employee.hours,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("rrhh", employee)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("employees", employee.id)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}

export function Tareas({ data, openEditor, removeRecord }) {
  const highPriority = data.tasks.filter((task) => task.priority === "Alta").length;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Tareas" subtitle="Seguimiento de pendientes por responsable y fecha" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Tareas abiertas" value={data.tasks.length} subtitle="Pendientes registradas" tone="blue" />
        <StatCard title="Alta prioridad" value={highPriority} subtitle="Requieren seguimiento" tone={highPriority ? "red" : "green"} />
        <StatCard title="Responsables" value={new Set(data.tasks.map((task) => task.owner)).size} subtitle="Areas involucradas" tone="green" />
      </div>
      <DataTable
        headers={["Tarea", "Responsable", "Prioridad", "Vencimiento", "Acciones"]}
        rows={data.tasks.map((task) => [
          <strong className="text-zinc-950">{task.text}</strong>,
          task.owner,
          <Badge tone={task.priority === "Alta" ? "red" : "amber"}>{task.priority}</Badge>,
          task.due,
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openEditor("tareas", task)}>Editar</Button>
            <Button variant="danger" onClick={() => removeRecord("tasks", task.id)}>Borrar</Button>
          </div>,
        ])}
      />
    </div>
  );
}
