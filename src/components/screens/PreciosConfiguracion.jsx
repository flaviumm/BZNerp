import { useEffect, useState } from "react";
import { Button, Panel, Field, TextInput, SectionTitle, DataTable } from "../ui";
import {
  createLaborRate,
  deleteLaborRate,
  getOwnQuoteCalculationProfile,
  listOwnLaborRates,
  saveOwnQuoteCalculationProfile,
  updateLaborRate,
} from "../../lib/erpRepository";
import { money, pct } from "../../lib/utils";

const EMPTY_RATE = { trade: "", agreement: "", category: "", baseHour: "", monthlyBonus: "", monthlyHours: "176", loadFactor: "", quoteHour: "" };

// Campos del perfil de calculo en orden de exhibicion, con su label y si se
// ingresan como porcentaje (0-100 en la UI, 0-1 en la base) o como monto.
const PROFILE_FIELDS = [
  { key: "targetProfit", label: "Ganancia objetivo", kind: "pct" },
  { key: "iva", label: "IVA", kind: "pct" },
  { key: "iibb", label: "IIBB", kind: "pct" },
  { key: "adminOverhead", label: "Gastos administrativos", kind: "pct" },
  { key: "technicalContingency", label: "Contingencia tecnica", kind: "pct" },
  { key: "energyPerKwh", label: "Energia ($/kWh)", kind: "amount" },
  { key: "travelPerKm", label: "Traslado ($/km)", kind: "amount" },
  { key: "roundTo", label: "Redondeo del total ($)", kind: "amount" },
  { key: "validityDays", label: "Vigencia de la cotizacion (dias)", kind: "int" },
];

function toPercentInput(value) {
  return value === "" || value === null || value === undefined ? "" : String(Math.round(Number(value) * 10000) / 100);
}

function fromPercentInput(value) {
  return Number(value || 0) / 100;
}

