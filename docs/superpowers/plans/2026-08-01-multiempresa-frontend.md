# Multiempresa — Frontend (Organizaciones screen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a super-admin-only "Organizaciones" screen so a platform super-admin can list existing organizations and create new ones (with their first admin user) from the UI, instead of via `curl`.

**Architecture:** A new screen component mirrors the existing "Usuarios" screen's list+create-form pattern. It reads organizations directly via the anon-key Supabase client (the `organizations_read` RLS policy from the backend plan already lets a super-admin see every row — no new read endpoint needed) and creates organizations by invoking the existing `create-organization` edge function. The screen is gated by `profile.isSuperAdmin`, not by the existing role-array system, since `is_super_admin` is orthogonal to `role`.

**Tech Stack:** React 19 (single-file component, no new libraries), `@supabase/supabase-js` v2, existing `mini_erp_bizon_prototipo.jsx` UI primitives (`Panel`, `SectionTitle`, `Field`, `TextInput`, `Button`, `SearchBar`, `DataTable`).

## Global Constraints

- Depends on the backend plan (`docs/superpowers/plans/2026-08-01-multiempresa-backend.md`) already being merged — the `organizations` table, its RLS policies, `profiles.is_super_admin`, and the `create-organization` edge function must exist. They are merged on `main` as of this plan.
- No other frontend screens change. Per the backend plan's spec, every other screen is already correctly scoped by RLS once a user has an `organization_id` — this plan only adds the one new super-admin screen.
- No new npm dependencies. No new edge functions — organization listing goes through the existing RLS-protected direct table read, matching how every other screen in this app reads data (`erpRepository.js`'s `loadErpData`), not through a bespoke endpoint.
- Follow the existing screen-registration pattern exactly (`screens` array + `canAccessScreen` + `menuSections` + `Screen` router object in `mini_erp_bizon_prototipo.jsx`) rather than inventing a new navigation mechanism.

---

### Task 1: `listOrganizations` / `createOrganization` in authRepository.js

**Files:**
- Modify: `src/lib/authRepository.js` (append after `createUserAccount`, currently ending at line 129)

**Interfaces:**
- Produces: `listOrganizations(): Promise<Array<{id: string, name: string, createdAt: string}>>`; `createOrganization({organizationName, email, password, fullName}): Promise<{organization: {id, name, created_at}, user: {id, fullName, role, status, organizationId, createdAt}}>`. Both consumed by Task 3.

- [ ] **Step 1: Add both functions**

Append to `src/lib/authRepository.js`, after the existing `createUserAccount` function (which currently ends the file at line 129):

```js
export async function listOrganizations() {
  if (!isDatabaseConfigured) return [];

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map((org) => ({ id: org.id, name: org.name, createdAt: org.created_at }));
}

export async function createOrganization({ organizationName, email, password, fullName }) {
  if (!isDatabaseConfigured) return null;

  const { data, error } = await supabase.functions.invoke("create-organization", {
    body: { organizationName, email, password, fullName },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { organization: data.organization, user: data.user };
}
```

- [ ] **Step 2: Verify the file has valid JS syntax**

Run: `node --check src/lib/authRepository.js`
Expected: no output, exit code 0 (the file uses ESM `export`/`import`, which `node --check` parses fine without executing).

- [ ] **Step 3: Commit**

```bash
git add src/lib/authRepository.js
git commit -m "$(cat <<'EOF'
Add listOrganizations/createOrganization to authRepository

Mirrors the existing listUserProfiles/createUserAccount pattern.
listOrganizations reads the organizations table directly (RLS already
lets a super-admin see every row); createOrganization invokes the
existing create-organization edge function.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Screen gating infrastructure (icon, registry, access check, Sidebar)

**Files:**
- Modify: `mini_erp_bizon_prototipo.jsx:525` (`MenuGlyph` paths object)
- Modify: `mini_erp_bizon_prototipo.jsx:101-103` (`screens` array)
- Modify: `mini_erp_bizon_prototipo.jsx:599-605` (`canAccessScreen`)
- Modify: `mini_erp_bizon_prototipo.jsx:781` (`Sidebar` function signature)

**Interfaces:**
- Consumes: `profile.isSuperAdmin` (added to the profile shape by the backend plan's Task 4, already merged).
- Produces: a `screens` entry with `key: "organizaciones"` that `canAccessScreen` only allows when `profile.isSuperAdmin` is true; a `Sidebar` component that renders whatever `menuSections` array it's given as a prop instead of always reading the module-level constant, letting the parent inject a super-admin-only section without that section appearing (even disabled) for regular users. Task 3 relies on this screen key existing and this gating being in place.

- [ ] **Step 1: Add a "building" icon glyph**

In `mini_erp_bizon_prototipo.jsx`, inside `MenuGlyph`'s `paths` object (currently ending at line 528 with the `map` entry, before the closing `};` at line 529):

```js
    map: <><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01" /></>,
  };
