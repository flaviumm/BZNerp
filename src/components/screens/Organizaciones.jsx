import { useState } from "react";
import { Button, Panel, Field, TextInput, SectionTitle, DataTable, SearchBar } from "../ui";
import { formatDate } from "../../lib/utils";

export function Organizaciones({ organizations, organizationsError, onCreateOrganization, onRefreshOrganizations }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ organizationName: "", fullName: "", email: "", password: "" });
  const filtered = organizations.filter((org) => org.name.toLowerCase().includes(query.toLowerCase()));

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
    </div>
  );
}
