import React, { useEffect, useMemo, useState } from "react";
import { deleteErpRecord, isDatabaseConfigured, loadErpData, logAuditEvent, nextDocumentNumber, saveErpRecord, shouldBlockUnconfiguredDatabase, updateErpRecord, uploadDocumentFile } from "./src/lib/erpRepository";
import { createOrganization, createUserAccount, getCurrentProfile, getInitialSession, getOrganization, listenAuthChanges, listOrganizations, listUserProfiles, signOutUser, updateOrganization, updateUserProfile } from "./src/lib/authRepository";
import { applyBrandTheme, applyColorScheme, getInitialTheme, persistTheme } from "./src/lib/theme";
import { initialCompanies, initialOpportunities, initialQuotes, initialWorkOrders, tasks, initialDocuments, initialAuditLog, localDatabaseKey } from "./src/lib/demoData";
import { screens, menuSections, creatableScreens, canAccessScreen } from "./src/lib/navigation";
import { money, sum, withTimeout, weightedPipeline, nextLocalNumber, normalizeKey, addDaysIso } from "./src/lib/utils";
import { companyContacts, companyRecordFromForm } from "./src/lib/companyUtils";
import { Panel, Header, Sidebar, MobileNav, GlobalStyles } from "./src/components/ui";
import { Dashboard } from "./src/components/screens/Dashboard";
import { ClientesCards } from "./src/components/screens/Clientes";
import { ImportarLeads } from "./src/components/screens/ImportarLeads";
import { CRMCanvas } from "./src/components/screens/CRM";
import { Presupuestos } from "./src/components/screens/Presupuestos";
import { Cotizador } from "./src/components/screens/Cotizador";
import { OrdenesTrabajo, Tareas } from "./src/components/screens/Operacion";
import { Calendario } from "./src/components/screens/Calendario";
import { Documentos } from "./src/components/screens/Documentos";
import { Auditoria } from "./src/components/screens/Auditoria";
import { Usuarios } from "./src/components/screens/Usuarios";
import { Organizaciones } from "./src/components/screens/Organizaciones";
import { Configuracion } from "./src/components/screens/Configuracion";
import { Reportes } from "./src/components/screens/Reportes";
import { NewRecordModal, EditRecordModal } from "./src/components/screens/modals";
import { LoginScreen, NewPasswordScreen, AccountStatusScreen, DatabaseSetupScreen } from "./src/components/screens/auth";
import { ProcesoVentas } from "./src/components/screens/ProcesoVentas";



