import { useEffect, useRef, useState } from "react";
import { Button, SectionTitle } from "../ui";
import { Icon } from "../../cotizador/ui";
import Wizard from "../../cotizador/Cotizador";
import { laborRates, quoteParameters } from "../../lib/pricingData";
import { isDatabaseConfigured, supabase } from "../../lib/supabaseClient";

const STEPS = [
  { key: "datosEmpresa", label: "Datos empresa", icon: "business" },
  { key: "materiales", label: "Materiales", icon: "inventory_2" },
  { key: "jornadas", label: "Jornadas", icon: "engineering" },
  { key: "traslado", label: "Traslado", icon: "local_shipping" },
  { key: "resumen", label: "Resumen", icon: "analytics" },
];

// El catalogo (~5MB) va como asset estatico y se pide una sola vez por sesion.
let catalogPromise = null;
function loadCatalog() {
  catalogPromise ||= fetch("/materialPriceCatalog.json").then((res) => res.json()).catch(() => []);
  return catalogPromise;
}

export function Cotizador({ companies, setCompanies, quotes, setQuotes, persistRecord, persistUpdate, getDocumentNumber, editingQuote = null, setActive }) {
  const [materials, setMaterials] = useState([]);
  const [step, setStep] = useState("datosEmpresa");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [autosave, setAutosave] = useState("idle");
  const [activeNumber, setActiveNumber] = useState(editingQuote?.number || null);
  const wizardRef = useRef(null);
  const numberPromise = useRef(null);
  const saveChain = useRef(Promise.resolve());

  useEffect(() => { loadCatalog().then(setMaterials); }, []);

  const stepIndex = Math.max(0, STEPS.findIndex((item) => item.key === step));

  // Guardados en serie: el autosave puede disparar mientras el insert anterior sigue en vuelo.
  function upsertQuote(number, draft) {
    const run = saveChain.current.then(async () => {
      let n = number;
      if (!n) {
        numberPromise.current ||= getDocumentNumber("quote", quotes, "P", 4);
        n = await numberPromise.current;
      }
      const existing = quotes.find((item) => item.number === n);
      const record = { ...draft, number: n, status: existing?.status || draft.status };
      setQuotes((items) => existing ? items.map((item) => item.number === n ? record : item) : [...items, record]);
      if (existing) await persistUpdate("quotes", n, record);
      else await persistRecord("quotes", record);
      setActiveNumber(n);
      return record;
    });
    saveChain.current = run.catch(() => {});
    return run;
  }

  async function createCompany(record) {
    setCompanies((items) => [...items, record]);
    await persistRecord("companies", record);
  }

  // Dispara el workflow de GitHub que scrapea proveedores y redeploya (~5 min).
  const [priceUpdate, setPriceUpdate] = useState({ status: "idle", message: "" });
  async function updatePrices() {
    setPriceUpdate({ status: "loading", message: "" });
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/update-prices", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setPriceUpdate({ status: "done", message: "Actualización lanzada: en ~5 min recargá la página para ver precios nuevos." });
    } catch (error) {
      setPriceUpdate({ status: "error", message: error.message });
    }
  }

  const autosaveLabel = { pending: "Guardando…", saved: "Guardado", idle: "" }[autosave];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle
        title={activeNumber ? `Presupuesto ${activeNumber}` : "Nuevo presupuesto"}
        subtitle={`Paso ${stepIndex + 1} de ${STEPS.length} · ${STEPS[stepIndex].label}${autosaveLabel ? ` · ${autosaveLabel}` : ""}`}
        action="Generar PDF"
        onAction={() => wizardRef.current?.generatePdf()}
      />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1">
        {STEPS.map((item, index) => {
          const isActive = item.key === step;
          const done = index < stepIndex;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStep(item.key)}
              className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                isActive ? "bg-[var(--brand)] text-white" : done ? "text-[var(--brand)] hover:bg-[var(--surface)]" : "text-[var(--text-muted)] hover:bg-[var(--surface)]"
              }`}
            >
              <Icon name={done && !isActive ? "check_circle" : item.icon} className="text-[18px]" />
              {item.label}
            </button>
          );
        })}
      </div>

      <Wizard
        key={editingQuote?.number || "new"}
        ref={wizardRef}
        companies={companies}
        materials={materials}
        laborRates={laborRates}
        quoteParameters={quoteParameters}
        step={step}
        setStep={setStep}
        lightboxImage={lightboxImage}
        setLightboxImage={setLightboxImage}
        initialQuote={editingQuote}
        activeQuoteId={activeNumber}
        activeQuoteNumber={activeNumber}
        onQuoteChange={upsertQuote}
        onCreateCompany={createCompany}
        onDone={() => setActive("presupuestos")}
        onSavingStatusChange={setAutosave}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={stepIndex === 0} onClick={() => setStep(STEPS[stepIndex - 1].key)}>Anterior</Button>
        {isDatabaseConfigured && (
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <Button variant="ghost" disabled={priceUpdate.status === "loading"} onClick={updatePrices}>
              {priceUpdate.status === "loading" ? "Lanzando..." : "Actualizar precios"}
            </Button>
            {priceUpdate.message && <span className={priceUpdate.status === "error" ? "text-[var(--danger)]" : ""}>{priceUpdate.message}</span>}
          </div>
        )}
        {stepIndex < STEPS.length - 1
          ? <Button onClick={() => setStep(STEPS[stepIndex + 1].key)}>Siguiente</Button>
          : <Button onClick={() => wizardRef.current?.generatePdf()}>Generar PDF</Button>}
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <div className="relative w-full max-w-xl overflow-hidden rounded-xl bg-[var(--surface-raised)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="truncate pr-4 text-sm font-semibold text-[var(--text)]">{lightboxImage.name}</p>
              <button onClick={() => setLightboxImage(null)} className="shrink-0 text-xl leading-none text-[var(--text-muted)] hover:text-[var(--text)]">✕</button>
            </div>
            <div className="flex min-h-[280px] items-center justify-center bg-[var(--surface)] p-6">
              <img src={lightboxImage.src} alt={lightboxImage.name} className="max-h-72 max-w-full object-contain" onError={(e) => { e.target.src = ""; e.target.alt = "Sin imagen"; }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
