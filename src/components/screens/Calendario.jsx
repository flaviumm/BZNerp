import { useState } from "react";
import { Button, Badge, Panel, Field, TextInput, Select, SectionTitle } from "../ui";
import { isValidDateValue } from "../../lib/utils";

export function toDateKey(value) {
  if (!isValidDateValue(value)) return "";
  return String(value).slice(0, 10);
}

export function buildCalendarEvents(data) {
  const events = [];
  data.opportunities.forEach((item) => events.push({ id: `op-${item.id}`, date: item.due, title: item.company, type: "CRM", detail: item.service, tone: "blue" }));
  data.quotes.forEach((item) => events.push({ id: `qt-${item.number}`, date: item.validUntil, title: item.number, type: "Presupuesto", detail: item.client, tone: "amber" }));
  data.workOrders.forEach((item) => {
    events.push({ id: `ot-start-${item.number}`, date: item.start, title: item.number, type: "Inicio OT", detail: item.client, tone: "green" });
    events.push({ id: `ot-end-${item.number}`, date: item.end, title: item.number, type: "Fin OT", detail: item.client, tone: "red" });
  });
  data.purchases.forEach((item) => events.push({ id: `po-${item.number}`, date: item.due, title: item.number, type: "Compra", detail: item.supplier, tone: "amber" }));
  data.invoices.forEach((item) => events.push({ id: `iv-${item.number}`, date: item.due, title: item.number, type: "Factura", detail: item.client, tone: item.status === "Cobrada" ? "green" : "red" }));
  data.tasks.forEach((item) => events.push({ id: `task-${item.id}`, date: item.due, title: item.text, type: item.eventType || "Tarea", detail: item.owner, tone: item.priority === "Alta" ? "red" : "blue", task: item }));
  return events.filter((item) => toDateKey(item.date));
}

export function Calendario({ data, createCalendarEvent, openEditor, removeRecord }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [form, setForm] = useState({ text: "", owner: "General", priority: "Media", eventType: "Reunion", startTime: "09:00", endTime: "10:00", notes: "" });

  const events = buildCalendarEvents(data);
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { key: date, day, date, events: events.filter((event) => toDateKey(event.date) === date) };
    }),
  ];
  const selectedEvents = events.filter((event) => toDateKey(event.date) === selectedDate);

  function changeMonth(offset) {
    setCursor(new Date(year, month + offset, 1));
  }

  function submit(event) {
    event.preventDefault();
    createCalendarEvent({ ...form, due: selectedDate });
    setForm({ text: "", owner: "General", priority: "Media", eventType: "Reunion", startTime: "09:00", endTime: "10:00", notes: "" });
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Calendario" subtitle="Agenda comercial, operativa y administrativa" />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold text-[#050505]">{cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</h2>
              <p className="text-sm text-zinc-500">Vencimientos, hitos y tareas</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => changeMonth(-1)}>Anterior</Button>
              <Button variant="ghost" onClick={() => changeMonth(1)}>Siguiente</Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                disabled={!cell.date}
                onClick={() => setSelectedDate(cell.date)}
                className={`min-h-28 rounded-xl border p-2 text-left transition ${cell.date === selectedDate ? "border-[#ff7900] bg-[#fff1e5]" : "border-[#ecece6] bg-white hover:bg-[#fbfbf8]"} ${!cell.date ? "opacity-0" : ""}`}
              >
                <span className="text-sm font-semibold text-[#050505]">{cell.day}</span>
                <div className="mt-2 space-y-1">
                  {(cell.events || []).slice(0, 3).map((event) => (
                    <div key={event.id} className="truncate rounded-md bg-[#050505] px-2 py-1 text-[11px] font-semibold text-white">{event.type}</div>
                  ))}
                  {(cell.events || []).length > 3 && <div className="text-[11px] font-semibold text-[#ff7900]">+{cell.events.length - 3}</div>}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="p-5">
            <SectionTitle title="Dia seleccionado" subtitle={selectedDate} />
            <div className="mt-4 grid gap-3">
              {selectedEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={event.tone}>{event.type}</Badge>
                      <p className="mt-2 font-semibold text-[#050505]">{event.title}</p>
                      <p className="text-sm text-zinc-500">{event.detail}</p>
                    </div>
                    {event.task && (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => openEditor("tareas", event.task)}>Editar</Button>
                        <Button variant="danger" onClick={() => removeRecord("tasks", event.task.id)}>Borrar</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!selectedEvents.length && <p className="rounded-xl border border-dashed border-[#ecece6] p-4 text-sm text-zinc-500">Sin eventos para este dia.</p>}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title="Nuevo evento" subtitle="Se guarda como tarea calendario" />
            <form onSubmit={submit} className="mt-4 grid gap-3">
              <Field label="Titulo"><TextInput required value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Reunion, visita, entrega" /></Field>
              <Field label="Responsable"><TextInput value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inicio"><TextInput type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
                <Field label="Fin"><TextInput type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo"><Select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })}>{["Reunion", "Visita", "Entrega", "Vencimiento", "Tarea"].map((item) => <option key={item}>{item}</option>)}</Select></Field>
                <Field label="Prioridad"><Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{["Media", "Alta", "Baja"].map((item) => <option key={item}>{item}</option>)}</Select></Field>
              </div>
              <Field label="Notas"><TextInput value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
              <Button type="submit">Crear evento</Button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
