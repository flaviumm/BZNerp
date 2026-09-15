# Branding por organización Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin de cada organización configure nombre, color principal y logo desde la app, y que ese branding se aplique a toda la interfaz vía CSS custom properties, reemplazando el naranja Bizon hardcodeado.

**Architecture:** Cinco tokens de marca (`--brand`, `--brand-hover`, `--brand-tint`, `--brand-soft`, `--brand-shadow`) se declaran en `index.html` `:root` con el naranja actual como default (así demo y pre-carga se ven como hoy). Un módulo nuevo `src/lib/theme.js` (`applyBrandTheme(hex)`) los sobreescribe en runtime derivando los 4 tonos del color de la organización con matemática HSL (sin dependencias). `organizations` gana `primary_color` y `logo_data_url` (migración + policy de UPDATE para el admin de la propia organización). El root de la app carga la organización del perfil (`getOrganization`), aplica el tema, y pasa `organization` a `Header`/`Sidebar` (logo/nombre con fallback a los assets Bizon) y a las pantallas. Nueva pantalla `Configuracion` (rol `admin`) edita los 3 campos y aplica el tema al instante. Codemod mecánico hex → `var(--brand…)` en `src/components/**` (excluye `auth.jsx`, pre-login).

**Tech Stack:** React 19 + Vite 7, Tailwind vía CDN Play, Supabase (PostgREST + RLS). Sin dependencias nuevas. Chequeo automatizado con `node:assert`.

**Spec:** `docs/superpowers/specs/2026-09-12-org-branding-settings-design.md` + 5 ajustes aprobados en chat el 2026-09-15 (defaults en CSS; dos tintes `--brand-tint`/`--brand-soft`; login/crash/PDF/error-card excluidos; logo y nombre con fallback Bizon; reset incluye document_files y tablas de leads).

## Global Constraints

- No tocar `src/components/screens/auth.jsx` (pre-login, sin organización conocida: conserva logo y texto Bizon), `src/main.jsx` (crash screen), `src/lib/utils.js` (HTML de PDF), ni el `#ffb199` / `#fff8e8` de `ui/index.jsx` (card de error de DB y tinte del Badge amber, no son de marca).
- Los tokens neutros/semánticos existentes (`--surface`, `--border`, `--danger`, …) no cambian.
- Solo cambia el fragmento hex en el codemod; el resto de cada línea queda byte-idéntico.
- No agregar dependencias ni frameworks de testing (`node:assert` únicamente).
- No correr `supabase db push` ni ninguna escritura contra producción desde este plan: la migración se escribe y se deja para que el usuario la aplique (`supabase db push`, o SQL Editor). Las verificaciones de UI se hacen en modo demo (sin `.env.local` en el worktree) — el flujo de guardado real contra Supabase queda para verificación manual del usuario tras aplicar la migración.
- Nombres de token exactos: `--brand`, `--brand-hover`, `--brand-tint`, `--brand-soft`, `--brand-shadow`.

## Mapa del codemod (Task 2)

| Hex | → | Rol |
|---|---|---|
| `#ff7900` | `var(--brand)` | color principal |
| `#d85f00`, `#ff8f1f` | `var(--brand-hover)` | acento oscuro / hover |
| `#fff1e5`, `#fff8f1`, `#fff4ea`, `#fffaf5`, `#fff8f3`, `#fff8f0`, `#fff3e8` | `var(--brand-tint)` | fondo claro |
| `#ffe0c2`, `#f2c48d`, `#ffd2ad` | `var(--brand-soft)` | medio tono (gráficos, bordes de badge) |
| `rgba(255,121,0,0.22)` | `var(--brand-shadow)` | sombra del item activo del sidebar |

---

### Task 1: Migración, repositorio, tokens por defecto y `applyBrandTheme` (con chequeo)

**Files:**
- Create: `supabase/migrations/20260915120000_organization_branding.sql`
- Modify: `src/lib/authRepository.js` (agregar 2 funciones después de `listOrganizations`)
- Modify: `index.html` (5 declaraciones en `:root`)
- Create: `src/lib/theme.js`
- Create: `scripts/check-brand-theme.mjs`

