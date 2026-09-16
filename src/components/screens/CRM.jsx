import { useMemo, useState } from "react";
import { Button, Badge, Panel, Select, TextInput, StatCard, SectionTitle, ProgressRing } from "../ui";
import { money, clamp, sum, weightedPipeline } from "../../lib/utils";

function useOpportunityFilters(opportunities) {
  const [owner, setOwner] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [hideClosed, setHideClosed] = useState(false);

  const owners = useMemo(
    () => [...new Set(opportunities.map((item) => item.owner).filter(Boolean))].sort(),
    [opportunities]
  );

  const filtered = useMemo(() => {
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    return opportunities.filter((item) => {
      if (owner && item.owner !== owner) return false;
      if (min !== null && item.amount < min) return false;
      if (max !== null && item.amount > max) return false;
      if (hideClosed && (item.stage === "Ganado" || item.stage === "PERDIDO")) return false;
      return true;
    });
  }, [opportunities, owner, minAmount, maxAmount, hideClosed]);

  const active = !!(owner || minAmount || maxAmount || hideClosed);
  function clear() {
    setOwner("");
    setMinAmount("");
    setMaxAmount("");
    setHideClosed(false);
  }

  return { owner, setOwner, minAmount, setMinAmount, maxAmount, setMaxAmount, hideClosed, setHideClosed, owners, filtered, active, clear };
}