```

(only the `building` line is new — `map` and the closing `};` already exist, shown here for placement).

- [ ] **Step 2: Register the screen**

In the `screens` array (currently lines 83-103), add a new entry after `reportes` (the last entry, line 102), before the closing `];`:

```js
  { key: "reportes", label: "Reportes", icon: "chart", roles: ["admin", "direccion"] },
  { key: "organizaciones", label: "Organizaciones", icon: "building", roles: [] },
];
```

`roles: []` is intentional — access is decided entirely by the `isSuperAdmin` special case added in Step 3, not by the role-array mechanism every other screen uses.

- [ ] **Step 3: Gate access by `isSuperAdmin`**

Replace `canAccessScreen` (currently lines 599-605):

```js
function canAccessScreen(screen, profileOrRole) {
  const profile = typeof profileOrRole === "string" ? { role: profileOrRole, menuKeys: null } : profileOrRole || {};
  if (screen.key === "organizaciones") return Boolean(profile.isSuperAdmin);
  const roleAllowed = screen.roles.includes(profile.role || "ventas");
  if (!roleAllowed) return false;
  if (Array.isArray(profile.menuKeys) && profile.menuKeys.length) return profile.menuKeys.includes(screen.key);
  return true;
}
```

- [ ] **Step 4: Let `Sidebar` receive `menuSections` as a prop**

The `Sidebar` function (starting at line 781) currently reads the module-level `const menuSections` (declared at line 105) directly inside its render body — every user sees every section's items, just disabled if not `allowed`. Rendering "Organizaciones" in a statically-registered section would show it (grayed out, with a "Bloqueado para este rol" tooltip) to every non-super-admin user, leaking the feature's existence. Instead, the parent will compute a super-admin-only section and pass it in — regular users never receive it at all.

Change the function signature from:

```js
function Sidebar({ active, setActive, availableScreens, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut }) {
```

to:

```js
function Sidebar({ active, setActive, availableScreens, menuSections, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut }) {
```

No other change is needed inside `Sidebar` — the function body already does `menuSections.map((section) => ...)` (line 800), and adding `menuSections` to the destructured parameters makes that reference the prop instead of falling through to the outer module-level constant (standard JS parameter shadowing).

- [ ] **Step 5: Verify the file has valid JS syntax**

Run: `node --check mini_erp_bizon_prototipo.jsx`
Expected: this will actually fail — the file uses JSX, which plain `node --check` cannot parse. Instead run:

```bash
npx vite build --mode development 2>&1 | tail -20
```

Expected: build completes (`✓ built in ...`), no new errors relative to a build taken before this change. This task alone won't render "Organizaciones" yet (Task 3 wires it up) — the build succeeding just confirms no syntax errors were introduced.

- [ ] **Step 6: Commit**

```bash
git add mini_erp_bizon_prototipo.jsx
git commit -m "$(cat <<'EOF'
Add Organizaciones screen gating (super-admin only)

Registers the "organizaciones" screen key gated on profile.isSuperAdmin
rather than the role-array mechanism every other screen uses (is_super_admin
is orthogonal to role). Sidebar now takes menuSections as a prop so a
super-admin-only section can be injected without appearing (even disabled)
to regular users in the static menu.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Organizaciones screen component + wiring into the main app

**Files:**
- Modify: `mini_erp_bizon_prototipo.jsx:5` (authRepository import)
- Modify: `mini_erp_bizon_prototipo.jsx:3912` (state, add `organizations`)
- Modify: `mini_erp_bizon_prototipo.jsx` (add `refreshOrganizations` near `refreshUserProfiles`, currently lines 4030-4045)
- Modify: `mini_erp_bizon_prototipo.jsx` (add `createOrganizationAccount` near `createManagedUser`, currently lines 4185-4191)
- Modify: `mini_erp_bizon_prototipo.jsx:4495` (`screenProps`)
- Modify: `mini_erp_bizon_prototipo.jsx:4514-4515` (`Screen` router object)
- Modify: `mini_erp_bizon_prototipo.jsx:4545-4556` (`Sidebar` call site, `onNew` condition)
- Create: a new `Organizaciones` component in `mini_erp_bizon_prototipo.jsx`, placed directly before the existing `Reportes` function (currently at line 3274) — i.e. right after `Usuarios` ends (line 3272).

**Interfaces:**
- Consumes: `listOrganizations`/`createOrganization` from Task 1; the `organizaciones` screen key and `isSuperAdmin` gating from Task 2; existing UI primitives `Panel`, `SectionTitle`, `Field`, `TextInput`, `Button`, `SearchBar`, `DataTable`, `formatDate` (all already defined elsewhere in this file, used by the sibling `Usuarios` component).
- Produces: a fully wired screen reachable by a super-admin via the sidebar/mobile nav.

- [ ] **Step 1: Import the two new repository functions**

Change the import line (currently line 5):

```js
import { createUserAccount, getCurrentProfile, getInitialSession, listenAuthChanges, listUserProfiles, signInWithEmail, signOutUser, signUpWithEmail, updateUserProfile } from "./src/lib/authRepository";
```

to:

```js
import { createOrganization, createUserAccount, getCurrentProfile, getInitialSession, listenAuthChanges, listOrganizations, listUserProfiles, signInWithEmail, signOutUser, signUpWithEmail, updateUserProfile } from "./src/lib/authRepository";
```

- [ ] **Step 2: Add `organizations` state**

Immediately after the existing `userProfiles` state declaration (currently line 3912):

```js
  const [userProfiles, setUserProfiles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
```

(only the `organizations` line is new).

- [ ] **Step 3: Add `refreshOrganizations`, mirroring `refreshUserProfiles`**

The existing `refreshUserProfiles` function and its effect (currently lines 4030-4045) read:

```js
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
```

Add immediately after that `useEffect` block:

```js
  async function refreshOrganizations() {
    if (!isDatabaseConfigured || !profile?.isSuperAdmin || profile?.status !== "active") return;

    try {
      const orgs = await listOrganizations();
      setOrganizations(orgs);
      setDatabaseStatus("Conectado a Supabase");
    } catch (error) {
      console.error("No se pudieron cargar organizaciones:", error);
      setDatabaseStatus("Error de base");
    }
  }

  useEffect(() => {
    refreshOrganizations();
  }, [session, profile?.isSuperAdmin, profile?.status]);
```

- [ ] **Step 4: Add `createOrganizationAccount`, mirroring `createManagedUser`**

The existing `createManagedUser` (currently lines 4185-4191) reads:

```js
  async function createManagedUser(payload) {
    if (!isDatabaseConfigured) return;

    const created = await createUserAccount(payload);
    setUserProfiles((items) => [created, ...items]);
    audit("create", "usuarios", { id: created.id }, `Alta de usuario ${created.fullName}`);
  }
```

Add immediately after it:

```js
  async function createOrganizationAccount(payload) {
    if (!isDatabaseConfigured) return;

    const result = await createOrganization(payload);
    const org = { id: result.organization.id, name: result.organization.name, createdAt: result.organization.created_at };
    setOrganizations((items) => [org, ...items]);
    audit("create", "organizaciones", { id: org.id }, `Alta de organizacion ${org.name}`);
  }
```

- [ ] **Step 5: Write the `Organizaciones` component**

Insert directly before the existing `function Reportes({ data })` (currently line 3274), i.e. immediately after `Usuarios` closes (line 3272):

```jsx
function Organizaciones({ organizations, onCreateOrganization, onRefreshOrganizations }) {
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
```

- [ ] **Step 6: Add `organizations`/handlers to `screenProps` and register the screen in the `Screen` router**

The `screenProps` object (currently line 4495) reads:

```js
  const screenProps = { data, setActive, companies, setCompanies, opportunities, setOpportunities, quotes, setQuotes, workOrders, setWorkOrders, persistRecord, persistUpdate, getDocumentNumber, openEditor, removeRecord, uploadDocument, createCalendarEvent, userProfiles, currentProfile: profile, onCreateUserProfile: createManagedUser, onUpdateUserProfile: persistUserProfile, onRefreshUsers: refreshUserProfiles, onImportLeads: importLeads, onNewRecord: () => setModalOpen(true) };
```

Change it to add three fields at the end:

```js
  const screenProps = { data, setActive, companies, setCompanies, opportunities, setOpportunities, quotes, setQuotes, workOrders, setWorkOrders, persistRecord, persistUpdate, getDocumentNumber, openEditor, removeRecord, uploadDocument, createCalendarEvent, userProfiles, currentProfile: profile, onCreateUserProfile: createManagedUser, onUpdateUserProfile: persistUserProfile, onRefreshUsers: refreshUserProfiles, onImportLeads: importLeads, onNewRecord: () => setModalOpen(true), organizations, onCreateOrganization: createOrganizationAccount, onRefreshOrganizations: refreshOrganizations };
```

Then the `Screen` router object (currently lines 4496-4516):

```js
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
    reportes: <Reportes {...screenProps} />,
  }[active] || <Dashboard {...screenProps} />;
```

Add one line before the closing `usuarios`/`reportes` pair (order doesn't matter, placing it after `usuarios` for readability):

```js
    usuarios: <Usuarios {...screenProps} />,
    organizaciones: <Organizaciones {...screenProps} />,
    reportes: <Reportes {...screenProps} />,
```

- [ ] **Step 7: Pass the dynamic `menuSections` prop to `Sidebar` and update `onNew`**

The `Sidebar` call site (currently lines 4545-4556) reads:

```jsx
        <Sidebar
          active={active}
          setActive={setActive}
          availableScreens={availableScreens}
          databaseStatus={databaseStatus}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onExportBackup={exportBackup}
          onResetLocal={useLocalDemo ? resetLocalDatabase : null}
          onSignOut={isDatabaseConfigured ? handleSignOut : null}
          onNew={active === "usuarios" ? null : () => setModalOpen(true)}
        />
```

First, immediately before the `return (` that contains this JSX (i.e. right after the `availableScreens` computation at line 4068, or anywhere else in the component body before the return — place it right after the `const availableScreens = ...` line for proximity to its source data), add:

```js
  const sidebarMenuSections = profile?.isSuperAdmin
    ? [...menuSections, { title: "Plataforma", keys: ["organizaciones"] }]
    : menuSections;
```

Then change the `Sidebar` JSX to:

```jsx
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
```

(two changes: the new `menuSections={sidebarMenuSections}` line, and `onNew`'s condition extended to also exclude `"organizaciones"`).

- [ ] **Step 8: Build verification**

No live Supabase credentials are available to manually click through this in a browser in this environment (same constraint as the backend plan). Run:

```bash
npm run build
```

Expected: `✓ built in ...`, no new errors (the existing chunk-size warning is expected and unrelated).

- [ ] **Step 9: Manual verification checklist (for whoever has Supabase credentials)**

Document this in the commit message body, not as a script (there's no existing test harness for React components in this project — matching the project's current state, not introducing a new one for a single screen):

1. Sign in as a non-super-admin user → confirm no "Organizaciones" entry appears anywhere in the sidebar or mobile nav (not even disabled/grayed).
2. Sign in as a super-admin (`profiles.is_super_admin = true`) → confirm "Organizaciones" appears under a "Plataforma" section, and clicking it loads the screen with the existing organizations listed.
3. Create a new organization from the form → confirm it appears in the list immediately, and that a new user can then sign in with the email/password entered and lands with `role='admin'`, `status='active'`, `organization_id` set to the new organization.

- [ ] **Step 10: Commit**

```bash
git add mini_erp_bizon_prototipo.jsx
git commit -m "$(cat <<'EOF'
Add Organizaciones screen and wire it into the app

Super-admin-only screen listing existing organizations with a form to
create new ones (name + first admin's email/name/password), calling
create-organization. Regular users never see the screen or its sidebar
entry, matching the backend plan's spec (no self-signup, super-admin-
only provisioning).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes (from the plan author)

- **Spec coverage:** the approved design spec's "Frontend changes" section asked for exactly this — a super-admin-gated list+create screen, no organization switcher, no other screen changes. All three are satisfied (Task 2 goes further than the spec's literal words to make the gating airtight in the sidebar, addressing something the spec didn't specify explicitly: whether a *disabled* nav entry leaking the feature's existence to non-super-admins would be acceptable — it decides not, and hides it entirely).
- **No new test infrastructure**: this project has zero component/UI tests today (confirmed during the backend plan). Adding a testing framework for one screen would be scope creep beyond this plan; verification is build-only plus the manual checklist in Task 3 Step 9, consistent with how every other screen in this codebase is verified today.