**Interfaces:**
- Produces:
  - SQL: columnas `organizations.primary_color text not null default '#ff7900'` y `organizations.logo_data_url text null`; policy `organizations_update_own_admin`.
  - `getOrganization(id)` → `{ id, name, primaryColor, logoDataUrl, createdAt } | null` (null si no hay DB o no hay fila).
  - `updateOrganization(id, { name?, primaryColor?, logoDataUrl? })` → mismo shape mapeado (null si no hay DB).
  - `applyBrandTheme(hex)` → void; setea las 5 custom properties en `document.documentElement.style`.
  - `brandTokens(hex)` → `{ brand, hover, tint, soft, shadow }` (pura, testeable).
  - CSS: los 5 tokens con defaults en `:root`.
- Consumes: `isDatabaseConfigured`, `supabase` (ya importados en `authRepository.js`).

- [ ] **Step 1: Escribir el script de chequeo (falla porque `theme.js` no existe)**

Crear `scripts/check-brand-theme.mjs`:

```js
import assert from "node:assert/strict";
import { brandTokens, hexToHsl, hslToHex } from "../src/lib/theme.js";

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function close(a, b, tolerance = 2) {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return Math.abs(ar - br) <= tolerance && Math.abs(ag - bg) <= tolerance && Math.abs(ab - bb) <= tolerance;
}

// round-trip hex -> hsl -> hex (tolerancia de redondeo)
for (const hex of ["#ff7900", "#1d4ed8", "#0f766e", "#000000", "#ffffff"]) {
  assert.ok(close(hslToHex(...hexToHsl(hex)), hex), `round-trip ${hex}`);
}

const t = brandTokens("#ff7900");
assert.equal(t.brand, "#ff7900");
assert.ok(close(t.tint, "#fff1e5"), `tint ${t.tint}`);       // L 95
assert.ok(close(t.soft, "#ffbf80", 3), `soft ${t.soft}`);    // L 75
assert.ok(hexToHsl(t.hover)[2] < hexToHsl("#ff7900")[2], "hover es mas oscuro");
assert.equal(t.shadow, "rgba(255,121,0,0.22)");

// un color arbitrario produce 5 tokens validos
const u = brandTokens("#1d4ed8");
for (const key of ["brand", "hover", "tint", "soft"]) assert.match(u[key], /^#[0-9a-f]{6}$/, key);
assert.match(u.shadow, /^rgba\(\d+,\d+,\d+,0\.22\)$/);

// entrada invalida cae al default
assert.equal(brandTokens("no-es-hex").brand, "#ff7900");

console.log("check-brand-theme: ALL PASS");
```

- [ ] **Step 2: Correr el script y confirmar que falla**

Run: `node scripts/check-brand-theme.mjs`
Expected: falla con `Cannot find module '.../src/lib/theme.js'` (o equivalente).

- [ ] **Step 3: Crear `src/lib/theme.js`**

```js
const DEFAULT_BRAND = "#ff7900";

export function hexToHsl(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s * 100, l * 100];
}

export function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function brandTokens(hex) {
  const brand = isHex(hex) ? hex.toLowerCase() : DEFAULT_BRAND;
  const [h, s, l] = hexToHsl(brand);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(brand.slice(i, i + 2), 16));
  return {
    brand,
    hover: hslToHex(h, s, Math.max(l - 10, 0)),
    tint: hslToHex(h, s, 95),
    soft: hslToHex(h, s, 75),
    shadow: `rgba(${r},${g},${b},0.22)`,
  };
}

export function applyBrandTheme(hex) {
  const tokens = brandTokens(hex);
  const root = document.documentElement.style;
  root.setProperty("--brand", tokens.brand);
  root.setProperty("--brand-hover", tokens.hover);
  root.setProperty("--brand-tint", tokens.tint);
  root.setProperty("--brand-soft", tokens.soft);
  root.setProperty("--brand-shadow", tokens.shadow);
}
```

- [ ] **Step 4: Correr el script y confirmar que pasa**

