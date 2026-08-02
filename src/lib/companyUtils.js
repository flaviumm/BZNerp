export function companyContacts(company) {
  if (Array.isArray(company.contacts) && company.contacts.length) {
    return company.contacts.map((contact) => ({
      name: contact.name || "Sin nombre",
      role: contact.role || "Contacto",
      phone: contact.phone || "-",
      email: contact.email || "",
      phones: Array.isArray(contact.phones) ? contact.phones : [],
      emails: Array.isArray(contact.emails) ? contact.emails : [],
      companyDetails: contact.companyDetails || null,
    }));
  }

  return [{
    name: company.contact || "Sin asignar",
    role: "Principal",
    phone: company.phone || "-",
    email: "",
    phones: [],
    emails: [],
    companyDetails: null,
  }];
}

export function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function joinList(value) {
  return splitList(value).join("\n");
}

export function firstFilled(list, fallback = "") {
  return list.find((item) => String(item || "").trim()) || fallback;
}

export function companyDetails(company = {}) {
  const primary = companyContacts(company)[0] || {};
  return {
    taxId: company.taxId || primary.companyDetails?.taxId || "",
    clientCategory: company.clientCategory || primary.companyDetails?.clientCategory || "",
    address: company.address || primary.companyDetails?.address || "",
    locality: company.locality || primary.companyDetails?.locality || company.city || "",
    websites: company.websites || primary.companyDetails?.websites || [],
    socialNetworks: company.socialNetworks || primary.companyDetails?.socialNetworks || [],
    clients: company.clients || primary.companyDetails?.clients || "",
    notes: company.notes || primary.companyDetails?.notes || "",
  };
}

export function companySearchText(company) {
  const details = companyDetails(company);
  const contacts = companyContacts(company).map((contact) => `${contact.name} ${contact.role} ${contact.phone} ${contact.email} ${joinList(contact.phones)} ${joinList(contact.emails)}`).join(" ");
  return [
    company.name,
    company.city,
    company.type,
    company.contact,
    contacts,
    details.taxId,
    details.clientCategory,
    details.address,
    details.locality,
    joinList(details.websites),
    joinList(details.socialNetworks),
    details.clients,
  ].join(" ");
}

export function initialCompanyForm(record = null) {
  const details = companyDetails(record || {});
  const primary = companyContacts(record || {})[0] || {};
  return {
    name: record?.name || "",
    taxId: details.taxId,
    type: record?.type || "",
    clientCategory: details.clientCategory,
    contact: primary.name && primary.name !== "Sin asignar" ? primary.name : record?.contact || "",
    role: primary.role && primary.role !== "Principal" ? primary.role : "",
    phones: joinList(primary.phones?.length ? primary.phones : [primary.phone || record?.phone].filter(Boolean)),
    emails: joinList(primary.emails?.length ? primary.emails : [primary.email].filter(Boolean)),
    address: details.address,
    locality: details.locality || record?.city || "",
    websites: joinList(details.websites),
    socialNetworks: joinList(details.socialNetworks),
    clients: details.clients,
    status: record?.status || "Prospecto",
    next: record?.next || "Primer contacto",
    value: record?.value || "",
    notes: details.notes,
  };
}

export function companyRecordFromForm(form, previous = {}) {
  const phones = splitList(form.phones);
  const emails = splitList(form.emails);
  const details = {
    taxId: form.taxId.trim(),
    clientCategory: form.clientCategory.trim(),
    address: form.address.trim(),
    locality: form.locality.trim(),
    websites: splitList(form.websites),
    socialNetworks: splitList(form.socialNetworks),
    clients: form.clients.trim(),
    notes: form.notes.trim(),
  };
  const primary = {
    name: form.contact.trim() || "Sin asignar",
    role: form.role.trim() || "Principal",
    phone: firstFilled(phones, "-"),
    email: firstFilled(emails, ""),
    phones,
    emails,
    companyDetails: details,
  };

  return {
    ...previous,
    id: previous.id || Date.now(),
    name: form.name.trim(),
    taxId: details.taxId,
    type: form.type.trim() || "General",
    clientCategory: details.clientCategory,
    city: details.locality || "Sin localidad",
    address: details.address,
    locality: details.locality,
    websites: details.websites,
    socialNetworks: details.socialNetworks,
    clients: details.clients,
    notes: details.notes,
    status: form.status || "Prospecto",
    contact: primary.name,
    phone: primary.phone,
    contacts: [primary, ...companyContacts(previous).slice(1)],
    next: form.next.trim() || "Primer contacto",
    value: Number(form.value || 0),
  };
}
