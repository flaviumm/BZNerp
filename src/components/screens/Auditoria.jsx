import { useState } from "react";
import { Badge, StatCard, SectionTitle, DataTable, SearchBar } from "../ui";
import { formatDateTime } from "../../lib/utils";

export function Auditoria({ data }) {
  const [query, setQuery] = useState("");
  const filtered = data.auditLog
    .filter((event) => `${event.action} ${event.module} ${event.recordKey} ${event.summary} ${event.actorName}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const actionTone = {
    create: "green",
    update: "blue",
    delete: "red",
    upload: "amber",
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Auditoria" subtitle="Historial de altas, ediciones, borrados y documentos" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Eventos" value={data.auditLog.length} subtitle="Historial registrado" tone="blue" />
        <StatCard title="Altas" value={data.auditLog.filter((item) => item.action === "create").length} subtitle="Registros creados" tone="green" />
        <StatCard title="Cambios" value={data.auditLog.filter((item) => item.action === "update").length} subtitle="Ediciones realizadas" tone="amber" />
        <StatCard title="Borrados" value={data.auditLog.filter((item) => item.action === "delete").length} subtitle="Acciones sensibles" tone="red" />
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por modulo, accion, registro o usuario" />
      <DataTable
        headers={["Fecha", "Accion", "Modulo", "Registro", "Usuario", "Resumen"]}
        rows={filtered.map((event) => [
          formatDateTime(event.createdAt),
          <Badge tone={actionTone[event.action] || "zinc"}>{event.action}</Badge>,
          event.module,
          event.recordKey,
          event.actorName,
          event.summary,
        ])}
      />
    </div>
  );
}
