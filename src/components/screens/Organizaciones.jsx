import { useState } from "react";
import { Button, Badge, Panel, Field, TextInput, SectionTitle, SearchBar } from "../ui";
import { formatDate } from "../../lib/utils";

// Plataforma: administracion de empresas por el super admin.
export function Organizaciones({ organizations, organizationsError, allUserProfiles: userProfiles = [], actingOrganizationId, onCreateOrganization, onRefreshOrganizations, onOperateOrganization, onUpdateOrganization, onDeleteOrganization }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ organizationName: "", fullName: "", email: "", password: "" });
  const [renaming, setRenaming] = useState({ id: "", name: "" });
  const [deleting, setDeleting] = useState({ id: "", confirmation: "" });
  const [busy, setBusy] = useState("");
  const filtered = organizations.filter((org) => org.name.toLowerCase().includes(query.toLowerCase()));
  const usersByOrg = userProfiles.reduce((counts, user) => {
    if (user.organizationId) counts[user.organizationId] = (counts[user.organizationId] || 0) + 1;
    return counts;
  }, {});

  async function run(id, label, action) {
    setBusy(id);
    setMessage("");
    try {
      await action();
      setMessage(label);
    } catch (error) {
      setMessage(error.message || "No se pudo completar la accion.");
    } finally {
      setBusy("");
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
      <SectionTitle title="Plataforma" subtitle="Empresas que usan el ERP. Elegi una como activa para operar adentro con todos los modulos." action="Actualizar" onAction={onRefreshOrganizations} />
      <Panel className="p-4">
        <SectionTitle title="Crear empresa" subtitle="Da de alta una empresa nueva con su admin inicial" />
        <form onSubmit={createOrganizationHandler} className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.2fr_1.3fr_1fr_auto] lg:items-end">
          <Field label="Nombre de la empresa">
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
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar empresa" />
      <div className="grid gap-3">
        {filtered.map((org) => {
          const isActive = org.id === actingOrganizationId;
          const suspended = org.status === "suspended";
          return (
            <Panel key={org.id} className={`p-4 ${isActive ? "ring-1 ring-[var(--brand)]" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renaming.id === org.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        run(org.id, "Empresa renombrada.", async () => {
                          await onUpdateOrganization({ name: renaming.name.trim() }, org.id);
                          setRenaming({ id: "", name: "" });
                        });
                      }}
                    >
                      <TextInput required autoFocus value={renaming.name} onChange={(event) => setRenaming({ ...renaming, name: event.target.value })} />
                      <Button type="submit" disabled={busy === org.id}>Guardar</Button>
                      <Button type="button" variant="ghost" onClick={() => setRenaming({ id: "", name: "" })}>Cancelar</Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--text)]">{org.name}</h3>
                      <Badge tone={suspended ? "red" : "green"}>{suspended ? "Suspendida" : "Activa"}</Badge>
                      {isActive && <Badge tone="blue">Empresa activa</Badge>}
                    </div>
                  )}
                  <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">{usersByOrg[org.id] || 0} usuarios · creada {formatDate(org.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={isActive ? "ghost" : undefined} disabled={isActive} onClick={() => onOperateOrganization(org.id)}>{isActive ? "Operando" : "Operar"}</Button>
                  <Button variant="ghost" onClick={() => setRenaming({ id: org.id, name: org.name })}>Renombrar</Button>
                  <Button variant="ghost" disabled={busy === org.id} onClick={() => run(org.id, suspended ? "Empresa reactivada." : "Empresa suspendida: sus usuarios no pueden entrar.", () => onUpdateOrganization({ status: suspended ? "active" : "suspended" }, org.id))}>
                    {suspended ? "Reactivar" : "Suspender"}
                  </Button>
                  <Button variant="danger" onClick={() => setDeleting({ id: deleting.id === org.id ? "" : org.id, confirmation: "" })}>Borrar</Button>
                </div>
              </div>
              {deleting.id === org.id && (
                <form
                  className="mt-4 grid gap-2 rounded-xl border border-[var(--danger-tint-border)] bg-[var(--danger-tint)] p-3 md:grid-cols-[1fr_auto_auto] md:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(org.id, `Empresa ${org.name} borrada.`, async () => {
                      await onDeleteOrganization(org.id);
                      setDeleting({ id: "", confirmation: "" });
                    });
                  }}
                >
                  <Field label={`Esto borra usuarios, datos y archivos de ${org.name} y no se puede deshacer. Escribi el nombre exacto para confirmar.`}>
                    <TextInput value={deleting.confirmation} onChange={(event) => setDeleting({ ...deleting, confirmation: event.target.value })} placeholder={org.name} />
                  </Field>
                  <Button type="submit" variant="danger" disabled={deleting.confirmation !== org.name || busy === org.id}>{busy === org.id ? "Borrando..." : "Borrar definitivamente"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setDeleting({ id: "", confirmation: "" })}>Cancelar</Button>
                </form>
              )}
            </Panel>
          );
        })}
        {!filtered.length && <Panel className="p-5 text-sm font-medium text-[var(--text-muted)]">No hay empresas para mostrar.</Panel>}
      </div>
    </div>
  );
}