Run: `node scripts/check-brand-theme.mjs`
Expected: `check-brand-theme: ALL PASS`, exit 0. Si una aserción de tolerancia falla, reportar el valor real en el reporte (NEEDS_CONTEXT) — no ajustar las tolerancias.

- [ ] **Step 5: Declarar los defaults en `index.html`**

Reemplazar:

```css
        --danger: #b42318;
      }
```

por:

```css
        --danger: #b42318;
        --brand: #ff7900;
        --brand-hover: #d85f00;
        --brand-tint: #fff1e5;
        --brand-soft: #f2c48d;
        --brand-shadow: rgba(255,121,0,0.22);
      }
```

- [ ] **Step 6: Migración**

Crear `supabase/migrations/20260915120000_organization_branding.sql`:

```sql
-- Branding por organizacion: color principal y logo (data-URL), editables por
-- el admin de la propia organizacion. Ver
-- docs/superpowers/specs/2026-09-12-org-branding-settings-design.md

alter table organizations
  add column if not exists primary_color text not null default '#ff7900',
  add column if not exists logo_data_url text;

drop policy if exists "organizations_update_own_admin" on organizations;
create policy "organizations_update_own_admin"
on organizations
for update
using (
  id = public.current_organization_id()
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (id = public.current_organization_id());
```

- [ ] **Step 7: Repositorio**

En `src/lib/authRepository.js`, inmediatamente después de la función `listOrganizations` (termina con `return data.map((org) => ({ id: org.id, name: org.name, createdAt: org.created_at }));` y `}`), agregar:

```js
function mapOrganization(org) {
  return {
    id: org.id,
    name: org.name,
    primaryColor: org.primary_color || "#ff7900",
    logoDataUrl: org.logo_data_url || null,
    createdAt: org.created_at,
  };
}

export async function getOrganization(id) {
  if (!isDatabaseConfigured || !id) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, primary_color, logo_data_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapOrganization(data) : null;
}

export async function updateOrganization(id, patch) {
  if (!isDatabaseConfigured) return null;

  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.primaryColor !== undefined) payload.primary_color = patch.primaryColor;
  if (patch.logoDataUrl !== undefined) payload.logo_data_url = patch.logoDataUrl || null;

  const { data, error } = await supabase
    .from("organizations")
    .update(payload)
    .eq("id", id)
    .select("id, name, primary_color, logo_data_url, created_at")
    .single();

  if (error) throw error;
  return mapOrganization(data);
}
```

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260915120000_organization_branding.sql src/lib/authRepository.js index.html src/lib/theme.js scripts/check-brand-theme.mjs
git commit -m "feat: organization branding columns, brand theme tokens and repository"
```

---

### Task 2: Codemod naranja → tokens de marca

**Files:**
- Modify: `src/components/ui/index.jsx`, `src/components/screens/CRM.jsx`, `src/components/screens/Dashboard.jsx`, `src/components/screens/ImportarLeads.jsx`, `src/components/screens/Calendario.jsx`, `src/components/screens/Operacion.jsx`, `src/components/screens/Clientes.jsx`, `src/components/screens/ProcesoVentas.jsx`, `src/components/screens/Usuarios.jsx`

**Interfaces:**
- Consumes: los 5 tokens de marca (defaults de Task 1 en `index.html`).
- No produce nada.

- [ ] **Step 1: Registrar el estado inicial**

Run: `grep -c "#ff7900\|#d85f00\|#ff8f1f\|#fff1e5\|#fff8f1\|#fff4ea\|#fffaf5\|#fff8f3\|#fff8f0\|#fff3e8\|#ffe0c2\|#f2c48d\|#ffd2ad\|255,121,0" src/components/ui/index.jsx src/components/screens/CRM.jsx src/components/screens/Dashboard.jsx src/components/screens/ImportarLeads.jsx src/components/screens/Calendario.jsx src/components/screens/Operacion.jsx src/components/screens/Clientes.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/Usuarios.jsx`
Expected (líneas por archivo): `ui/index.jsx:26`, `CRM.jsx:10`, `Dashboard.jsx:1`, `ImportarLeads.jsx:2`, `Calendario.jsx:2`, `Operacion.jsx:2`, `Clientes.jsx:3`, `ProcesoVentas.jsx:18`, `Usuarios.jsx:1`. (Si algún número difiere en más de 1, detenerse y reportar NEEDS_CONTEXT con la salida.)

Run: `grep -n "#fff8e8\|#ffb199" src/components/ui/index.jsx` → 2 líneas (Badge amber y card de error de DB). Deben seguir idénticas al final.

- [ ] **Step 2: Aplicar los reemplazos (replace-all del fragmento, en los 9 archivos)**

- `#ff7900` → `var(--brand)`
- `#d85f00` → `var(--brand-hover)`
- `#ff8f1f` → `var(--brand-hover)`
- `#fff1e5`, `#fff8f1`, `#fff4ea`, `#fffaf5`, `#fff8f3`, `#fff8f0`, `#fff3e8` → `var(--brand-tint)`
- `#ffe0c2`, `#f2c48d`, `#ffd2ad` → `var(--brand-soft)`
- `rgba(255,121,0,0.22)` → `var(--brand-shadow)` (solo en `ui/index.jsx`, dentro de `shadow-[0_12px_25px_rgba(255,121,0,0.22)]` → `shadow-[0_12px_25px_var(--brand-shadow)]`)

