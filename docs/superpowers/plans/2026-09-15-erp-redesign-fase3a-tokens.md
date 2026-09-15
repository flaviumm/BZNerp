# Rediseño ERP — Fase 3a (tokens a CSS + primitivos + pantallas chicas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminar la migración a tokens donde más rinde: mover los 8 tokens neutros/semánticos a CSS puro (`:root` en `index.html`, borrando `theme.js`), tokenizar los 7 hex que quedan en los primitivos compartidos (`src/components/ui/index.jsx`) y en las pantallas chicas Reportes, Calendario y auth.

**Architecture:** Los tokens pasan de `document.documentElement.style.setProperty(...)` (inline, seteado por JS al bootear) a declaraciones CSS en el `:root { }` que ya existe en `index.html`. Mismo nombre y mismo valor para cada variable, así ningún consumidor existente (`bg-[var(--surface)]`, etc.) cambia. Se elimina `src/lib/theme.js` y su import/llamada en `src/main.jsx`. Después, reemplazos mecánicos hex → `var(--token)` en 4 archivos, siguiendo la misma regla de fases anteriores: solo hex arbitrarios listados; nunca el color de marca ni sus tintes; nunca clases `zinc-*`/`white` de Tailwind.

**Tech Stack:** React 19 + Vite 7, Tailwind vía CDN Play. Sin dependencias nuevas.

**Spec:** diseño corto aprobado en conversación (fase acotada, sin spec largo). Contexto en `docs/superpowers/specs/2026-09-13-erp-redesign-fase1-fundacion-shell.md` (tokens) y `docs/superpowers/specs/2026-09-14-erp-redesign-fase2-dashboard.md` (criterio de tokenización).

## Global Constraints

- No tocar el color de marca ni sus tintes: `#ff7900`, `#d85f00`, `#ff8f1f`, `#fff1e5`, `#fff4ea`, `#fffaf5`, `#fff8f1`, `#ffe0c2`, `#f2c48d`, `#fff3e8`, `#ffd2ad`.
- No tocar el `bg-[#050505]` del componente `Progress` (es un relleno de gráfico, fuera de alcance como el resto de los gráficos).
- Las clases `zinc-*`/`white` built-in de Tailwind no se tocan; solo los hex arbitrarios listados en cada task.
- Los nombres y valores de los 8 tokens no cambian: `--surface #fbfbf8`, `--surface-alt #f5f5f3`, `--border #ececf0`, `--text #18181b`, `--text-muted #71717a`, `--success #0f766e`, `--warning #b45309`, `--danger #b42318`.
- No agregar frameworks de testing ni dependencias.
- `Auditoria.jsx` y `Documentos.jsx` no se tocan (no tienen hex hardcodeado).

---

### Task 1: Tokens a CSS puro (`index.html`) y borrar `theme.js`

**Files:**
- Modify: `index.html`
- Modify: `src/main.jsx`
- Delete: `src/lib/theme.js`

**Interfaces:**
- Produces: las 8 CSS custom properties, ahora declaradas en `:root` de `index.html` (mismos nombres/valores). Tasks 2 y 3 las consumen vía `var(--…)`.
- Consumes: nada.

- [ ] **Step 1: Declarar los tokens en `index.html`**

Reemplazar el bloque:

```css
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
```

por:

```css
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --surface: #fbfbf8;
        --surface-alt: #f5f5f3;
        --border: #ececf0;
        --text: #18181b;
        --text-muted: #71717a;
        --success: #0f766e;
        --warning: #b45309;
        --danger: #b42318;
      }
```

- [ ] **Step 2: Quitar la llamada y el import en `src/main.jsx`**

Borrar estas dos líneas (la primera está entre los imports del tope; la segunda es la primera línea ejecutable, antes de `function AppFallback`):

```js
import { applyBaseTheme } from "./lib/theme";
```

```js
applyBaseTheme();
```

- [ ] **Step 3: Borrar `src/lib/theme.js`**

Run: `git rm src/lib/theme.js`

- [ ] **Step 4: Confirmar que no queda ninguna referencia**

