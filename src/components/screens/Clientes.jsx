import { useState } from "react";
import { Button, Badge, Panel, TextInput, Select, SectionTitle, SearchBar } from "../ui";
import { money, clamp, toneForStatus } from "../../lib/utils";
import { companyContacts, companyDetails, companySearchText } from "../../lib/companyUtils";

export function Clientes({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const filtered = companies.filter((company) => {
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  function addContact(company) {
    if (!contactDraft.name.trim()) return;

    const contacts = [...companyContacts(company), {
      name: contactDraft.name.trim(),
      role: contactDraft.role.trim() || "Contacto",
      phone: contactDraft.phone.trim() || "-",
      email: contactDraft.email.trim(),
    }];
    const primary = contacts[0];
    const updated = { ...company, contacts, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
    setContactDraft({ name: "", role: "", phone: "", email: "" });
    setContactEditor(null);
  }

  function removeContact(company, index) {
    const contacts = companyContacts(company).filter((_, contactIndex) => contactIndex !== index);
    const normalized = contacts.length ? contacts : [{ name: "Sin asignar", role: "Principal", phone: "-", email: "" }];
    const primary = normalized[0];
    const updated = { ...company, contacts: normalized, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Agenda comercial compacta con multiples contactos" action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {["Empresa", "Rubro", "Contactos", "Localidad", "Estado", "Proxima accion", "Valor", "Acciones"].map((header) => (
                  <th key={header} className="px-3 py-2.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const contacts = companyContacts(company);
                const editingContacts = contactEditor === company.id;
                return (
                  <tr key={company.id} className="border-b border-[var(--border)] align-top last:border-b-0">
                    <td className="max-w-[220px] px-3 py-2.5">
                      <p className="truncate text-[13px] font-semibold text-zinc-950">{company.name}</p>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-600">{company.type}</td>
                    <td className="w-[330px] px-3 py-2.5">
                      <div className="space-y-1">
                        {contacts.slice(0, editingContacts ? contacts.length : 2).map((contact, index) => (
                          <div key={`${contact.name}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--border)] bg-white px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-900">{contact.name} <span className="font-medium text-zinc-400">/{contact.role}</span></p>
                              <p className="truncate text-[11px] font-medium text-zinc-500">{contact.phone}{contact.email ? ` · ${contact.email}` : ""}</p>
                            </div>
                            {editingContacts && (
                              <button type="button" onClick={() => removeContact(company, index)} className="text-[11px] font-semibold text-[var(--danger)]">Quitar</button>
                            )}
                          </div>
                        ))}
                        {!editingContacts && contacts.length > 2 && <p className="text-[11px] font-semibold text-zinc-500">+{contacts.length - 2} contactos</p>}
                        {editingContacts && (
                          <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                            <div className="grid grid-cols-2 gap-2">
                              <TextInput value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} placeholder="Nombre" />
                              <TextInput value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Cargo/area" />
                              <TextInput value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="Telefono" />
                              <TextInput type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="Email" />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => addContact(company)}>Agregar contacto</Button>
                              <Button variant="ghost" onClick={() => setContactEditor(null)}>Cerrar</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-600">{company.city}</td>
                    <td className="w-[150px] px-3 py-2.5">
                      <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                        {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                      </Select>
                    </td>
                    <td className="max-w-[170px] px-3 py-2.5 font-medium text-zinc-600"><span className="line-clamp-1">{company.next}</span></td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-950">{money(company.value)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</button>
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => openEditor("clientes", company)}>Editar</button>
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#f3d2d2] bg-[#fff5f5] px-2.5 text-[11px] font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]" onClick={() => removeRecord("companies", company.id)}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-medium text-zinc-500">Sin clientes para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function ClientesCompact({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const filtered = companies.filter((company) => {
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  function addContact(company) {
    if (!contactDraft.name.trim()) return;
    const contacts = [...companyContacts(company), {
      name: contactDraft.name.trim(),
      role: contactDraft.role.trim() || "Contacto",
      phone: contactDraft.phone.trim() || "-",
      email: contactDraft.email.trim(),
    }];
    const primary = contacts[0];
    const updated = { ...company, contacts, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
    setContactDraft({ name: "", role: "", phone: "", email: "" });
  }

  function removeContact(company, index) {
    const contacts = companyContacts(company).filter((_, contactIndex) => contactIndex !== index);
    const normalized = contacts.length ? contacts : [{ name: "Sin asignar", role: "Principal", phone: "-", email: "" }];
    const primary = normalized[0];
    const updated = { ...company, contacts: normalized, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Datos compactos en una fila uniforme" action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {["Empresa", "Rubro", "Contacto", "Localidad", "Estado", "Proxima accion", "Valor", "Acciones"].map((header) => (
                  <th key={header} className="px-3 py-2.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const contacts = companyContacts(company);
                const primary = contacts[0] || { name: company.contact, phone: company.phone };
                const editingContacts = contactEditor === company.id;
                return (
                  <React.Fragment key={company.id}>
                    <tr className="border-b border-[var(--border)] align-middle">
                      <td className="px-3 py-2.5"><p className="truncate text-[13px] font-semibold text-zinc-950">{company.name}</p></td>
                      <td className="px-3 py-2.5 font-medium text-zinc-600"><span className="block truncate">{company.type}</span></td>
                      <td className="px-3 py-2.5">
                        <p className="truncate font-semibold text-zinc-900">{primary.name}</p>
                        <p className="truncate text-[11px] font-medium text-zinc-500">{primary.phone}{contacts.length > 1 ? ` - +${contacts.length - 1}` : ""}</p>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-zinc-600"><span className="block truncate">{company.city}</span></td>
                      <td className="px-3 py-2.5">
                        <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                          {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-zinc-600"><span className="block truncate">{company.next}</span></td>
                      <td className="px-3 py-2.5 font-semibold text-zinc-950"><span className="block truncate">{money(company.value)}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-nowrap gap-1.5">
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</button>
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cfe7dd] bg-[#f0fdf7] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => openEditor("clientes", company)}>Editar</button>
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[#f3d2d2] bg-[#fff5f5] px-2.5 text-[11px] font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]" onClick={() => removeRecord("companies", company.id)}>Borrar</button>
                        </div>
                      </td>
                    </tr>
                    {editingContacts && (
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                        <td colSpan="8" className="px-3 py-3">
                          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-start">
                            <div className="grid gap-1">
                              {contacts.map((contact, index) => (
                                <div key={`${contact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs">
                                  <span className="min-w-0 truncate font-semibold text-zinc-900">{contact.name} / {contact.role} - {contact.phone}{contact.email ? ` - ${contact.email}` : ""}</span>
                                  <button type="button" onClick={() => removeContact(company, index)} className="shrink-0 font-semibold text-[var(--danger)]">Quitar</button>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <TextInput value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} placeholder="Nombre" />
                              <TextInput value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Cargo/area" />
                              <TextInput value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="Telefono" />
                              <TextInput type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="Email" />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => addContact(company)}>Agregar contacto</Button>
                              <Button variant="ghost" onClick={() => setContactEditor(null)}>Cerrar</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-medium text-zinc-500">Sin clientes para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function ClientesCards({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const filtered = companies.filter((company) => {
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function updateStatus(id, status) {
    const current = companies.find((item) => item.id === id);
    const updated = { ...current, status };
    setCompanies((items) => items.map((item) => item.id === id ? updated : item));
    persistUpdate("companies", id, updated);
  }

  function addContact(company) {
    if (!contactDraft.name.trim()) return;
    const contacts = [...companyContacts(company), {
      name: contactDraft.name.trim(),
      role: contactDraft.role.trim() || "Contacto",
      phone: contactDraft.phone.trim() || "-",
      email: contactDraft.email.trim(),
    }];
    const primary = contacts[0];
    const updated = { ...company, contacts, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
    setContactDraft({ name: "", role: "", phone: "", email: "" });
  }

  function removeContact(company, index) {
    const contacts = companyContacts(company).filter((_, contactIndex) => contactIndex !== index);
    const normalized = contacts.length ? contacts : [{ name: "Sin asignar", role: "Principal", phone: "-", email: "" }];
    const primary = normalized[0];
    const updated = { ...company, contacts: normalized, contact: primary.name, phone: primary.phone };
    setCompanies((items) => items.map((item) => item.id === company.id ? updated : item));
    persistUpdate("companies", company.id, updated);
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <SectionTitle title="Clientes y empresas" subtitle="Tarjetas comerciales con contactos y estado" action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((company) => {
          const contacts = companyContacts(company);
          const primary = contacts[0] || { name: company.contact, role: "Principal", phone: company.phone, email: "" };
          const details = companyDetails(company);
          const editingContacts = contactEditor === company.id;
          return (
            <Panel key={company.id} className="flex min-h-[360px] flex-col overflow-hidden">
              <div className="border-l-4 border-[var(--brand)] bg-[var(--brand-tint)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-hover)]">Cliente</p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-zinc-950">{company.name}</h3>
                  </div>
                  <Badge tone={toneForStatus(company.status)}>{company.status}</Badge>
                </div>
              </div>

              <div className="grid flex-1 gap-3 p-4">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Rubro</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{company.type}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Localidad</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{company.city}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Valor potencial</p>
                    <p className="mt-1 truncate font-semibold text-[var(--brand-hover)]">{money(company.value)}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Estado</p>
                    <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                      {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Proxima accion</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-800">{company.next}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">CUIT</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{details.taxId || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    <p className="font-semibold uppercase tracking-wide text-zinc-400">Direccion</p>
                    <p className="mt-1 truncate font-semibold text-zinc-950">{details.address || "-"}</p>
                  </div>
                </div>
                {(details.websites.length > 0 || details.socialNetworks.length > 0) && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-semibold text-zinc-600">
                    <p className="truncate">{details.websites[0] || details.socialNetworks[0]}</p>
                    {(details.websites.length + details.socialNetworks.length) > 1 && <p className="mt-1 text-[11px] text-zinc-400">+{details.websites.length + details.socialNetworks.length - 1} enlaces</p>}
                  </div>
                )}

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Contacto principal</p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">{primary.name} <span className="font-medium text-zinc-400">/{primary.role}</span></p>
                      <p className="truncate text-xs font-medium text-zinc-500">{primary.phone}{primary.email ? ` - ${primary.email}` : ""}</p>
                    </div>
                    {contacts.length > 1 && <Badge tone="blue">+{contacts.length - 1}</Badge>}
                  </div>
                </div>

                {editingContacts && (
                  <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="grid gap-1">
                      {contacts.map((contact, index) => (
                        <div key={`${contact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs">
                          <span className="min-w-0 truncate font-semibold text-zinc-900">{contact.name} / {contact.role} - {contact.phone}{contact.email ? ` - ${contact.email}` : ""}</span>
                          <button type="button" onClick={() => removeContact(company, index)} className="shrink-0 font-semibold text-[var(--danger)]">Quitar</button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} placeholder="Nombre" />
                      <TextInput value={contactDraft.role} onChange={(event) => setContactDraft({ ...contactDraft, role: event.target.value })} placeholder="Cargo/area" />
                      <TextInput value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} placeholder="Telefono" />
                      <TextInput type="email" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} placeholder="Email" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => addContact(company)}>Agregar contacto</Button>
                      <Button variant="ghost" onClick={() => setContactEditor(null)}>Cerrar</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto flex gap-2 border-t border-[var(--border)] p-4">
                <Button variant="ghost" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</Button>
                <Button variant="ghost" onClick={() => openEditor("clientes", company)}>Editar</Button>
                <Button variant="danger" onClick={() => removeRecord("companies", company.id)}>Borrar</Button>
              </div>
            </Panel>
          );
        })}
        {!filtered.length && <Panel className="p-5 text-sm font-medium text-zinc-500">Sin clientes para mostrar.</Panel>}
      </div>
    </div>
  );
}