function OpportunityFilterBar(filters) {
  return (
    <Panel className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:flex-wrap">
      <div className="w-full md:w-48">
        <Select value={filters.owner} onChange={(event) => filters.setOwner(event.target.value)}>
          <option value="">Todos los responsables</option>
          {filters.owners.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
      </div>
      <div className="w-full md:w-32">
        <TextInput type="number" placeholder="Monto min" value={filters.minAmount} onChange={(event) => filters.setMinAmount(event.target.value)} />
      </div>
      <div className="w-full md:w-32">
        <TextInput type="number" placeholder="Monto max" value={filters.maxAmount} onChange={(event) => filters.setMaxAmount(event.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)]">
        <input type="checkbox" checked={filters.hideClosed} onChange={(event) => filters.setHideClosed(event.target.checked)} />
        Ocultar Ganado/Perdido
      </label>
      {filters.active && <Button variant="ghost" onClick={filters.clear}>Limpiar filtros</Button>}
    </Panel>
  );
}

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

  const compactAction = "inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-xs font-semibold text-[var(--text)]";

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
                  <h3 className="truncate text-sm font-semibold text-[var(--text)]">{stage}</h3>
                  <Badge>{cards.length}</Badge>
                </div>
                <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Valor etapa</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-[var(--text)]">{money(stageTotal)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {cards.map((opportunity) => (
                  <article key={opportunity.id} className="flex min-h-[340px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-tight text-[var(--text)]">{opportunity.company}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--text-muted)]">{opportunity.service}</p>
                      </div>
                      <Badge tone={opportunity.stage === "Ganado" ? "green" : "blue"}>{opportunity.stage}</Badge>
                    </div>
                    <div className="mt-4">
                      <ProgressRing value={opportunity.probability} label="Prob." />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Monto</p>
                        <p className="mt-1 truncate font-semibold text-[var(--brand-hover)]">{money(opportunity.amount)}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Cierre</p>
                        <p className="mt-1 font-semibold text-[var(--text)]">{opportunity.due}</p>
                      </div>
                      <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
                        <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Responsable</p>
                        <p className="mt-1 truncate font-semibold text-[var(--text)]">{opportunity.owner}</p>
                      </div>
                    </div>
                    <div className="hidden">
                      <button type="button" className={compactAction} onClick={() => moveByOffset(opportunity, -1)}>←</button>
                      <button type="button" className={compactAction} onClick={() => moveByOffset(opportunity, 1)}>→</button>
                      <button type="button" className={compactAction} onClick={() => openEditor("crm", opportunity)}>Editar</button>
                      <button type="button" className={`${compactAction} border-[var(--danger-tint-border)] text-[var(--danger)] hover:border-[var(--danger)] hover:text-[var(--danger)]`} onClick={() => removeRecord("opportunities", opportunity.id)}>Borrar</button>
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
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm font-medium text-[var(--text-muted)]">Sin oportunidades</p>}
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
  const filters = useOpportunityFilters(opportunities);
  const visibleOpportunities = filters.filtered;
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
      <OpportunityFilterBar {...filters} />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Pipeline" value={money(sum(visibleOpportunities, "amount"))} subtitle={`${visibleOpportunities.length} oportunidades`} tone="green" />
        <StatCard title="Forecast" value={money(weightedPipeline(visibleOpportunities))} subtitle="Probabilidad aplicada" tone="blue" />
        <StatCard title="Ganadas" value={visibleOpportunities.filter((item) => item.stage === "Ganado").length} subtitle="Cierres confirmados" tone="amber" />
        <StatCard title="Perdidas" value={visibleOpportunities.filter((item) => item.stage === "PERDIDO").length} subtitle="Oportunidades perdidas" tone="red" />
      </div>
      <div className="grid gap-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const cards = visibleOpportunities.filter((opportunity) => opportunity.stage === stage);
          const stageTotal = sum(cards, "amount");
          return (
            <Panel
              key={stage}
              className={`min-h-[520px] min-w-0 p-3 transition ${draggingId ? "ring-1 ring-[var(--brand)]/20" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOnStage(event, stage)}
            >
              <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-[var(--text)]">{stage}</h3>
                  <Badge>{cards.length}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
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
                      className={`overflow-hidden rounded-2xl border bg-[var(--surface-raised)] shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition ${draggingId === opportunity.id ? "border-[var(--brand)] opacity-60" : "border-[var(--border)]"}`}
                    >
                      <button type="button" onClick={() => toggleExpanded(opportunity.id)} className="flex w-full items-stretch justify-between gap-3 border-l-4 border-[var(--brand)] bg-[var(--brand-tint)] px-3 py-3 text-left transition hover:bg-[var(--brand-tint)]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-hover)]">Cliente</p>
                          <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-[var(--text)]">{opportunity.company}</p>
                          <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-muted)]">{opportunity.service}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-center">
                          <span className="rounded-full bg-[var(--brand-tint)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-hover)]">{opportunity.probability}%</span>
                          <span className="text-xs font-semibold text-[var(--text-muted)]">{expanded ? "Cerrar" : "Abrir"}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-[var(--border)] px-3 pb-3 pt-3">
                          <ProgressRing value={opportunity.probability} label="Prob." />
                          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Monto</p>
                              <p className="mt-1 truncate font-semibold text-[var(--brand-hover)]">{money(opportunity.amount)}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Cierre</p>
                              <p className="mt-1 font-semibold text-[var(--text)]">{opportunity.due}</p>
                            </div>
                            <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
                              <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Responsable</p>
                              <p className="mt-1 truncate font-semibold text-[var(--text)]">{opportunity.owner}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <Select value={opportunity.stage} onChange={(event) => moveOpportunity(opportunity.id, event.target.value)}>
                              {stages.map((option) => <option key={option}>{option}</option>)}
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" title="Estado anterior" onClick={() => moveByOffset(opportunity, -1)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-base font-semibold text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand-hover)]">{"<"}</button>
                              <button type="button" title="Estado siguiente" onClick={() => moveByOffset(opportunity, 1)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-base font-semibold text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand-hover)]">{">"}</button>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openEditor("crm", opportunity)} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[var(--success-tint-border)] bg-[var(--success-tint)] px-2 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]">Editar</button>
                              <button type="button" onClick={() => removeRecord("opportunities", opportunity.id)} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[var(--danger-tint-border)] bg-[var(--danger-tint)] px-2 text-[11px] font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]">Borrar</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm font-medium text-[var(--text-muted)]">Sin oportunidades</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