Run: `grep -rn "applyBaseTheme\|lib/theme" src index.html`
Expected: sin resultados (exit code 1 de grep).

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.jsx
git commit -m "refactor: declare base theme tokens in CSS instead of runtime JS"
```

(`git rm` ya dejó staged el borrado de `theme.js`.)

---

### Task 2: Tokenizar los primitivos compartidos (`src/components/ui/index.jsx`)

**Files:**
- Modify: `src/components/ui/index.jsx`

**Interfaces:**
- Consumes: `--danger`, `--success`, `--warning`, `--text`, `--border` (Task 1).
- No produce nada consumido por otra task.

- [ ] **Step 1: Confirmar el estado inicial**

Run: `grep -n "#b42318\|#0f766e\|#a16207\|#9a6500\|#050505\|#ececf0" src/components/ui/index.jsx`
Expected: 15 líneas — las listadas abajo (más ninguna otra).

- [ ] **Step 2: Aplicar los reemplazos, línea por línea**

`Button` (variantes):
- `    ghost: "border-[#cfe7dd] bg-[#f0fdf7] text-[#0f766e] hover:border-[#0f766e]",` → `    ghost: "border-[#cfe7dd] bg-[#f0fdf7] text-[var(--success)] hover:border-[var(--success)]",`
- `    danger: "border-[#f3d2d2] bg-[#fff5f5] text-[#b42318] hover:border-[#b42318]",` → `    danger: "border-[#f3d2d2] bg-[#fff5f5] text-[var(--danger)] hover:border-[var(--danger)]",`

`Badge` (tonos):
- `    amber: "border-[#f4dfb6] bg-[#fff8e8] text-[#9a6500]",` → `    amber: "border-[#f4dfb6] bg-[#fff8e8] text-[var(--warning)]",`
- `    red: "border-[#f2c9c9] bg-[#fff3f1] text-[#b42318]",` → `    red: "border-[#f2c9c9] bg-[#fff3f1] text-[var(--danger)]",`

`MiniSparkBars` (colores):
- `    green: "bg-[#0f766e]",` → `    green: "bg-[var(--success)]",`
- `    red: "bg-[#b42318]",` → `    red: "bg-[var(--danger)]",`

`StatCard` (colores del ícono):
- `    green: "text-[#0f766e] bg-[#ecfdf5]",` → `    green: "text-[var(--success)] bg-[#ecfdf5]",`
- `    amber: "text-[#a16207] bg-[#fff8e1]",` → `    amber: "text-[var(--warning)] bg-[#fff8e1]",`
- `    red: "text-[#b42318] bg-[#fff1f1]",` → `    red: "text-[var(--danger)] bg-[#fff1f1]",`

`DonutChart`:
- `            <strong className="text-[#050505]">{item.value}%</strong>` → `            <strong className="text-[var(--text)]">{item.value}%</strong>`

`DashboardLineChart`, `DashboardRadialChart`, `DashboardStackChart` (wrappers y gradiente):
- `    <div className="rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4">` → `    <div className="rounded-2xl border border-[var(--border)] bg-[#fffaf5] p-4">` (aparece 2 veces: `DashboardLineChart` y `DashboardStackChart` — reemplazar ambas)
- `    <div className="grid gap-4 rounded-2xl border border-[#ececf0] bg-[#fffaf5] p-4 sm:grid-cols-[132px_1fr] sm:items-center">` → `    <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[#fffaf5] p-4 sm:grid-cols-[132px_1fr] sm:items-center">`
- `` style={{ background: `conic-gradient(#ff7900 ${normalized}%, #ececf0 ${normalized}% 100%)` }} `` → `` style={{ background: `conic-gradient(#ff7900 ${normalized}%, var(--border) ${normalized}% 100%)` }} `` (solo cambia `#ececf0`; el `#ff7900` queda)
- `      <div className="flex h-5 overflow-hidden rounded-full bg-[#ececf0]">` → `      <div className="flex h-5 overflow-hidden rounded-full bg-[var(--border)]">`

NO tocar: `Progress` (`blue: "bg-[#050505]"`), ningún `bg-[#fffaf5]`, ningún `#ff7900`/`#d85f00`.

- [ ] **Step 3: Confirmar el resultado**

Run: `grep -n "#b42318\|#0f766e\|#a16207\|#9a6500\|#ececf0" src/components/ui/index.jsx`
Expected: sin resultados.

Run: `grep -n "#050505" src/components/ui/index.jsx`
Expected: exactamente 1 línea, la de `Progress` (`blue: "bg-[#050505]"`).

Run: `grep -c "#ff7900" src/components/ui/index.jsx`
Expected: el mismo número que antes de la task (anotarlo en Step 1 con `grep -c "#ff7900" src/components/ui/index.jsx` y comparar).

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/index.jsx
git commit -m "style: tokenize semantic and neutral colors in shared UI primitives"
```

---

### Task 3: Tokenizar Reportes, Calendario y auth

**Files:**
- Modify: `src/components/screens/Reportes.jsx`
- Modify: `src/components/screens/Calendario.jsx`
- Modify: `src/components/screens/auth.jsx`

**Interfaces:**
- Consumes: `--surface`, `--surface-alt`, `--border`, `--text` (Task 1).
- No produce nada.

- [ ] **Step 1: Confirmar el estado inicial**

Run: `grep -n "#ecece6\|#fbfbf8\|#050505\|#f5f5f3\|#e4e4de" src/components/screens/Reportes.jsx src/components/screens/Calendario.jsx src/components/screens/auth.jsx`
Expected: 4 líneas en Reportes, 7 en Calendario, 5 en auth.

- [ ] **Step 2: `Reportes.jsx` — 4 reemplazos iguales**

En las 4 líneas `<p className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4 text-sm text-zinc-700">…`, reemplazar el fragmento `border-[#ecece6] bg-[#fbfbf8]` por `border-[var(--border)] bg-[var(--surface)]`. Nada más cambia en esas líneas.

- [ ] **Step 3: `Calendario.jsx` — 7 líneas**

- `<h2 className="text-xl font-semibold text-[#050505]">` → `<h2 className="text-xl font-semibold text-[var(--text)]">`
- En el `className` del botón de celda: `"border-[#ecece6] bg-white hover:bg-[#fbfbf8]"` → `"border-[var(--border)] bg-white hover:bg-[var(--surface)]"` (la rama `"border-[#ff7900] bg-[#fff1e5]"` del mismo ternario queda igual)
- `<span className="text-sm font-semibold text-[#050505]">{cell.day}</span>` → `<span className="text-sm font-semibold text-[var(--text)]">{cell.day}</span>`
- `className="truncate rounded-md bg-[#050505] px-2 py-1 text-[11px] font-semibold text-white"` → `className="truncate rounded-md bg-[var(--text)] px-2 py-1 text-[11px] font-semibold text-white"`
- `<div key={event.id} className="rounded-xl border border-[#ecece6] bg-[#fbfbf8] p-4">` → `<div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">`
- `<p className="mt-2 font-semibold text-[#050505]">{event.title}</p>` → `<p className="mt-2 font-semibold text-[var(--text)]">{event.title}</p>`
- `className="rounded-xl border border-dashed border-[#ecece6] p-4 text-sm text-zinc-500"` → `className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-zinc-500"`

No tocar `text-[#ff7900]` (el "+N") ni `bg-[#fff1e5]`.

- [ ] **Step 4: `auth.jsx` — 5 líneas**

- Las 3 líneas `<div className="grid min-h-screen place-items-center bg-[#f5f5f3] p-4">` → `<div className="grid min-h-screen place-items-center bg-[var(--surface-alt)] p-4">`
- `<div className="rounded-lg border border-[#e4e4de] bg-[#fbfbf8] p-3 text-sm text-zinc-700">` → `<div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-zinc-700">`
- `<div className="rounded-lg border border-[#e4e4de] bg-[#fbfbf8] p-3 font-mono text-xs text-zinc-900">` → `<div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-zinc-900">`

No tocar los 3 `text-[#ff7900]` ("Bizon ERP Industrial").

- [ ] **Step 5: Confirmar el resultado**

Run: `grep -n "#ecece6\|#fbfbf8\|#050505\|#f5f5f3\|#e4e4de" src/components/screens/Reportes.jsx src/components/screens/Calendario.jsx src/components/screens/auth.jsx`
Expected: sin resultados.

Run: `grep -c "#ff7900" src/components/screens/Calendario.jsx src/components/screens/auth.jsx`
Expected: `Calendario.jsx:2` y `auth.jsx:3` (sin cambios).

- [ ] **Step 6: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 7: Commit**

```bash
git add src/components/screens/Reportes.jsx src/components/screens/Calendario.jsx src/components/screens/auth.jsx
git commit -m "style: tokenize neutral colors in Reportes, Calendario and auth screens"
```

---

## Verificación visual (la corre el controlador al final, con Edge headless)

1. Dashboard en modo demo (`VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite --port 5199`): ejercita `StatCard`, `Badge`, `Button` y los 3 gráficos con los tokens ya en CSS — debe verse igual que la captura de Fase 2, con los ámbar apenas más cálidos.
2. Login con el servidor real (`npm run dev`, sin sesión): pantalla `auth` con fondo `--surface-alt` y cajas tokenizadas.
