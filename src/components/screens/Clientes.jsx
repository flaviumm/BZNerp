import { useMemo, useState } from "react";
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
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                      <p className="truncate text-[13px] font-semibold text-[var(--text)]">{company.name}</p>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[var(--text-muted)]">{company.type}</td>
                    <td className="w-[330px] px-3 py-2.5">
                      <div className="space-y-1">
                        {contacts.slice(0, editingContacts ? contacts.length : 2).map((contact, index) => (
                          <div key={`${contact.name}-${index}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--text)]">{contact.name} <span className="font-medium text-[var(--text-muted)]">/{contact.role}</span></p>
                              <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">{contact.phone}{contact.email ? ` · ${contact.email}` : ""}</p>
                            </div>
                            {editingContacts && (
                              <button type="button" onClick={() => removeContact(company, index)} className="text-[11px] font-semibold text-[var(--danger)]">Quitar</button>
                            )}
                          </div>
                        ))}
                        {!editingContacts && contacts.length > 2 && <p className="text-[11px] font-semibold text-[var(--text-muted)]">+{contacts.length - 2} contactos</p>}
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
                    <td className="px-3 py-2.5 font-medium text-[var(--text-muted)]">{company.city}</td>
                    <td className="w-[150px] px-3 py-2.5">
                      <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                        {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                      </Select>
                    </td>
                    <td className="max-w-[170px] px-3 py-2.5 font-medium text-[var(--text-muted)]"><span className="line-clamp-1">{company.next}</span></td>
                    <td className="px-3 py-2.5 font-semibold text-[var(--text)]">{money(company.value)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--success-tint-border)] bg-[var(--success-tint)] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</button>
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--success-tint-border)] bg-[var(--success-tint)] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => openEditor("clientes", company)}>Editar</button>
                        <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--danger-tint-border)] bg-[var(--danger-tint)] px-2.5 text-[11px] font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]" onClick={() => removeRecord("companies", company.id)}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-medium text-[var(--text-muted)]">Sin clientes para mostrar</td>
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
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
                      <td className="px-3 py-2.5"><p className="truncate text-[13px] font-semibold text-[var(--text)]">{company.name}</p></td>
                      <td className="px-3 py-2.5 font-medium text-[var(--text-muted)]"><span className="block truncate">{company.type}</span></td>
                      <td className="px-3 py-2.5">
                        <p className="truncate font-semibold text-[var(--text)]">{primary.name}</p>
                        <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">{primary.phone}{contacts.length > 1 ? ` - +${contacts.length - 1}` : ""}</p>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[var(--text-muted)]"><span className="block truncate">{company.city}</span></td>
                      <td className="px-3 py-2.5">
                        <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                          {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[var(--text-muted)]"><span className="block truncate">{company.next}</span></td>
                      <td className="px-3 py-2.5 font-semibold text-[var(--text)]"><span className="block truncate">{money(company.value)}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-nowrap gap-1.5">
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--success-tint-border)] bg-[var(--success-tint)] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</button>
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--success-tint-border)] bg-[var(--success-tint)] px-2.5 text-[11px] font-semibold text-[var(--success)] transition hover:border-[var(--success)]" onClick={() => openEditor("clientes", company)}>Editar</button>
                          <button type="button" className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--danger-tint-border)] bg-[var(--danger-tint)] px-2.5 text-[11px] font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]" onClick={() => removeRecord("companies", company.id)}>Borrar</button>
                        </div>
                      </td>
                    </tr>
                    {editingContacts && (
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                        <td colSpan="8" className="px-3 py-3">
                          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-start">
                            <div className="grid gap-1">
                              {contacts.map((contact, index) => (
                                <div key={`${contact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs">
                                  <span className="min-w-0 truncate font-semibold text-[var(--text)]">{contact.name} / {contact.role} - {contact.phone}{contact.email ? ` - ${contact.email}` : ""}</span>
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
                  <td colSpan="8" className="px-3 py-8 text-center text-sm font-medium text-[var(--text-muted)]">Sin clientes para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

const CLIENT_STATUSES = ["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"];

export function ClientesCards({ companies, setCompanies, persistUpdate, openEditor, removeRecord, onNewRecord }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [contactEditor, setContactEditor] = useState(null);
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", phone: "", email: "" });
  const [expandedCards, setExpandedCards] = useState({});
  const [draggingId, setDraggingId] = useState(null);

  const types = useMemo(() => [...new Set(companies.map((item) => item.type).filter(Boolean))].sort(), [companies]);

  const filtered = companies.filter((company) => {
    if (typeFilter && company.type !== typeFilter) return false;
    return companySearchText(company).toLowerCase().includes(query.toLowerCase());
  });

  function toggleExpanded(id) {
    setExpandedCards((current) => ({ ...current, [id]: !current[id] }));
  }

  function startDrag(event, company) {
    setDraggingId(company.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(company.id));
  }

  function dropOnStatus(event, status) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain") || draggingId);
    if (id) updateStatus(id, status);
    setDraggingId(null);
  }

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
      <SectionTitle title="Clientes y empresas" subtitle="Kanban comercial por estado. Arrastrar para cambiar estado." action="Agregar cliente" onAction={onNewRecord} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar value={query} onChange={setQuery} placeholder="Buscar cliente, ciudad, rubro o contacto" />
          <div className="w-full sm:w-44">
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Todos los rubros</option>
              {types.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </div>
        </div>
        <Button onClick={onNewRecord}>Agregar cliente</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {CLIENT_STATUSES.map((status) => {
          const cards = filtered.filter((company) => company.status === status);
          const columnValue = cards.reduce((total, company) => total + (Number(company.value) || 0), 0);
          return (
            <Panel
              key={status}
              className={`min-h-[420px] min-w-0 p-3 transition ${draggingId ? "ring-1 ring-[var(--brand)]/20" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOnStatus(event, status)}
            >
              <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-[var(--text)]">{status}</h3>
                  <Badge tone={toneForStatus(status)}>{cards.length}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-muted)]">
                  <span>Valor potencial</span>
                  <span className="truncate text-[var(--brand-hover)]">{money(columnValue)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {cards.map((company) => {
                  const contacts = companyContacts(company);
                  const primary = contacts[0] || { name: company.contact, role: "Principal", phone: company.phone, email: "" };
                  const details = companyDetails(company);
                  const editingContacts = contactEditor === company.id;
                  const expanded = !!expandedCards[company.id];
                  return (
                    <article
                      key={company.id}
                      draggable
                      onDragStart={(event) => startDrag(event, company)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`overflow-hidden rounded-2xl border bg-[var(--surface-raised)] shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition ${draggingId === company.id ? "border-[var(--brand)] opacity-60" : "border-[var(--border)]"}`}
                    >
                      <button type="button" onClick={() => toggleExpanded(company.id)} className="flex w-full items-stretch justify-between gap-3 border-l-4 border-[var(--brand)] bg-[var(--brand-tint)] px-3 py-3 text-left transition hover:bg-[var(--brand-tint)]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-hover)]">Cliente</p>
                          <p className="mt-0.5 truncate text-[15px] font-semibold leading-tight text-[var(--text)]">{company.name}</p>
                          <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-muted)]">{company.type} - {company.city}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-center">
                          <span className="rounded-full bg-[var(--brand-tint)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-hover)]">{money(company.value)}</span>
                          <span className="text-xs font-semibold text-[var(--text-muted)]">{expanded ? "Cerrar" : "Abrir"}</span>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-[var(--border)] px-3 pb-3 pt-3">
                          <div className="grid gap-3">
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Proxima accion</p>
                              <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--text)]">{company.next}</p>
                            </div>

                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Estado</p>
                              <Select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value)}>
                                {CLIENT_STATUSES.map((option) => <option key={option}>{option}</option>)}
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[12px]">
                              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                                <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">CUIT</p>
                                <p className="mt-1 truncate font-semibold text-[var(--text)]">{details.taxId || "-"}</p>
                              </div>
                              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                                <p className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">Direccion</p>
                                <p className="mt-1 truncate font-semibold text-[var(--text)]">{details.address || "-"}</p>
                              </div>
                            </div>
                            {(details.websites.length > 0 || details.socialNetworks.length > 0) && (
                              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-semibold text-[var(--text-muted)]">
                                <p className="truncate">{details.websites[0] || details.socialNetworks[0]}</p>
                                {(details.websites.length + details.socialNetworks.length) > 1 && <p className="mt-1 text-[11px] text-[var(--text-muted)]">+{details.websites.length + details.socialNetworks.length - 1} enlaces</p>}
                              </div>
                            )}

                            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Contacto principal</p>
                                  <p className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{primary.name} <span className="font-medium text-[var(--text-muted)]">/{primary.role}</span></p>
                                  <p className="truncate text-xs font-medium text-[var(--text-muted)]">{primary.phone}{primary.email ? ` - ${primary.email}` : ""}</p>
                                </div>
                                {contacts.length > 1 && <Badge tone="blue">+{contacts.length - 1}</Badge>}
                              </div>
                            </div>

                            {editingContacts && (
                              <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                <div className="grid gap-1">
                                  {contacts.map((contact, index) => (
                                    <div key={`${contact.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs">
                                      <span className="min-w-0 truncate font-semibold text-[var(--text)]">{contact.name} / {contact.role} - {contact.phone}{contact.email ? ` - ${contact.email}` : ""}</span>
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

                            <div className="grid gap-2">
                              <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setContactEditor(editingContacts ? null : company.id)}>Contactos</Button>
                                <Button variant="ghost" onClick={() => openEditor("clientes", company)}>Editar</Button>
                              </div>
                              <Button variant="danger" onClick={() => removeRecord("companies", company.id)}>Borrar</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
                {cards.length === 0 && <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm font-medium text-[var(--text-muted)]">Sin clientes</p>}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
