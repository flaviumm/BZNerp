import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import CaptadorLeads from "./src/components/CaptadorLeads";
import { deleteErpRecord, isDatabaseConfigured, loadErpData, logAuditEvent, nextDocumentNumber, saveErpRecord, shouldBlockUnconfiguredDatabase, updateErpRecord, uploadDocumentFile } from "./src/lib/erpRepository";
import { createOrganization, createUserAccount, getCurrentProfile, getInitialSession, listenAuthChanges, listOrganizations, listUserProfiles, signInWithEmail, signOutUser, signUpWithEmail, updateUserProfile } from "./src/lib/authRepository";
import { laborRates, materialPriceCatalog, quoteParameters } from "./src/lib/pricingData";
import { initialCompanies, initialOpportunities, initialQuotes, initialWorkOrders, inventory, purchases, invoices, employees, tasks, initialDocuments, initialAuditLog, localDatabaseKey } from "./src/lib/demoData";
import { screens, menuSections, userRoles, accountStatuses, canAccessScreen, screensForRole } from "./src/lib/navigation";
import { money, pct, clamp, sum, quoteLineTotal, catalogPrice, htmlEscape, openQuotePdfWindow, generateQuotePdf, withTimeout, weightedPipeline, nextLocalNumber, normalizeKey, worksheetToRows, addDaysIso, isValidDateValue, formatDate, formatDateTime, normalizeLeadRow, toneForStatus } from "./src/lib/utils";
import { companyContacts, companyDetails, companySearchText, initialCompanyForm, companyRecordFromForm } from "./src/lib/companyUtils";
import { Button, Badge, Panel, Field, TextInput, Select, TextArea, Header, Sidebar, MobileNav, StatCard, SectionTitle, Progress, DataTable, SearchBar, CleanBarList, DashboardLineChart, DashboardRadialChart, DashboardStackChart, ProgressRing, GlobalStyles } from "./src/components/ui";
import { Dashboard } from "./src/components/screens/Dashboard";
import { ClientesCards } from "./src/components/screens/Clientes";
import { ImportarLeads } from "./src/components/screens/ImportarLeads";
import { CRMCanvas } from "./src/components/screens/CRM";
import { Presupuestos } from "./src/components/screens/Presupuestos";
import { Cotizador } from "./src/components/screens/Cotizador";
import { OrdenesTrabajo, Inventario, Compras, Finanzas, RRHH, Tareas } from "./src/components/screens/Operacion";
import { Calendario } from "./src/components/screens/Calendario";
import { Documentos } from "./src/components/screens/Documentos";
import { Auditoria } from "./src/components/screens/Auditoria";
import { Usuarios } from "./src/components/screens/Usuarios";
import { Organizaciones } from "./src/components/screens/Organizaciones";
import { Reportes } from "./src/components/screens/Reportes";
import { NewRecordModal, EditRecordModal } from "./src/components/screens/modals";
import { LoginScreen, AccountStatusScreen, DatabaseSetupScreen } from "./src/components/screens/auth";
import { ProcesoVentas } from "./src/components/screens/ProcesoVentas";



function runTests() {
  const pipelineTotal = sum(initialOpportunities, "amount");
  const stockAlerts = inventory.filter((item) => item.stock <= item.min);
  console.assert(initialCompanies.length >= 5, "Debe haber al menos 5 clientes demo");
  console.assert(pipelineTotal === 47300000, "El pipeline demo debe sumar 47.300.000");
  console.assert(weightedPipeline(initialOpportunities) === 25415000, "El pipeline ponderado debe ser 25.415.000");
  console.assert(stockAlerts.length === 2, "Debe detectar 2 alertas de stock");
  console.assert(screens.length >= 10, "Debe incluir los modulos centrales del ERP");
  console.assert(money(1000).includes("1.000") || money(1000).includes("1000"), "Debe formatear moneda ARS");
}

try {
  runTests();
} catch (error) {
  console.warn("Tests del ERP demo no ejecutados:", error);
}