function runTests() {
  const pipelineTotal = sum(initialOpportunities, "amount");
  console.assert(initialCompanies.length >= 5, "Debe haber al menos 5 clientes demo");
  console.assert(pipelineTotal === 47300000, "El pipeline demo debe sumar 47.300.000");
  console.assert(weightedPipeline(initialOpportunities) === 25415000, "El pipeline ponderado debe ser 25.415.000");
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
  const [theme, setTheme] = useState(getInitialTheme);
  const [active, setActive] = useState("dashboard");
  const [session, setSession] = useState(isDatabaseConfigured ? null : useLocalDemo ? { user: { id: "demo" } } : null);
  const [profile, setProfile] = useState(isDatabaseConfigured ? null : useLocalDemo ? { id: "demo", fullName: "Modo demo", role: "admin", status: "active", menuKeys: null } : null);
  const [authLoading, setAuthLoading] = useState(isDatabaseConfigured);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  // Con base real el estado arranca vacio: los datos demo son solo para el modo local.
  const seed = (demoRows) => (isDatabaseConfigured ? [] : demoRows);
  const [companies, setCompanies] = useState(() => seed(initialCompanies));
  const [opportunities, setOpportunities] = useState(() => seed(initialOpportunities));
  const [quotes, setQuotes] = useState(() => seed(initialQuotes));
  const [workOrders, setWorkOrders] = useState(() => seed(initialWorkOrders));
  const [taskList, setTaskList] = useState(() => seed(tasks));
  const [documents, setDocuments] = useState(() => seed(initialDocuments));
  const [auditLog, setAuditLog] = useState(() => seed(initialAuditLog));
  const [userProfiles, setUserProfiles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsError, setOrganizationsError] = useState("");
  const [organization, setOrganization] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null); // presupuesto abierto en el cotizador (null = nuevo)
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
    const stopListening = listenAuthChanges((nextSession, event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveringPassword(true);
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
        // Nunca rellenar con demo: una organizacion nueva vacia veria clientes
        // y presupuestos falsos de Bizon.
        setCompanies(remoteData.companies || []);
        setOpportunities(remoteData.opportunities || []);
        setQuotes(remoteData.quotes || []);
        setWorkOrders(remoteData.workOrders || []);
        setTaskList(remoteData.tasks || []);
        setDocuments(remoteData.documents || []);
        setAuditLog(remoteData.audit || []);
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

  useEffect(() => {
    applyColorScheme(theme);
    persistTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    let cancelled = false;
    const organizationId = profile?.organizationId;
    const isDark = theme === "dark";

    if (!organizationId) {
      setOrganization(null);
      applyBrandTheme(null, isDark);
      return undefined;
    }

    getOrganization(organizationId)
      .then((org) => {
        if (cancelled) return;
        setOrganization(org);
        applyBrandTheme(org?.primaryColor, isDark);
      })
      .catch((error) => {
        console.error("No se pudo cargar la organizacion:", error);
        if (cancelled) return;
        setOrganization(null);
        applyBrandTheme(null, isDark);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.organizationId, theme]);

  async function saveOrganizationSettings(patch, organizationId = organization?.id) {
    let saved;
    if (isDatabaseConfigured) {
      if (!organizationId) throw new Error("No se pudo cargar tu organizacion; recarga la pagina e intenta de nuevo.");
      saved = await updateOrganization(organizationId, patch);
    } else {
      saved = { ...(organization || { id: null, name: "Bizon", primaryColor: "#ff7900", logoDataUrl: null }), ...patch };
    }
    // El super admin puede editar otra organizacion: no pisar la propia marca en ese caso.
    if (!isDatabaseConfigured || organizationId === organization?.id) {
      setOrganization(saved);
      applyBrandTheme(saved.primaryColor, theme === "dark");
    }
    return saved;
  }

  const data = useMemo(() => ({
    companies,
    opportunities,
    quotes,
    workOrders,
    tasks: taskList,
    documents,
    auditLog,
  }), [companies, opportunities, quotes, workOrders, taskList, documents, auditLog]);

  useEffect(() => {
    if (!useLocalDemo || !localDatabaseReady) return;

    window.localStorage.setItem(localDatabaseKey, JSON.stringify(data));
  }, [data, localDatabaseReady]);

  const activeLabel = screens.find((item) => item.key === active)?.label || "Dashboard";
  const availableScreens = screens.filter((item) => canAccessScreen(item, profile || { role: "ventas", menuKeys: null }));
  const adminKeys = [profile?.isSuperAdmin ? "organizaciones" : null, profile?.role === "admin" ? "configuracion" : null].filter(Boolean);
  const sidebarMenuSections = adminKeys.length
    ? [...menuSections, { title: "Administracion", keys: adminKeys }]
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

  // Devuelve el registro tal como quedo guardado (con el id real de la base) o
  // null si fallo. Los llamadores deben usar lo devuelto para el estado local:
  // con un id inventado las ediciones y borrados posteriores no llegan a la base.
  async function persistRecord(module, record) {
    if (!isDatabaseConfigured) {
      audit("create", module, record, `Alta en ${module}`);
      return record;
    }

    try {
      const saved = (await saveErpRecord(module, record)) || record;
      audit("create", module, saved, `Alta en ${module}`);
      setDatabaseStatus("Conectado a Supabase");
      return saved;
    } catch (error) {
      console.error("No se pudo guardar el registro:", error);
      setDatabaseStatus("Error de base");
      return null;
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

  function openCotizador(quote = null) {
    setEditingQuote(quote);
    setActive("cotizador");
  }

  useEffect(() => {
    if (active !== "cotizador") setEditingQuote(null);
  }, [active]);

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
    if (module === "tareas") {
      setTaskList((items) => items.map((item) => item.id === record.id ? record : item));
      persistUpdate("tasks", record.id, record);
    }
    setEditTarget(null);
  }

  function removeRecord(module, key, options = {}) {
    const labels = {
      companies: "cliente",
      opportunities: "oportunidad",
      quotes: "presupuesto",
      workOrders: "orden de trabajo",
      tasks: "tarea",
      documents: "documento",
    };

    if (!options.silent && !window.confirm(`Borrar ${labels[module] || "registro"}?`)) return;

    if (module === "companies") setCompanies((items) => items.filter((item) => item.id !== key));
    if (module === "opportunities") setOpportunities((items) => items.filter((item) => item.id !== key));
    if (module === "quotes") setQuotes((items) => items.filter((item) => item.number !== key));
    if (module === "workOrders") setWorkOrders((items) => items.filter((item) => item.number !== key));
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

  async function createCalendarEvent(event) {
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
    const saved = (await persistRecord("tasks", record)) || record;
    setTaskList((items) => [...items, saved]);
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

    for (const item of companyRecords) {
      let saved = item.record;
      if (item.exists) await persistUpdate("companies", item.record.id, item.record);
      else saved = (await persistRecord("companies", item.record)) || item.record;
      companyMap.set(normalizeKey(saved.name), saved);
    }
    setCompanies([...companyMap.values()]);

    const savedOpportunities = [];
    for (const opportunity of opportunityRecords) {
      savedOpportunities.push((await persistRecord("opportunities", opportunity)) || opportunity);
    }
    if (savedOpportunities.length) setOpportunities((items) => [...items, ...savedOpportunities]);

    audit("import", "opportunities", { recordKey: context.fileName || "leads" }, `Carga masiva de ${leads.length} leads desde ${context.fileName || "Excel"}`, context);
    return { companiesCreated, companiesUpdated, contactsAdded, opportunitiesCreated };
  }

  // Alta rapida desde NewRecordModal. Los campos vienen de createFields en modals.jsx.
  async function createRecord(module, form) {
    const builders = {
      clientes: () => ["companies", companyRecordFromForm(form)],
      crm: () => ["opportunities", { id: Date.now(), company: form.name, service: form.detail, stage: "Nuevo prospecto", amount: Number(form.amount || 0), probability: 20, owner: profile?.fullName || "Ventas", due: addDaysIso(30) }],
      ot: async () => ["workOrders", {
        number: await getDocumentNumber("work_order", workOrders, "OT", 4),
        client: form.client,
        service: form.service,
        status: "Pendiente",
        progress: 0,
        margin: Number(form.margin || 30),
        start: form.start || null,
        end: form.end || null,
        team: form.team || "Sin asignar",
      }],
      tareas: () => ["tasks", { id: Date.now(), text: form.text, owner: form.owner || profile?.fullName || "General", priority: form.priority || "Media", due: form.due || null, eventType: "Tarea", notes: form.notes || "" }],
    };
    const setters = { companies: setCompanies, opportunities: setOpportunities, workOrders: setWorkOrders, tasks: setTaskList };
    if (!builders[module]) return;

    const [key, record] = await builders[module]();
    const saved = await persistRecord(key, record);
    if (!saved) throw new Error("No se pudo guardar. Revisa la conexion e intenta de nuevo.");
    setters[key]((items) => [...items, saved]);
  }

  const screenProps = { data, setActive, companies, setCompanies, opportunities, setOpportunities, quotes, setQuotes, workOrders, setWorkOrders, persistRecord, persistUpdate, getDocumentNumber, openEditor, openCotizador, removeRecord, uploadDocument, createCalendarEvent, userProfiles, currentProfile: profile, onCreateUserProfile: createManagedUser, onUpdateUserProfile: persistUserProfile, onRefreshUsers: refreshUserProfiles, onImportLeads: importLeads, onNewRecord: () => setModalOpen(true), organizations, organizationsError, onCreateOrganization: createOrganizationAccount, onRefreshOrganizations: refreshOrganizations, organization, onUpdateOrganization: saveOrganizationSettings };
  const Screen = {
    dashboard: <Dashboard {...screenProps} />,
    clientes: <ClientesCards {...screenProps} />,
    crm: <CRMCanvas {...screenProps} />,
    importar: <ImportarLeads {...screenProps} />,
    presupuestos: <Presupuestos {...screenProps} />,
    cotizador: <Cotizador {...screenProps} editingQuote={editingQuote} />,
    ventas: <ProcesoVentas />,
    ot: <OrdenesTrabajo {...screenProps} />,
    tareas: <Tareas {...screenProps} />,
    calendario: <Calendario {...screenProps} />,
    documentos: <Documentos {...screenProps} />,
    auditoria: <Auditoria {...screenProps} />,
    usuarios: <Usuarios {...screenProps} />,
    organizaciones: <Organizaciones {...screenProps} />,
    configuracion: <Configuracion {...screenProps} />,
    reportes: <Reportes {...screenProps} />,
  }[active] || <Dashboard {...screenProps} />;

  if (shouldBlockUnconfiguredDatabase) {
    return <DatabaseSetupScreen />;
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--surface-alt)] p-4">
        <Panel className="p-5 text-center">
          <p className="font-semibold text-[var(--text)]">Cargando acceso...</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Validando sesion y permisos.</p>
        </Panel>
      </div>
    );
  }

  if (isDatabaseConfigured && !session) {
    return <LoginScreen onSessionReady={setSession} />;
  }

  if (recoveringPassword) {
    return <NewPasswordScreen onDone={() => setRecoveringPassword(false)} />;
  }

  if (isDatabaseConfigured && profile && profile.status !== "active") {
    return <AccountStatusScreen profile={profile} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-alt)] text-[var(--text)]">
      <GlobalStyles />
      <div className="flex">
        <Sidebar
          active={active}
          setActive={setActive}
          availableScreens={availableScreens}
          menuSections={sidebarMenuSections}
          organization={organization}
          databaseStatus={databaseStatus}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onExportBackup={exportBackup}
          onResetLocal={useLocalDemo ? resetLocalDatabase : null}
          onSignOut={isDatabaseConfigured ? handleSignOut : null}
          onNew={active === "presupuestos" ? () => openCotizador() : creatableScreens.has(active) ? () => setModalOpen(true) : null}
        />
        <main className="min-h-screen min-w-0 flex-1">
          <Header
            activeLabel={activeLabel}
            databaseStatus={databaseStatus}
            profile={profile}
            organization={organization}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <MobileNav active={active} setActive={setActive} availableScreens={availableScreens} />
          {Screen}
        </main>
      </div>
      {modalOpen && <NewRecordModal active={active} data={data} onClose={() => setModalOpen(false)} onCreate={createRecord} />}
      {editTarget && <EditRecordModal editTarget={editTarget} data={data} onClose={() => setEditTarget(null)} onSave={saveEditedRecord} />}
    </div>
  );
}
