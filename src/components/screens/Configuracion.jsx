import { useEffect, useState } from "react";
import { Button, Panel, Field, TextInput, SectionTitle } from "../ui";
import { laborRates as defaultLaborRates, quoteParameters as defaultQuoteParameters } from "../../lib/pricingData";

const LOGO_SIZE = 256;

function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(LOGO_SIZE / image.width, LOGO_SIZE / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

const PARAMETER_FIELDS = [
  ["iva", "IVA", "0.21 = 21%"],
  ["iibb", "Ingresos brutos", "0.035 = 3,5%"],
  ["targetProfit", "Ganancia objetivo", "0.25 = 25%"],
  ["adminOverhead", "Gastos administrativos", "0.10 = 10%"],
  ["technicalContingency", "Contingencia tecnica", "0.05 = 5%"],
  ["energyPerKwh", "Energia por kWh ($)", ""],
  ["travelPerKm", "Traslado por km ($)", ""],
  ["roundTo", "Redondear total a ($)", ""],
  ["offerValidityDays", "Validez de la oferta (dias)", ""],
];

const RATE_COLUMNS = [
  ["trade", "Oficio", "text"],
  ["agreement", "Convenio", "text"],
  ["category", "Categoria", "text"],
  ["baseHour", "Hora base", "number"],
  ["monthlyBonus", "Plus mensual", "number"],
  ["monthlyHours", "Horas/mes", "number"],
  ["loadFactor", "Cargas", "number"],
  ["quoteHour", "Hora cotizada", "number"],
];

function slug(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function Configuracion({ organization, currentProfile, onUpdateOrganization, pricing = {}, onSavePricing }) {
  const isSuperAdmin = Boolean(currentProfile?.isSuperAdmin);
  const [name, setName] = useState(organization?.name || "");
  const [color, setColor] = useState(organization?.primaryColor || "#ff7900");
  const [logo, setLogo] = useState(organization?.logoDataUrl || null);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [rates, setRates] = useState(() => pricing.laborRates || defaultLaborRates);
  const [params, setParams] = useState(() => pricing.quoteParameters || defaultQuoteParameters);

  useEffect(() => {
    setName(organization?.name || "");
    setColor(organization?.primaryColor || "#ff7900");
    setLogo(organization?.logoDataUrl || null);
  }, [organization?.id]);

  useEffect(() => {
    setRates(pricing.laborRates || defaultLaborRates);
    setParams(pricing.quoteParameters || defaultQuoteParameters);
  }, [pricing.laborRates, pricing.quoteParameters]);

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await resizeToDataUrl(file));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function runSave(key, action, okMessage) {
    setSaving(key);
    setMessage("");
    try {
      await action();
      setMessage(okMessage);
    } catch (error) {
      setMessage(error.message || "No se pudo guardar.");
    } finally {
      setSaving("");
    }
  }

  function saveBranding(event) {
    event.preventDefault();
    runSave("branding", async () => {
      if (!organization?.id) throw new Error("Elegi una empresa activa para configurar.");
      await onUpdateOrganization({ name: name.trim(), primaryColor: color, logoDataUrl: logo }, organization.id);
    }, "Configuracion guardada.");
  }

  function updateRate(index, key, value) {
    setRates((current) => current.map((rate, i) => (i === index ? { ...rate, [key]: value, id: key === "trade" ? slug(value) : rate.id } : rate)));
  }

  if (!organization && isSuperAdmin) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <SectionTitle title="Configuracion" subtitle="Elegi una empresa activa en el encabezado para configurar su marca, tarifas y parametros." />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Configuracion" subtitle={`Marca, tarifas y parametros de calculo de ${organization?.name || "tu empresa"}`} />
      {message && <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]">{message}</p>}

      <Panel className="p-5">
        <SectionTitle title="Marca" subtitle="Nombre, color y logo que ven los usuarios" />
        <form onSubmit={saveBranding} className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            <Field label="Nombre de la empresa">
              <TextInput required value={name} onChange={(event) => setName(event.target.value)} placeholder="Mi Empresa SA" />
            </Field>
            <Field label="Color principal">
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1" aria-label="Elegir color" />
                <TextInput required value={color} onChange={(event) => setColor(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" placeholder="#ff7900" />
                <span className="inline-flex h-9 items-center rounded-lg px-3 text-[11px] font-semibold text-black" style={{ background: color }}>Muestra</span>
              </div>
            </Field>
            <Field label="Logo">
              <input type="file" accept="image/*" onChange={handleLogo} className="block w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--text)]" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving === "branding"}>{saving === "branding" ? "Guardando..." : "Guardar marca"}</Button>
              {logo && <Button variant="ghost" onClick={() => setLogo(null)}>Quitar logo</Button>}
            </div>
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Vista previa</p>
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="Logo" className="h-14 w-14 rounded-xl object-contain" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-black text-xs font-semibold text-white">Logo</div>}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{name || "Nombre de la empresa"}</p>
                <p className="text-sm font-semibold text-[var(--text)]">Asi se ve en el encabezado</p>
              </div>
            </div>
          </div>
        </form>
      </Panel>

      <Panel className="p-5">
        <SectionTitle
          title="Parametros de calculo"
          subtitle={pricing.quoteParameters ? "Valores propios de la empresa" : "Valores por defecto (Bizon). Al guardar quedan propios de la empresa."}
          action={saving === "params" ? "Guardando..." : "Guardar parametros"}
          onAction={() => runSave("params", () => onSavePricing({ quoteParameters: params }), "Parametros guardados.")}
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {PARAMETER_FIELDS.map(([key, label, hint]) => (
            <Field key={key} label={hint ? `${label} (${hint})` : label}>
              <TextInput type="number" step="any" value={params[key] ?? ""} onChange={(event) => setParams({ ...params, [key]: event.target.value })} />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle
          title="Tarifas de mano de obra"
          subtitle={pricing.laborRates ? "Tarifas propias de la empresa" : "Tarifas por defecto (Bizon). Al guardar quedan propias de la empresa."}
          action={saving === "rates" ? "Guardando..." : "Guardar tarifas"}
          onAction={() => runSave("rates", () => onSavePricing({ laborRates: rates.filter((rate) => rate.trade?.trim()) }), "Tarifas guardadas.")}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[12px]">
            <thead className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <tr>{RATE_COLUMNS.map(([key, label]) => <th key={key} className="px-2 py-2">{label}</th>)}<th /></tr>
            </thead>
            <tbody>
              {rates.map((rate, index) => (
                <tr key={index} className="border-t border-[var(--border)]">
                  {RATE_COLUMNS.map(([key, , type]) => (
                    <td key={key} className="px-1 py-1">
                      <TextInput type={type} step="any" value={rate[key] ?? ""} onChange={(event) => updateRate(index, key, type === "number" ? Number(event.target.value || 0) : event.target.value)} />
                    </td>
                  ))}
                  <td className="px-1 py-1"><Button variant="danger" onClick={() => setRates((current) => current.filter((_, i) => i !== index))}>Quitar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setRates((current) => [...current, { id: "", trade: "", agreement: "", category: "", baseHour: 0, monthlyBonus: 0, monthlyHours: 176, loadFactor: 0.65, quoteHour: 0 }])}>Agregar oficio</Button>
          <Button variant="ghost" onClick={() => setRates(defaultLaborRates)}>Volver a las tarifas de Bizon</Button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">El cotizador usa la hora cotizada de cada oficio. Las otras columnas son de referencia para calcularla.</p>
      </Panel>
    </div>
  );
}