export function PreciosConfiguracion({ organization, currentProfile }) {
  const organizationId = organization?.id || currentProfile?.organizationId;

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);
  const [editingRateId, setEditingRateId] = useState(null);
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) { setLoadingProfile(false); return undefined; }
    setLoadingProfile(true);
    getOwnQuoteCalculationProfile(organizationId)
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setProfileForm(loaded || {});
      })
      .catch((error) => { if (!cancelled) setProfileMessage(error.message || "No se pudo cargar el perfil de calculo."); })
      .finally(() => { if (!cancelled) setLoadingProfile(false); });
    return () => { cancelled = true; };
  }, [organizationId]);

  async function refreshRates() {
    try {
      setRates(await listOwnLaborRates());
    } catch (error) {
      setRateMessage(error.message || "No se pudieron cargar las tarifas.");
    }
  }

  useEffect(() => { refreshRates(); }, [organizationId]);

  async function saveProfile(event) {
    event.preventDefault();
    if (!organizationId) { setProfileMessage("No se pudo determinar tu organizacion."); return; }
    setSavingProfile(true);
    setProfileMessage("");
    try {
      const saved = await saveOwnQuoteCalculationProfile(organizationId, { name: profile?.name || "Perfil de calculo", ...profileForm }, profile?.id);
      setProfile(saved);
      setProfileForm(saved);
      setProfileMessage("Perfil de calculo guardado.");
    } catch (error) {
      setProfileMessage(error.message || "No se pudo guardar el perfil de calculo.");
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditRate(rate) {
    setEditingRateId(rate.id);
    setRateForm({
      trade: rate.trade,
      agreement: rate.agreement,
      category: rate.category,
      baseHour: String(rate.baseHour),
      monthlyBonus: String(rate.monthlyBonus),
      monthlyHours: String(rate.monthlyHours),
      loadFactor: String(Math.round(rate.loadFactor * 10000) / 100),
      quoteHour: String(rate.quoteHour),
    });
  }

  function resetRateForm() {
    setEditingRateId(null);
    setRateForm(EMPTY_RATE);
  }

  async function saveRate(event) {
    event.preventDefault();
    setSavingRate(true);
    setRateMessage("");
    try {
      const payload = { ...rateForm, loadFactor: fromPercentInput(rateForm.loadFactor) };
      if (editingRateId) await updateLaborRate(editingRateId, payload);
      else await createLaborRate(payload);
      resetRateForm();
      await refreshRates();
      setRateMessage("Tarifa guardada.");
    } catch (error) {
      setRateMessage(error.message || "No se pudo guardar la tarifa.");
    } finally {
      setSavingRate(false);
    }
  }

  async function removeRate(id) {
    if (!window.confirm("Borrar esta tarifa?")) return;
    try {
      await deleteLaborRate(id);
      if (editingRateId === id) resetRateForm();
      await refreshRates();
    } catch (error) {
      setRateMessage(error.message || "No se pudo borrar la tarifa.");
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Precios y condiciones" subtitle="Tarifas de mano de obra y parametros de calculo que usa el Cotizador para tu empresa" />

      <Panel className="p-5">
        <SectionTitle title="Perfil de calculo" subtitle="Se aplica a toda cotizacion nueva de tu organizacion" />
        {loadingProfile ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Cargando...</p>
        ) : (
          <form onSubmit={saveProfile} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROFILE_FIELDS.map((field) => (
              <Field key={field.key} label={field.kind === "pct" ? `${field.label} (%)` : field.label}>
                <TextInput
                  type="number"
                  step={field.kind === "pct" ? "0.01" : field.kind === "int" ? "1" : "0.01"}
                  value={field.kind === "pct" ? toPercentInput(profileForm[field.key]) : profileForm[field.key] ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setProfileForm((current) => ({ ...current, [field.key]: field.kind === "pct" ? fromPercentInput(raw) : raw }));
                  }}
                />
              </Field>
            ))}
            <div className="flex items-end">
              <Button type="submit" disabled={savingProfile}>{savingProfile ? "Guardando..." : "Guardar perfil"}</Button>
            </div>
          </form>
        )}
        {profileMessage && <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]">{profileMessage}</p>}
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="Tarifas de mano de obra" subtitle="Oficios, convenio y costo horario de cotizacion" />
        <form onSubmit={saveRate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Oficio"><TextInput required value={rateForm.trade} onChange={(event) => setRateForm({ ...rateForm, trade: event.target.value })} placeholder="Soldador" /></Field>
          <Field label="Convenio"><TextInput value={rateForm.agreement} onChange={(event) => setRateForm({ ...rateForm, agreement: event.target.value })} placeholder="UOM CCT 260/75" /></Field>
          <Field label="Categoria"><TextInput value={rateForm.category} onChange={(event) => setRateForm({ ...rateForm, category: event.target.value })} placeholder="Oficial" /></Field>
          <Field label="Jornal base ($/h)"><TextInput required type="number" step="0.01" value={rateForm.baseHour} onChange={(event) => setRateForm({ ...rateForm, baseHour: event.target.value })} /></Field>
          <Field label="Plus mensual ($)"><TextInput type="number" step="0.01" value={rateForm.monthlyBonus} onChange={(event) => setRateForm({ ...rateForm, monthlyBonus: event.target.value })} /></Field>
          <Field label="Horas mensuales"><TextInput type="number" step="1" value={rateForm.monthlyHours} onChange={(event) => setRateForm({ ...rateForm, monthlyHours: event.target.value })} /></Field>
          <Field label="Factor de carga (%)"><TextInput type="number" step="0.01" value={rateForm.loadFactor} onChange={(event) => setRateForm({ ...rateForm, loadFactor: event.target.value })} /></Field>
          <Field label="Costo hora cotizacion ($/h)"><TextInput required type="number" step="0.01" value={rateForm.quoteHour} onChange={(event) => setRateForm({ ...rateForm, quoteHour: event.target.value })} /></Field>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={savingRate}>{savingRate ? "Guardando..." : editingRateId ? "Actualizar tarifa" : "Agregar tarifa"}</Button>
            {editingRateId && <Button type="button" variant="ghost" onClick={resetRateForm}>Cancelar</Button>}
          </div>
        </form>
        {rateMessage && <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]">{rateMessage}</p>}
        <div className="mt-4">
          <DataTable
            headers={["Oficio", "Convenio", "Categoria", "$/h base", "Factor carga", "$/h cotizacion", ""]}
            rows={rates.map((rate) => [
              rate.trade,
              rate.agreement,
              rate.category,
              money(rate.baseHour),
              pct(rate.loadFactor),
              money(rate.quoteHour),
              <div className="flex gap-2" key={`actions-${rate.id}`}>
                <Button variant="ghost" onClick={() => startEditRate(rate)}>Editar</Button>
                <Button variant="ghost" onClick={() => removeRate(rate.id)}>Borrar</Button>
              </div>,
            ])}
            empty="Todavia no hay tarifas de mano de obra cargadas."
          />
        </div>
      </Panel>
    </div>
  );
}