Ejemplos: `text-[#ff7900]` → `text-[var(--brand)]`; `hover:bg-[#ff8f1f]` → `hover:bg-[var(--brand-hover)]`; `conic-gradient(#ff7900 …` → `conic-gradient(var(--brand) …`; `fill="#ff7900"` → `fill="var(--brand)"`; `stroke="#ff7900"` → `stroke="var(--brand)"`; `borderTop: "4px solid #ff7900"` → `borderTop: "4px solid var(--brand)"`; `<path d={area} fill="#ff7900" opacity="0.08" />` → `fill="var(--brand)"`.

- [ ] **Step 3: Confirmar el resultado**

Run: el `grep -c` de Step 1 → todos `0`.
Run: `grep -n "#fff8e8\|#ffb199" src/components/ui/index.jsx` → las mismas 2 líneas, intactas.
Run: `grep -rn "#ff7900" src/components` → solo `auth.jsx` (3 líneas).
Run: `grep -c "var(--brand" src/components/ui/index.jsx` → ≥ 30.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/index.jsx src/components/screens/CRM.jsx src/components/screens/Dashboard.jsx src/components/screens/ImportarLeads.jsx src/components/screens/Calendario.jsx src/components/screens/Operacion.jsx src/components/screens/Clientes.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/Usuarios.jsx
git commit -m "style: replace hardcoded brand orange with brand CSS tokens"
```

---

### Task 3: Cargar la organización, aplicar el tema y mostrar logo/nombre

**Files:**
- Modify: `mini_erp_bizon_prototipo.jsx` (imports, estado, effect, props a Sidebar/Header, screenProps)
- Modify: `src/components/ui/index.jsx` (`Header`, `Sidebar`)

**Interfaces:**
- Consumes: `getOrganization`, `updateOrganization` (Task 1), `applyBrandTheme` (Task 1).
- Produces (consumido por Task 4): en `screenProps`, `organization` (`{ id, name, primaryColor, logoDataUrl } | null`) y `onUpdateOrganization(patch)` → `Promise<organization>`; `Header`/`Sidebar` aceptan prop opcional `organization`.

- [ ] **Step 1: Imports en `mini_erp_bizon_prototipo.jsx`**

Reemplazar la línea:

```js
import { createOrganization, createUserAccount, getCurrentProfile, getInitialSession, listenAuthChanges, listOrganizations, listUserProfiles, signInWithEmail, signOutUser, signUpWithEmail, updateUserProfile } from "./src/lib/authRepository";
```

por:

```js
import { createOrganization, createUserAccount, getCurrentProfile, getInitialSession, getOrganization, listenAuthChanges, listOrganizations, listUserProfiles, signInWithEmail, signOutUser, signUpWithEmail, updateOrganization, updateUserProfile } from "./src/lib/authRepository";
import { applyBrandTheme } from "./src/lib/theme";
```

- [ ] **Step 2: Estado**

Inmediatamente después de la línea `const [organizationsError, setOrganizationsError] = useState("");` agregar:

```js
  const [organization, setOrganization] = useState(null);
