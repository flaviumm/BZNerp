import { useState } from "react";
import { Button, Badge, Panel, Select, StatCard, SectionTitle, ProgressRing } from "../ui";
import { money, clamp, sum, weightedPipeline } from "../../lib/utils";

export function CRM({ opportunities, setOpportunities, persistUpdate, openEditor, removeRecord }) {
  const stages = ["Nuevo prospecto", "Reunion", "Presupuesto enviado", "Negociacion", "Ganado", "PERDIDO"];
  const stageProbability = {
    "Nuevo prospecto": 20,
    "Reunion": 40,
    "Presupuesto enviado": 65,
    Negociacion: 75,
    Ganado: 100,
    PERDIDO: 0,
  };

  function moveOpportunity(id, stage) {
    const current = opportunities.find((item) => item.id === id);
    const updated = { ...current, stage, probability: stageProbability[stage] || current.probability };
    setOpportunities((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("opportunities", id, updated);
  }

  function moveByOffset(opportunity, offset) {
    const currentIndex = stages.indexOf(opportunity.stage);
    const nextStage = stages[clamp(currentIndex + offset, 0, stages.length - 1)];
    if (nextStage && nextStage !== opportunity.stage) moveOpportunity(opportunity.id, nextStage);
  }

  const compactAction = "inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-white px-2.5 text-xs font-semibold text-zinc-700";

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="CRM comercial" subtitle="Canvas de oportunidades por etapa" />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Pipeline" value={money(sum(opportunities, "amount"))} subtitle={`${opportunities.length} oportunidades`} tone="green" />
        <StatCard title="Forecast" value={money(weightedPipeline(opportunities))} subtitle="Probabilidad aplicada" tone="blue" />
        <StatCard title="Ganadas" value={opportunities.filter((item) => item.stage === "Ganado").length} subtitle="Cierres confirmados" tone="amber" />
        <StatCard title="Perdidas" value={opportunities.filter((item) => item.stage === "PERDIDO").length} subtitle="Oportunidades perdidas" tone="red" />
      </div>
      <div className="grid gap-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const cards = opportunities.filter((opportunity) => opportunity.stage === stage);
          const stageTotal = sum(cards, "amount");
          return (
            <Panel key={stage} className="min-h-[460px] min-w-0 p-3">
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-950">{stage}</h3>
                  <Badge>{cards.length}</Badge>
                </div>
                <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <p className="text-xs font-semibold text-zinc-500">Valor etapa</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-zinc-950">{money(stageTotal)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {cards.map((opportunity) => (
                  <article key={opportunity.id} className="flex min-h-[340px] flex-col rounded-2xl border border-[var(--border)] bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-tight text-zinc-950">{opportunity.company}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-zinc-500">{opportunity.service}</p>
                      </div>
                      <Badge tone={opportunity.stage === "Ganado" ? "green" : "blue"}>{opportunity.stage}</Badge>
                    </div>
                    <div className="mt-4">
                      <ProgressRing value={opportunity.probability} label="Prob." />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-zinc-400">Monto</p>
                        <p className="mt-1 truncate font-semibold text-[var(--brand-hover)]">{money(opportunity.amount)}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-zinc-400">Cierre</p>
                        <p className="mt-1 font-semibold text-zinc-950">{opportunity.due}</p>
                      </div>
                      <div className="col-span-2 rounded-xl border border-[var(--border)] bg-white p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-zinc-400">Responsable</p>
                        <p className="mt-1 truncate font-semibold text-zinc-950">{opportunity.owner}</p>
                      </div>
                    </div>
                    <div className="hidden">
                      <button type="button" className={compactAction} onClick={() => moveByOffset(opportunity, -1)}>←</button>
                      <button type="button" className={compactAction} onClick={() => moveByOffset(opportunity, 1)}>→</button>
                      <button type="button" className={compactAction} onClick={() => openEditor("crm", opportunity)}>Editar</button>
                      <button type="button" className={`${compactAction} border-[#f3d2d2] text-[var(--danger)] hover:border-[var(--danger)] hover:text-[var(--danger)]`} onClick={() => removeRecord("opportunities", opportunity.id)}>Borrar</button>
                    </div>
                    <div className="mt-auto grid gap-2 pt-4">
                      <Select value={opportunity.stage} onChange={(event) => moveOpportunity(opportunity.id, event.target.value)}>
                        {stages.map((option) => <option key={option}>{option}</option>)}
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" onClick={() => moveByOffset(opportunity, -1)}>Anterior</Button>
                        <Button variant="ghost" onClick={() => moveByOffset(opportunity, 1)}>Siguiente</Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => openEditor("crm", opportunity)}>Editar</Button>
                        <Button variant="danger" onClick={() => removeRecord("opportunities", opportunity.id)}>Borrar</Button>
                      </div>
                    </div>
                  </article>
                ))}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">Sin oportunidades</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function CRMCanvas({ opportunities, setOpportunities, persistUpdate, openEditor, removeRecord }) {
  const [expandedCards, setExpandedCards] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const stages = ["Nuevo prospecto", "Reunion", "Presupuesto enviado", "Negociacion", "Ganado", "PERDIDO"];
  const stageProbability = {
    "Nuevo prospecto": 20,
    "Reunion": 40,
    "Presupuesto enviado": 65,
    Negociacion: 75,
    Ganado: 100,
    PERDIDO: 0,
  };

  function moveOpportunity(id, stage) {
    const current = opportunities.find((item) => item.id === id);
    if (!current || current.stage === stage) return;
    const updated = { ...current, stage, probability: stageProbability[stage] || current.probability };
    setOpportunities((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("opportunities", id, updated);
  }

  function moveByOffset(opportunity, offset) {
    const currentIndex = stages.indexOf(opportunity.stage);
    const nextStage = stages[clamp(currentIndex + offset, 0, stages.length - 1)];
    if (nextStage) moveOpportunity(opportunity.id, nextStage);
  }

  function toggleExpanded(id) {
    setExpandedCards((current) => ({ ...current, [id]: !current[id] }));
  }

  function startDrag(event, opportunity) {
    setDraggingId(opportunity.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(opportunity.id));
  }

  function dropOnStage(event, stage) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain") || draggingId);
    if (id) moveOpportunity(id, stage);
    setDraggingId(null);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="CRM comercial" subtitle="Pestanas de oportunidades por estado. Arrastrar para cambiar etapa." />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Pipeline" value={money(sum(opportunities, "amount"))} subtitle={`${opportunities.length} oportunidades`} tone="green" />
        <StatCard title="Forecast" value={money(weightedPipeline(opportunities))} subtitle="Probabilidad aplicada" tone="blue" />
        <StatCard title="Ganadas" value={opportunities.filter((item) => item.stage === "Ganado").length} subtitle="Cierres confirmados" tone="amber" />
        <StatCard title="Perdidas" value={opportunities.filter((item) => item.stage === "PERDIDO").length} subtitle="Oportunidades perdidas" tone="red" />
      </div>
      <div className="grid gap-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const cards = opportunities.filter((opportunity) => opportunity.stage === stage);
          const stageTotal = sum(cards, "amount");
          return (
            <Panel
              key={stage}
              className={`min-h-[520px] min-w-0 p-3 transition ${draggingId ? "ring-1 ring-[var(--brand)]/20" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOnStage(event, stage)}
            >
              <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-[var(--border)] bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-950">{stage}</h3>
                  <Badge>{cards.length}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-zinc-500">
                  <span>Valor etapa</span>
                  <span className="truncate text-[var(--brand-hover)]">{money(stageTotal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {cards.map((opportunity) => {
                  const expanded = !!expandedCards[opportunity.id];
                  return (
                    <article
                      key={opportunity.id}
                      draggable
                      onDragStart={(event) => startDrag(event, opportunity)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition ${draggingId === opportunity.id ? "border-[var(--brand)] opacity-60" : "border-[var(--border)]"}`}
                    >
                      <button type="button" onClick={() => toggleExpanded(opportunity.id)} className="flex w-full items-stretch justify-between gap-3 border-l-4 border-[var(--brand)] bg-[var(--brand-tint)] px-3 py-3 text-left transition hover:bg-[var(--brand-tint)]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-hover)]">Cliente</p>
                          <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-zinc-950">{opportunity.company}</p>
                          <p className="mt-1 truncate text-[11px] font-medium text-zinc-500">{opportunity.service}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-center">
                          <span className="rounded-full bg-[var(--brand-tint)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-hover)]">{opportunity.probability}%</span>
                          <span className="text-xs font-semibold text-zinc-400">{expanded ? "Cerrar" : "Abrir"}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-[var(--border)] px-3 pb-3 pt-3">
                          <ProgressRing value={opportunity.probability} label="Prob." />
                          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-zinc-400">Monto</p>
                              <p className="mt-1 truncate font-semibold text-[var(--brand-hover)]">{money(opportunity.amount)}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-zinc-400">Cierre</p>
                              <p className="mt-1 font-semibold text-zinc-950">{opportunity.due}</p>
                            </div>
                            <div className="col-span-2 rounded-xl border border-[var(--border)] bg-white p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-zinc-400">Responsable</p>
                              <p className="mt-1 truncate font-semibold text-zinc-950">{opportunity.owner}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <Select value={opportunity.stage} onChange={(event) => moveOpportunity(opportunity.id, event.target.value)}>
                              {stages.map((option) => <option key={option}>{option}</option>)}
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" title="Estado anterior" onClick={() => moveByOffset(opportunity, -1)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-base font-semibold text-zinc-600 transition hover:border-[var(--brand)] hover:text-[var(--brand-hover)]">{"<"}</button>
                              <button type="button" title="Estado siguiente" onClick={() => moveByOffset(opportunity, 1)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-base font-semibold text-zinc-600 transition hover:border-[var(--brand)] hover:text-[var(--brand-hover)]">{">"}</button>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openEditor("crm", opportunity)} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]">Editar</button>
                              <button type="button" onClick={() => removeRecord("opportunities", opportunity.id)} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[#f3d2d2] bg-[#fff5f5] px-2 text-[11px] font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]">Borrar</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm font-medium text-zinc-500">Sin oportunidades</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