export default function MiniErpBizonPrototype() {
  const useLocalDemo = !isDatabaseConfigured && !shouldBlockUnconfiguredDatabase;
  const [active, setActive] = useState("dashboard");
  const [session, setSession] = useState(isDatabaseConfigured ? null : useLocalDemo ? { user: { id: "demo" } } : null);
  const [profile, setProfile] = useState(isDatabaseConfigured ? null : useLocalDemo ? { id: "demo", fullName: "Modo demo", role: "admin", status: "active", menuKeys: null } : null);
  const [authLoading, setAuthLoading] = useState(isDatabaseConfigured);
  const [companies, setCompanies] = useState(initialCompanies);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [inventoryItems, setInventoryItems] = useState(inventory);
  const [purchaseOrders, setPurchaseOrders] = useState(purchases);
  const [customerInvoices, setCustomerInvoices] = useState(invoices);
  const [staff, setStaff] = useState(employees);
  const [taskList, setTaskList] = useState(tasks);
  const [documents, setDocuments] = useState(initialDocuments);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [userProfiles, setUserProfiles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsError, setOrganizationsError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [localDatabaseReady, setLocalDatabaseReady] = useState(isDatabaseConfigured || shouldBlockUnconfiguredDatabase);
  const [databaseStatus, setDatabaseStatus] = useState(isDatabaseConfigured ? "Conectando..." : useLocalDemo ? "Base local" : "Configurar Supabase");

  useEffect(() => {
    let cancelled = false;

    async function bootAuth() {
      if (!isDatabaseConfigured) return;

      try {
        const initialSession = await withTimeout(getInitialSession(), 8000, "La validacion de sesion");
        if (cancelled) return;
        setSession(initialSession);
        if (initialSession) {
          const currentProfile = await withTimeout(getCurrentProfile(initialSession.user?.id), 8000, "La carga del perfil");
          if (!cancelled) setProfile(currentProfile);
        }
      } catch (error) {
        console.error("No se pudo iniciar autenticacion:", error);
        setDatabaseStatus("Error de base");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    bootAuth();
    const stopListening = listenAuthChanges((nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        return;
      }
      // Diferir fuera del callback: Supabase mantiene un lock de auth mientras
      // dispara onAuthStateChange y llamar getCurrentProfile() (que usa la auth)
      // de forma sincronica produce un deadlock que termina cerrando la sesion.
      setTimeout(async () => {
        if (cancelled) return;
        try {
          const currentProfile = await withTimeout(getCurrentProfile(nextSession.user?.id), 8000, "La carga del perfil");
          if (!cancelled) setProfile(currentProfile);
        } catch (error) {
          console.error("No se pudo cargar el perfil:", error);
          if (!cancelled) setDatabaseStatus("Error de base");
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!useLocalDemo) return;

    try {
      const stored = window.localStorage.getItem(localDatabaseKey);
      if (stored) {
        const localData = JSON.parse(stored);
        setCompanies(localData.companies?.length ? localData.companies : initialCompanies);
        setOpportunities(localData.opportunities?.length ? localData.opportunities : initialOpportunities);
        setQuotes(localData.quotes?.length ? localData.quotes : initialQuotes);
        setWorkOrders(localData.workOrders?.length ? localData.workOrders : initialWorkOrders);
        setInventoryItems(localData.inventory?.length ? localData.inventory : inventory);
        setPurchaseOrders(localData.purchases?.length ? localData.purchases : purchases);
        setCustomerInvoices(localData.invoices?.length ? localData.invoices : invoices);
        setStaff(localData.employees?.length ? localData.employees : employees);
        setTaskList(localData.tasks?.length ? localData.tasks : tasks);
        setDocuments(localData.documents?.length ? localData.documents : initialDocuments);
        setAuditLog(localData.auditLog?.length ? localData.auditLog : initialAuditLog);
      }
      setDatabaseStatus("Base local");
    } catch (error) {
      console.error("No se pudo cargar la base local:", error);
      setDatabaseStatus("Base local reiniciada");
    } finally {
      setLocalDatabaseReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromDatabase() {
      if (!isDatabaseConfigured || !session || profile?.status !== "active") return;

      try {
        const remoteData = await loadErpData();
        if (cancelled || !remoteData) return;
        setCompanies(remoteData.companies.length ? remoteData.companies : initialCompanies);
        setOpportunities(remoteData.opportunities.length ? remoteData.opportunities : initialOpportunities);
        setQuotes(remoteData.quotes.length ? remoteData.quotes : initialQuotes);
        setWorkOrders(remoteData.workOrders.length ? remoteData.workOrders : initialWorkOrders);
        setInventoryItems(remoteData.inventory.length ? remoteData.inventory : inventory);
        setPurchaseOrders(remoteData.purchases.length ? remoteData.purchases : purchases);
        setCustomerInvoices(remoteData.invoices.length ? remoteData.invoices : invoices);
        setStaff(remoteData.employees.length ? remoteData.employees : employees);
        setTaskList(remoteData.tasks.length ? remoteData.tasks : tasks);
        setDocuments(remoteData.documents?.length ? remoteData.documents : initialDocuments);
        setAuditLog(remoteData.audit?.length ? remoteData.audit : initialAuditLog);
        setDatabaseStatus("Conectado a Supabase");
      } catch (error) {
        console.error("No se pudo cargar la base de datos:", error);
        setDatabaseStatus("Error de base");
      }
    }

    hydrateFromDatabase();
    return () => {
      cancelled = true;
    };
  }, [session, profile?.status]);

  async function refreshUserProfiles() {
    if (!isDatabaseConfigured || profile?.role !== "admin" || profile?.status !== "active") return;

    try {
      const users = await listUserProfiles();
      setUserProfiles(users);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudieron cargar usuarios:", error);
      setDatabaseStatus("Error de base");
    }
  }

  useEffect(() => {
    refreshUserProfiles();
  }, [session, profile?.role, profile?.status]);

  async function refreshOrganizations() {
    if (!isDatabaseConfigured || !profile?.isSuperAdmin || profile?.status !== "active") return;

    try {
      const orgs = await listOrganizations();
      setOrganizations(orgs);
      setOrganizationsError("");
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudieron cargar organizaciones:", error);
      setOrganizationsError(error.message || "No se pudieron cargar las organizaciones.");
    }
  }

  useEffect(() => {
    refreshOrganizations();
  }, [session, profile?.isSuperAdmin, profile?.status]);

  const data = useMemo(() => ({
    companies,
    opportunities,
    quotes,
    workOrders,
    inventory: inventoryItems,
    purchases: purchaseOrders,
    invoices: customerInvoices,
    employees: staff,
    tasks: taskList,
    documents,
    auditLog,
  }), [companies, opportunities, quotes, workOrders, inventoryItems, purchaseOrders, customerInvoices, staff, taskList, documents, auditLog]);

  useEffect(() => {
    if (!useLocalDemo || !localDatabaseReady) return;

    window.localStorage.setItem(localDatabaseKey, JSON.stringify(data));
  }, [data, localDatabaseReady]);

  const activeLabel = screens.find((item) => item.key === active)?.label || "Dashboard";
  const availableScreens = screens.filter((item) => canAccessScreen(item, profile || { role: "ventas", menuKeys: null }));
  const sidebarMenuSections = profile?.isSuperAdmin
    ? [...menuSections, { title: "Administracion", keys: ["organizaciones"] }]
    : menuSections;

  useEffect(() => {
    if (availableScreens.length && !availableScreens.some((item) => item.key === active)) {
      setActive(availableScreens[0].key);
    }
  }, [active, availableScreens]);

  useEffect(() => {
    if (availableScreens.length && !availableScreens.some((item) => item.key === active)) {
      setActive(availableScreens[0].key);
    }
  }, [active, availableScreens]);

  async function handleSignOut() {
    if (!isDatabaseConfigured) return;
    await signOutUser();
    setSession(null);
    setProfile(null);
  }

  function exportBackup() {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bizon-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetLocalDatabase() {
    if (!window.confirm("Reiniciar la base local y volver a los datos iniciales?")) return;

    window.localStorage.removeItem(localDatabaseKey);
    setCompanies(initialCompanies);
    setOpportunities(initialOpportunities);
    setQuotes(initialQuotes);
    setWorkOrders(initialWorkOrders);
    setInventoryItems(inventory);
    setPurchaseOrders(purchases);
    setCustomerInvoices(invoices);
    setStaff(employees);
    setTaskList(tasks);
    setDocuments(initialDocuments);
    setAuditLog(initialAuditLog);
    setDatabaseStatus("Base local");
  }

  function recordKeyFor(module, record, fallback = "-") {
    return String(record?.number || record?.id || record?.sku || record?.recordKey || fallback);
  }

  function audit(action, module, record, summary, metadata = {}) {
    const event = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      action,
      module,
      recordKey: recordKeyFor(module, record),
      summary,
      actorName: profile?.fullName || "Sistema",
      metadata,
      createdAt: new Date().toISOString(),
    };

    setAuditLog((items) => [event, ...items].slice(0, 500));
    if (isDatabaseConfigured) {
      logAuditEvent(event).catch((error) => {
        console.error("No se pudo registrar auditoria:", error);
      });
    }
  }

  async function persistRecord(module, record) {
    if (!isDatabaseConfigured) {
      audit("create", module, record, `Alta en ${module}`);
      return;
    }

    try {
      await saveErpRecord(module, record);
      audit("create", module, record, `Alta en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudo guardar el registro:", error);
      setDatabaseStatus("Error de base");
    }
  }

  async function persistUpdate(module, key, record) {
    if (!isDatabaseConfigured) {
      audit("update", module, record, `Actualizacion en ${module}`);
      return;
    }

    try {
      await updateErpRecord(module, key, record);
      audit("update", module, record, `Actualizacion en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudo actualizar el registro:", error);
      setDatabaseStatus("Error de base");
    }
  }

  async function persistUserProfile(id, patch) {
    if (!isDatabaseConfigured) return;

    const updated = await updateUserProfile(id, patch);
    setUserProfiles((items) => items.map((item) => item.id === id ? updated : item));
    if (id === profile?.id) {
      setProfile((current) => ({ ...current, ...updated }));
    }
    audit("update", "usuarios", { id }, `Actualizacion de usuario ${updated.fullName}`);
  }

  async function createManagedUser(payload) {
    if (!isDatabaseConfigured) return;

    const created = await createUserAccount(payload);
    setUserProfiles((items) => [created, ...items]);
    audit("create", "usuarios", { id: created.id }, `Alta de usuario ${created.fullName}`);
  }

  async function createOrganizationAccount(payload) {
    if (!isDatabaseConfigured) return;

    const result = await createOrganization(payload);
    const org = { id: result.organization.id, name: result.organization.name, createdAt: result.organization.created_at };
    setOrganizations((items) => [org, ...items]);
    audit("create", "organizaciones", { id: org.id }, `Alta de organizacion ${org.name}`);
  }

  async function persistDelete(module, key) {
    if (!isDatabaseConfigured) {
      audit("delete", module, { id: key }, `Borrado en ${module}`);
      return;
    }

    try {
      await deleteErpRecord(module, key);
      audit("delete", module, { id: key }, `Borrado en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudo borrar el registro:", error);
      setDatabaseStatus("Error de base");
    }
  }

  async function getDocumentNumber(counterCode, items, prefix, padding = 4) {
    if (!isDatabaseConfigured) return nextLocalNumber(items, prefix, padding);

    try {
      return await nextDocumentNumber(counterCode);
    } catch (error) {
      console.error("No se pudo generar numerador:", error);
      setDatabaseStatus("Error de base");
      return nextLocalNumber(items, prefix, padding);
    }
  }

  function openEditor(module, record) {
    setEditTarget({ module, record });
  }

  function saveEditedRecord(module, record) {
    if (module === "clientes") {
      setCompanies((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("companies", record.id, record);
    }
    if (module === "crm") {
      setOpportunities((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("opportunities", record.id, record);
    }
    if (module === "presupuestos") {
      setQuotes((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("quotes", record.number, record);
    }
    if (module === "ot") {
      setWorkOrders((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("workOrders", record.number, record);
    }
    if (module === "inventario") {
      setInventoryItems((items) => items.map((item) => item.sku === record.sku ? record : item));
      persistUpdate("inventory", record.sku, record);
    }
    if (module === "compras") {
      setPurchaseOrders((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("purchases", record.number, record);
    }
    if (module === "finanzas") {
      setCustomerInvoices((items) => items.map((item) => item.number === record.number ? record : item));
      persistUpdate("invoices", record.number, record);
    }
    if (module === "rrhh") {
      setStaff((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("employees", record.id, record);
    }
    if (module === "tareas") {
      setTaskList((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("tasks", record.id, record);
    }
    setEditTarget(null);
  }

  function removeRecord(module, key) {
    const labels = {
      companies: "cliente",
      opportunities: "oportunidad",
      quotes: "presupuesto",
      workOrders: "orden de trabajo",
      inventory: "item de inventario",
      purchases: "orden de compra",
      invoices: "factura",
      employees: "empleado",
      tasks: "tarea",
      documents: "documento",
    };

    if (!window.confirm(`Borrar ${labels[module] || "registro"}?`)) return;

    if (module === "companies") setCompanies((items) => items.filter((item) => item.id !== key));
    if (module === "opportunities") setOpportunities((items) => items.filter((item) => item.id !== key));
    if (module === "quotes") setQuotes((items) => items.filter((item) => item.number !== key));
    if (module === "workOrders") setWorkOrders((items) => items.filter((item) => item.number !== key));
    if (module === "inventory") setInventoryItems((items) => items.filter((item) => item.sku !== key));
    if (module === "purchases") setPurchaseOrders((items) => items.filter((item) => item.number !== key));
    if (module === "invoices") setCustomerInvoices((items) => items.filter((item) => item.number !== key));
    if (module === "employees") setStaff((items) => items.filter((item) => item.id !== key));
    if (module === "tasks") setTaskList((items) => items.filter((item) => item.id !== key));
    if (module === "documents") setDocuments((items) => items.filter((item) => item.id !== key));
    persistDelete(module, key);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadDocument(file, metadata) {
    const baseRecord = {
      id: Date.now(),
      kind: metadata.kind,
      relatedType: metadata.relatedType,
      relatedNumber: metadata.relatedNumber || "-",
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      notes: metadata.notes || "",
      createdAt: new Date().toISOString(),
    };

    if (isDatabaseConfigured) {
      const saved = await uploadDocumentFile(file, baseRecord, profile?.organizationId);
      const record = saved || baseRecord;
      setDocuments((items) => [...items, record]);
      audit("upload", "documents", record, `Documento cargado: ${record.name}`);
      return;
    }

    const url = await readFileAsDataUrl(file);
    const record = { ...baseRecord, storagePath: `local/${baseRecord.id}-${file.name}`, url };
    setDocuments((items) => [...items, record]);
    audit("upload", "documents", record, `Documento cargado: ${record.name}`);
  }

  function createCalendarEvent(event) {
    const record = {
      id: Date.now(),
      text: event.text,
      owner: event.owner || "General",
      priority: event.priority || "Media",
      due: event.due,
      eventType: event.eventType || "Evento",
      startTime: event.startTime || null,
      endTime: event.endTime || null,
      notes: event.notes || "",
    };
    setTaskList((items) => [...items, record]);
    persistRecord("tasks", record);
  }

  async function importLeads(leads, context = {}) {
    const now = Date.now();
    const companyMap = new Map(companies.map((company) => [normalizeKey(company.name), { ...company, contacts: companyContacts(company) }]));
    const opportunityKeys = new Set(opportunities.map((item) => `${normalizeKey(item.company)}|${normalizeKey(item.service)}`));
    const companyRecords = [];
    const opportunityRecords = [];
    let companiesCreated = 0;
    let companiesUpdated = 0;
    let contactsAdded = 0;
    let opportunitiesCreated = 0;

    leads.forEach((lead, index) => {
      const companyKey = normalizeKey(lead.company);
      if (!companyKey) return;

      const existing = companyMap.get(companyKey);
      const contacts = existing ? [...companyContacts(existing)] : [];
      lead.contacts.forEach((contact) => {
        const contactKey = `${normalizeKey(contact.email)}|${normalizeKey(contact.phone)}|${normalizeKey(contact.name)}`;
        const duplicate = contacts.some((item) => `${normalizeKey(item.email)}|${normalizeKey(item.phone)}|${normalizeKey(item.name)}` === contactKey);
        if (!duplicate) {
          contacts.push(contact);
          contactsAdded += 1;
        }
      });

      const primary = contacts[0] || lead.contacts[0] || { name: "Sin asignar", phone: "-", email: "" };
      const companyRecord = {
        ...(existing || {}),
        id: existing?.id || now + index,
        name: lead.company,
        type: lead.segment || existing?.type || "Lead comercial",
        city: lead.city || existing?.city || "Sin localidad",
        status: existing?.status || "Prospecto",
        contact: primary.name,
        phone: primary.phone,
        contacts,
        next: lead.next,
        value: existing?.value || 0,
        leadSource: context.source || lead.sources || "Carga masiva",
        leadScore: lead.score,
        notes: [lead.reason, lead.indicators, lead.sources].filter(Boolean).join(" | "),
      };

      companyMap.set(companyKey, companyRecord);
      companyRecords.push({ record: companyRecord, exists: !!existing });
      if (existing) companiesUpdated += 1;
      else companiesCreated += 1;

      const service = lead.service || "Oportunidad comercial";
      const opportunityKey = `${companyKey}|${normalizeKey(service)}`;
      if (!opportunityKeys.has(opportunityKey)) {
        const opportunity = {
          id: now + 10000 + index,
          company: lead.company,
          service,
          stage: "Nuevo prospecto",
          amount: 0,
          probability: lead.probability,
          owner: lead.owner,
          due: lead.due,
          priority: lead.priority,
          score: lead.score,
          source: context.source || lead.sources || "Carga masiva",
          next: lead.next,
          notes: [lead.reason, lead.indicators].filter(Boolean).join(" | "),
        };
        opportunityRecords.push(opportunity);
        opportunityKeys.add(opportunityKey);
        opportunitiesCreated += 1;
      }
    });

    const mergedCompanies = [...companyMap.values()];
    setCompanies(mergedCompanies);
    if (opportunityRecords.length) setOpportunities((items) => [...items, ...opportunityRecords]);

    for (const item of companyRecords) {
      if (item.exists) await persistUpdate("companies", item.record.id, item.record);
      else await persistRecord("companies", item.record);
    }
    for (const opportunity of opportunityRecords) {
      await persistRecord("opportunities", opportunity);
    }

    audit("import", "opportunities", { recordKey: context.fileName || "leads" }, `Carga masiva de ${leads.length} leads desde ${context.fileName || "Excel"}`, context);
    return { companiesCreated, companiesUpdated, contactsAdded, opportunitiesCreated };
  }

  async function createRecord(module, form) {
    const amount = Number(form.amount || 0);
    if (module === "clientes") {
      const record = companyRecordFromForm(form);
      setCompanies((items) => [...items, record]);
      persistRecord("companies", record);
      return;
    }
    if (module === "crm") {
      const record = { id: Date.now(), company: form.name, service: form.detail, stage: "Nuevo prospecto", amount, probability: 20, owner: "Ventas", due: "2026-05-15" };
      setOpportunities((items) => [...items, record]);
      persistRecord("opportunities", record);
      return;
    }
    if (module === "presupuestos") {
      const subtotal = Math.round(amount / 1.21);
      const number = await getDocumentNumber("quote", quotes, "P", 4);
      const record = { number, client: form.name, service: form.detail, subtotal, tax: amount - subtotal, total: amount, status: "Borrador", validUntil: "2026-05-30" };
      setQuotes((items) => [...items, record]);
      persistRecord("quotes", record);
      return;
    }
    if (module === "ot") {
      const number = await getDocumentNumber("work_order", workOrders, "OT", 4);
      const record = { number, client: form.name, service: form.detail, status: "Pendiente", progress: 0, margin: 30, start: "2026-05-15", end: "2026-05-30", team: "Sin asignar" };
      setWorkOrders((items) => [...items, record]);
      persistRecord("workOrders", record);
      return;
    }
    if (module === "inventario") {
      const record = { sku: `MAT-${String(inventoryItems.length + 1).padStart(3, "0")}`, name: form.name, category: form.detail || "General", stock: Number(form.amount || 0), min: 5, unit: "unidades", cost: 0 };
      setInventoryItems((items) => [...items, record]);
      persistRecord("inventory", record);
      return;
    }
    if (module === "compras") {
      const number = await getDocumentNumber("purchase_order", purchaseOrders, "OC", 4);
      const record = { number, supplier: form.name, area: form.detail || "General", total: amount, status: "Pendiente", due: "2026-05-20" };
      setPurchaseOrders((items) => [...items, record]);
      persistRecord("purchases", record);
      return;
    }
    if (module === "finanzas") {
      const number = await getDocumentNumber("invoice", customerInvoices, "F", 5);
      const record = { number, client: form.name, concept: form.detail, total: amount, status: "Pendiente", due: "2026-05-20" };
      setCustomerInvoices((items) => [...items, record]);
      persistRecord("invoices", record);
      return;
    }
    if (module === "rrhh") {
      const record = { id: Date.now(), name: form.name, role: form.detail || "Sin rol", team: "Sin asignar", status: "Disponible", hours: Number(form.amount || 0) };
      setStaff((items) => [...items, record]);
      persistRecord("employees", record);
      return;
    }
    const record = { id: Date.now(), text: form.detail || form.name, owner: form.name || "General", priority: amount > 0 ? "Alta" : "Media", due: "2026-05-20" };
    setTaskList((items) => [...items, record]);
    persistRecord("tasks", record);
  }

  const screenProps = { data, setActive, companies, setCompanies, opportunities, setOpportunities, quotes, setQuotes, workOrders, setWorkOrders, persistRecord, persistUpdate, getDocumentNumber, openEditor, removeRecord, uploadDocument, createCalendarEvent, userProfiles, currentProfile: profile, onCreateUserProfile: createManagedUser, onUpdateUserProfile: persistUserProfile, onRefreshUsers: refreshUserProfiles, onImportLeads: importLeads, onNewRecord: () => setModalOpen(true), organizations, organizationsError, onCreateOrganization: createOrganizationAccount, onRefreshOrganizations: refreshOrganizations };
  const Screen = {
    dashboard: <Dashboard {...screenProps} />,
    clientes: <ClientesCards {...screenProps} />,
    crm: <CRMCanvas {...screenProps} />,
    importar: <ImportarLeads {...screenProps} />,
    captador_leads: <CaptadorLeads {...screenProps} />, 
    presupuestos: <Presupuestos {...screenProps} />,
    cotizador: <Cotizador {...screenProps} />,
    ventas: <ProcesoVentas />,
    ot: <OrdenesTrabajo {...screenProps} />,
    inventario: <Inventario {...screenProps} inventory={data.inventory} />,
    compras: <Compras {...screenProps} purchases={data.purchases} />,
    finanzas: <Finanzas {...screenProps} invoices={data.invoices} />,
    rrhh: <RRHH {...screenProps} employees={data.employees} />,
    tareas: <Tareas {...screenProps} />,
    calendario: <Calendario {...screenProps} />,
    documentos: <Documentos {...screenProps} />,
    auditoria: <Auditoria {...screenProps} />,
    usuarios: <Usuarios {...screenProps} />,
    organizaciones: <Organizaciones {...screenProps} />,
    reportes: <Reportes {...screenProps} />,
  }[active] || <Dashboard {...screenProps} />;

  if (shouldBlockUnconfiguredDatabase) {
    return <DatabaseSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--surface-alt)] p-4">
        <Panel className="p-5 text-center">
          <p className="font-semibold text-zinc-950">Cargando acceso...</p>
          <p className="mt-1 text-sm text-zinc-500">Validando sesion y permisos.</p>
        </Panel>
      </div>
    );
  }

  if (isDatabaseConfigured && !session) {
    return <LoginScreen onSessionReady={setSession} />;
  }

  if (isDatabaseConfigured && profile && profile.status !== "active") {
    return <AccountStatusScreen profile={profile} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-zinc-900">
      <GlobalStyles />
      <div className="flex">
        <Sidebar
          active={active}
          setActive={setActive}
          availableScreens={availableScreens}
          menuSections={sidebarMenuSections}
          databaseStatus={databaseStatus}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onExportBackup={exportBackup}
          onResetLocal={useLocalDemo ? resetLocalDatabase : null}
          onSignOut={isDatabaseConfigured ? handleSignOut : null}
          onNew={["usuarios", "organizaciones"].includes(active) ? null : () => setModalOpen(true)}
        />
        <main className="min-h-screen flex-1">
          <Header
            activeLabel={activeLabel}
            databaseStatus={databaseStatus}
            profile={profile}
          />
          <MobileNav active={active} setActive={setActive} availableScreens={availableScreens} />
          {Screen}
        </main>
      </div>
      {modalOpen && <NewRecordModal active={active} data={data} onClose={() => setModalOpen(false)} onCreate={createRecord} />}
      {editTarget && <EditRecordModal editTarget={editTarget} onClose={() => setEditTarget(null)} onSave={saveEditedRecord} />}
    </div>
  );
}