```

- [ ] **Step 3: Cargar la organización y aplicar el tema**

Inmediatamente después del bloque:

```js
  useEffect(() => {
    refreshOrganizations();
  }, [session, profile?.isSuperAdmin, profile?.status]);
```

agregar:

```js
  useEffect(() => {
    let cancelled = false;
    const organizationId = profile?.organizationId;

    if (!organizationId) {
      setOrganization(null);
      applyBrandTheme(null);
      return undefined;
    }

    getOrganization(organizationId)
      .then((org) => {
        if (cancelled) return;
        setOrganization(org);
        applyBrandTheme(org?.primaryColor);
      })
      .catch((error) => console.error("No se pudo cargar la organizacion:", error));

    return () => {
      cancelled = true;
    };
  }, [profile?.organizationId]);

  async function saveOrganizationSettings(patch) {
    const saved = isDatabaseConfigured && organization?.id
      ? await updateOrganization(organization.id, patch)
      : { ...(organization || { id: null, name: "Bizon", primaryColor: "#ff7900", logoDataUrl: null }), ...patch };
    setOrganization(saved);
    applyBrandTheme(saved.primaryColor);
    return saved;
  }
```

(`applyBrandTheme(null)` cae al default naranja porque `brandTokens` valida el hex.)

- [ ] **Step 4: Pasar `organization` a las pantallas y al shell**

En la línea `const screenProps = { data, setActive, … onRefreshOrganizations: refreshOrganizations };` agregar al final del objeto (antes del `}` de cierre): `, organization, onUpdateOrganization: saveOrganizationSettings`.

En el JSX, agregar la prop `organization={organization}` a `<Sidebar` (por ejemplo, justo después de `menuSections={sidebarMenuSections}`) y a `<Header` (después de `profile={profile}`).

- [ ] **Step 5: `Header` muestra nombre y logo de la organización**

En `src/components/ui/index.jsx`, reemplazar:

```jsx
export function Header({ activeLabel, databaseStatus, profile }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="h-10 w-10 rounded-xl bg-black object-contain p-1 lg:hidden" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand)]">Bizon ERP Industrial</p>
```

por:

```jsx
export function Header({ activeLabel, databaseStatus, profile, organization }) {
  const brandName = organization?.name || "Bizon ERP Industrial";
  const brandLogo = organization?.logoDataUrl || "/brand/isotipo_bizon.png";
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src={brandLogo} alt={brandName} className="h-10 w-10 rounded-xl bg-black object-contain p-1 lg:hidden" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand)]">{brandName}</p>
```

(Nota: tras Task 2 la línea del `<p>` ya dice `text-[var(--brand)]`; si el archivo todavía dijera `text-[#ff7900]`, Task 2 no se aplicó — detenerse y reportar.)

- [ ] **Step 6: `Sidebar` muestra el logo de la organización**

Reemplazar la firma:

```jsx
export function Sidebar({ active, setActive, availableScreens, menuSections, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut }) {
```

por:

```jsx
export function Sidebar({ active, setActive, availableScreens, menuSections, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut, organization }) {
```

y reemplazar la línea del logo:

```jsx
          <img src={collapsed ? "/brand/isotipo_bizon.png" : "/brand/logo_principal_horizontal.png"} alt="Bizon Soluciones Industriales" className={collapsed ? "h-8 w-8 rounded-xl bg-black object-contain p-1" : "h-auto max-h-14 w-full object-contain"} />
```

por:

```jsx
          {organization?.logoDataUrl ? (
            <img src={organization.logoDataUrl} alt={organization.name} className={collapsed ? "h-8 w-8 rounded-xl object-contain" : "h-auto max-h-14 w-full object-contain"} />
          ) : (
            <img src={collapsed ? "/brand/isotipo_bizon.png" : "/brand/logo_principal_horizontal.png"} alt="Bizon Soluciones Industriales" className={collapsed ? "h-8 w-8 rounded-xl bg-black object-contain p-1" : "h-auto max-h-14 w-full object-contain"} />
          )}
```

- [ ] **Step 7: Build + chequeo**

Run: `npm run build && node scripts/check-brand-theme.mjs`
Expected: build exitoso y `check-brand-theme: ALL PASS`.

- [ ] **Step 8: Commit**

```bash
git add mini_erp_bizon_prototipo.jsx src/components/ui/index.jsx
git commit -m "feat: load organization branding at boot and show its logo and name in the shell"
```

---

### Task 4: Pantalla Configuración, navegación y script de reset

**Files:**
- Create: `src/components/screens/Configuracion.jsx`
- Modify: `src/lib/navigation.js`
- Modify: `mini_erp_bizon_prototipo.jsx` (import, sección Administracion, mapa `Screen`, exclusión de `onNew`)
- Create: `scripts/reset-org-seed-data.sql`

**Interfaces:**
- Consumes: `organization`, `onUpdateOrganization` (Task 3, vía `screenProps`); `Panel`, `Field`, `TextInput`, `Button`, `SectionTitle` de `src/components/ui`.
- Produces: screen key `"configuracion"`.

- [ ] **Step 1: Crear `src/components/screens/Configuracion.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Button, Panel, Field, TextInput, SectionTitle } from "../ui";

const LOGO_SIZE = 256;

function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(LOGO_SIZE / image.width, LOGO_SIZE / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

export function Configuracion({ organization, onUpdateOrganization }) {
  const [name, setName] = useState(organization?.name || "");
  const [color, setColor] = useState(organization?.primaryColor || "#ff7900");
  const [logo, setLogo] = useState(organization?.logoDataUrl || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(organization?.name || "");
    setColor(organization?.primaryColor || "#ff7900");
    setLogo(organization?.logoDataUrl || null);
  }, [organization?.id]);

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await resizeToDataUrl(file));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onUpdateOrganization({ name: name.trim(), primaryColor: color, logoDataUrl: logo });
      setMessage("Configuracion guardada.");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar la configuracion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Configuracion" subtitle="Nombre, color y logo de tu empresa" />
      <Panel className="p-5">
        <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            <Field label="Nombre de la empresa">
              <TextInput required value={name} onChange={(event) => setName(event.target.value)} placeholder="Mi Empresa SA" />
            </Field>
            <Field label="Color principal">
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-white p-1" aria-label="Elegir color" />
                <TextInput value={color} onChange={(event) => setColor(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" placeholder="#ff7900" />
                <span className="inline-flex h-9 items-center rounded-lg px-3 text-[11px] font-semibold text-black" style={{ background: color }}>Muestra</span>
              </div>
            </Field>
            <Field label="Logo">
              <input type="file" accept="image/*" onChange={handleLogo} className="block w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-zinc-700" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              {logo && <Button variant="ghost" onClick={() => setLogo(null)}>Quitar logo</Button>}
            </div>
            {message && <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-zinc-700">{message}</p>}
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Vista previa</p>
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="Logo" className="h-14 w-14 rounded-xl object-contain" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-black text-xs font-semibold text-white">Logo</div>}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{name || "Nombre de la empresa"}</p>
                <p className="text-sm font-semibold text-[var(--text)]">Asi se ve en el encabezado</p>
              </div>
            </div>
          </div>
        </form>
      </Panel>
    </div>
  );
}
```

- [ ] **Step 2: Navegación**

En `src/lib/navigation.js`, agregar al array `screens`, inmediatamente después de la línea de `organizaciones`:

```js
  { key: "configuracion", label: "Configuracion", icon: "userCog", roles: ["admin"] },
```

Y en `canAccessScreen`, inmediatamente después de `if (screen.key === "organizaciones") return Boolean(profile.isSuperAdmin);` agregar:

```js
  if (screen.key === "configuracion") return profile.role === "admin";
```

- [ ] **Step 3: Sección Administracion y mapa de pantallas en `mini_erp_bizon_prototipo.jsx`**

Agregar el import junto al de `Organizaciones`:

```js
import { Configuracion } from "./src/components/screens/Configuracion";
```

Reemplazar:

```js
  const sidebarMenuSections = profile?.isSuperAdmin
    ? [...menuSections, { title: "Administracion", keys: ["organizaciones"] }]
    : menuSections;
```

por:

```js
  const adminKeys = [profile?.isSuperAdmin ? "organizaciones" : null, profile?.role === "admin" ? "configuracion" : null].filter(Boolean);
  const sidebarMenuSections = adminKeys.length
    ? [...menuSections, { title: "Administracion", keys: adminKeys }]
    : menuSections;
```

En el objeto `Screen`, inmediatamente después de `organizaciones: <Organizaciones {...screenProps} />,` agregar:

```js
    configuracion: <Configuracion {...screenProps} />,
```

Y reemplazar `onNew={["usuarios", "organizaciones"].includes(active) ? null : () => setModalOpen(true)}` por `onNew={["usuarios", "organizaciones", "configuracion"].includes(active) ? null : () => setModalOpen(true)}`.

- [ ] **Step 4: Script de reset**

Crear `scripts/reset-org-seed-data.sql`:

```sql
-- Vacia los datos de ejemplo de UNA organizacion. Reemplazar 'TU_ORG_ID'
-- (uuid de organizations.id) antes de correr en el SQL Editor de Supabase.
-- No toca profiles, auth.users, organizations, audit_log ni los catalogos
-- (labor_rate_catalog, quote_calculation_profiles). Los archivos en Storage
-- referenciados por document_files NO se borran (solo las filas).

begin;

delete from lead_tasks where organization_id = 'TU_ORG_ID';
delete from lead_interactions where organization_id = 'TU_ORG_ID';
delete from captured_leads where organization_id = 'TU_ORG_ID';
delete from document_files where organization_id = 'TU_ORG_ID';
delete from quotes where organization_id = 'TU_ORG_ID';
delete from work_orders where organization_id = 'TU_ORG_ID';
delete from purchase_orders where organization_id = 'TU_ORG_ID';
delete from invoices where organization_id = 'TU_ORG_ID';
delete from inventory_items where organization_id = 'TU_ORG_ID';
delete from opportunities where organization_id = 'TU_ORG_ID';
delete from tasks where organization_id = 'TU_ORG_ID';
delete from employees where organization_id = 'TU_ORG_ID';
delete from companies where organization_id = 'TU_ORG_ID';

commit;
```

- [ ] **Step 5: Build + chequeos**

Run: `npm run build && node scripts/check-brand-theme.mjs && node scripts/check-dashboard-metrics.mjs`
Expected: build exitoso y ambos `ALL PASS`.

- [ ] **Step 6: Verificar en modo demo (sin `.env.local`)**

Run: `npx vite --port 5199` en el worktree y abrir la app si hay navegador. Expected: el sidebar muestra "Administracion" con "Configuracion" (perfil demo es admin); en Configuracion, cambiar el color y guardar cambia al instante el naranja de botones, sidebar activo y badges (sin DB, se guarda en memoria). Si no hay navegador, decirlo — el controlador captura pantallas después.

- [ ] **Step 7: Commit**

```bash
git add src/components/screens/Configuracion.jsx src/lib/navigation.js mini_erp_bizon_prototipo.jsx scripts/reset-org-seed-data.sql
git commit -m "feat: organization settings screen (name, brand color, logo) and seed reset script"
```

---

## Verificación visual (la corre el controlador, Edge headless, modo demo)

1. Dashboard: idéntico a la captura de 3c (defaults = naranja actual).
2. Tras aplicar la migración (usuario): verificación manual del guardado real en Supabase y de que el color/logo persisten al recargar.

## Pendiente del usuario tras el merge

- `supabase db push` (o correr `supabase/migrations/20260915120000_organization_branding.sql` en el SQL Editor).
- Correr `scripts/reset-org-seed-data.sql` con el uuid de su organización cuando quiera vaciar los datos demo.
