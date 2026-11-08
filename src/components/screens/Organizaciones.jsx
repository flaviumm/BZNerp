import { useEffect, useState } from "react";
import { Button, Panel, Field, TextInput, Select, SectionTitle, DataTable, SearchBar } from "../ui";
import { formatDate } from "../../lib/utils";
import { screens, MODULE_KEYS } from "../../lib/navigation";
import { getOrganization } from "../../lib/authRepository";

const MODULE_LABELS = Object.fromEntries(screens.map((screen) => [screen.key, screen.label]));

export function Organizaciones({ organizations, organizationsError, onCreateOrganization, onRefreshOrganizations, onUpdateOrganization }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ organizationName: "", fullName: "", email: "", password: "" });
  const filtered = organizations.filter((org) => org.name.toLowerCase().includes(query.toLowerCase()));

  const [modulesOrgId, setModulesOrgId] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [savingModules, setSavingModules] = useState(false);
  const [modulesMessage, setModulesMessage] = useState("");

  useEffect(() => {
    if (!modulesOrgId) return undefined;
    let cancelled = false;
    getOrganization(modulesOrgId)
      .then((org) => {
        if (cancelled) return;
        setSelectedModules(Array.isArray(org?.enabledModules) && org.enabledModules.length ? org.enabledModules : MODULE_KEYS);
      })
      .catch((error) => { if (!cancelled) setModulesMessage(error.message); });
    return () => { cancelled = true; };
  }, [modulesOrgId]);

  function toggleModule(key) {
    setSelectedModules((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  async function saveModules() {
    if (!modulesOrgId) return;
    setSavingModules(true);
    setModulesMessage("");
    try {
      // Todos los modulos tildados = "sin restriccion" (se guarda null, ver
      // updateOrganization en authRepository.js) en vez de la lista completa:
      // asi una organizacion "todo incluido" sigue recibiendo pantallas nuevas
      // que se agreguen a futuro sin que un super-admin tenga que volver a
      // tildarlas a mano.
      const patch = selectedModules.length === MODULE_KEYS.length ? { enabledModules: [] } : { enabledModules: selectedModules };
      await onUpdateOrganization(patch, modulesOrgId);
      setModulesMessage("Modulos actualizados.");
      onRefreshOrganizations?.();
    } catch (error) {
      setModulesMessage(error.message || "No se pudieron actualizar los modulos.");
    } finally {
      setSavingModules(false);
    }
  }

  async function createOrganizationHandler(event) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      await onCreateOrganization(newOrg);
      setNewOrg({ organizationName: "", fullName: "", email: "", password: "" });
      setMessage("Organizacion creada.");
    } catch (error) {
      setMessage(error.message || "No se pudo crear la organizacion.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Organizaciones" subtitle="Alta de empresas cliente y su primer administrador" action="Actualizar" onAction={onRefreshOrganizations} />
      <Panel className="p-4">
        <SectionTitle title="Crear organizacion" subtitle="Da de alta una empresa nueva con su admin inicial" />
        <form onSubmit={createOrganizationHandler} className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.2fr_1.3fr_1fr_auto] lg:items-end">
          <Field label="Nombre de la organizacion">
            <TextInput required value={newOrg.organizationName} onChange={(event) => setNewOrg({ ...newOrg, organizationName: event.target.value })} placeholder="Empresa Cliente SA" />
          </Field>
          <Field label="Nombre del admin">
            <TextInput required value={newOrg.fullName} onChange={(event) => setNewOrg({ ...newOrg, fullName: event.target.value })} placeholder="Nombre y apellido" />
          </Field>
          <Field label="Email del admin">
            <TextInput type="email" required value={newOrg.email} onChange={(event) => setNewOrg({ ...newOrg, email: event.target.value })} placeholder="admin@empresa.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={6} value={newOrg.password} onChange={(event) => setNewOrg({ ...newOrg, password: event.target.value })} placeholder="Min. 6" />
          </Field>
          <Button type="submit">{creating ? "Creando..." : "Crear"}</Button>
        </form>
      </Panel>
      {organizationsError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">No se pudo cargar la lista de organizaciones: {organizationsError}</p>}
      {message && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar organizacion" />
      <DataTable
        headers={["Organizacion", "Creada"]}
        rows={filtered.map((org) => [org.name, formatDate(org.createdAt)])}
        empty="No hay organizaciones para mostrar"
      />

      <Panel className="p-4">
        <SectionTitle title="Modulos habilitados" subtitle="Que pantallas incluye el plan de cada empresa cliente" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_auto] lg:items-end">
          <Field label="Organizacion">
            <Select value={modulesOrgId} onChange={(event) => { setModulesOrgId(event.target.value); setModulesMessage(""); }}>
              <option value="">Elegir organizacion...</option>
              {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </Select>
          </Field>
          <Button type="button" onClick={saveModules} disabled={!modulesOrgId || savingModules}>{savingModules ? "Guardando..." : "Guardar modulos"}</Button>
        </div>
        {modulesOrgId && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODULE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)]">
                <input type="checkbox" checked={selectedModules.includes(key)} onChange={() => toggleModule(key)} />
                {MODULE_LABELS[key] || key}
              </label>
            ))}
          </div>
        )}
        {modulesMessage && <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]">{modulesMessage}</p>}
      </Panel>
    </div>
  );
}
