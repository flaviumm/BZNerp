# Rediseño ERP — Fase 1 (fundación + shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar los colores neutros/semánticos de la app en CSS custom properties y aplicar el nuevo lenguaje visual (paleta Bone, header compacto, cards con sombra suave, sidebar con secciones colapsables) al shell (Sidebar/Header/Panel), sin tocar ninguna pantalla individual.

**Architecture:** Un módulo nuevo (`src/lib/theme.js`) define los tokens neutros como CSS custom properties en `document.documentElement`, seteados una vez al bootear la app (`src/main.jsx`). Los tres componentes de shell en `src/components/ui/index.jsx` (`Panel`, `Header`, `Sidebar`) consumen esos tokens vía clases Tailwind arbitrarias (`bg-[var(--surface)]`, etc.) en vez de hex hardcodeado. El color de marca (`#ff7900`) NO se toca en este plan — eso es responsabilidad del plan de branding (`2026-09-12-org-branding-settings-design.md`), que agregará `--brand`/`--brand-hover`/`--brand-tint` al mismo `theme.js` más adelante. Tampoco se tocan las clases `zinc-*`/`white` built-in de Tailwind (no son parte del problema de hex hardcodeado que motivó esto) — solo los valores hex arbitrarios de tipo `#ececf0`, `#f7f7f5`, `#111111`, etc.

**Tech Stack:** React 19 + Vite 7, Tailwind vía CDN Play (sin config de build), sin librerías nuevas.

**Spec:** `docs/superpowers/specs/2026-09-13-erp-redesign-fase1-fundacion-shell.md`

## Global Constraints

- No tocar el color de marca (`#ff7900` y derivados) en ningún archivo — eso pertenece al plan de branding, no a este.
- No tocar ninguna pantalla bajo `src/components/screens/` — el alcance es exclusivamente `Panel`, `Header`, `Sidebar` en `src/components/ui/index.jsx`, más `src/lib/theme.js` y `src/main.jsx`.
- No agregar frameworks de testing: el spec ya determinó que esta fase es CSS + un `Set` de estado de UI, sin lógica no trivial — la verificación de cada task es `npm run build` + una comprobación manual puntual en el navegador, no un test automatizado.
- No persistir el estado de colapso de las secciones del sidebar (no se pidió).

---

### Task 1: Tokens neutros/semánticos (`src/lib/theme.js`)

**Files:**
- Create: `src/lib/theme.js`
- Modify: `src/main.jsx`

**Interfaces:**
- Produces: `applyBaseTheme(): void` — exportada desde `src/lib/theme.js`. Sin argumentos, sin valor de retorno. Efecto secundario: fija 8 CSS custom properties (`--surface`, `--surface-alt`, `--border`, `--text`, `--text-muted`, `--success`, `--warning`, `--danger`) en `document.documentElement.style`. Las Tasks 3 y 4 consumen estas variables por nombre.

- [ ] **Step 1: Crear `src/lib/theme.js`**

```js
export function applyBaseTheme() {
  const root = document.documentElement.style;
  root.setProperty("--surface", "#fbfbf8");
  root.setProperty("--surface-alt", "#f5f5f3");
  root.setProperty("--border", "#ececf0");
  root.setProperty("--text", "#18181b");
  root.setProperty("--text-muted", "#71717a");
  root.setProperty("--success", "#0f766e");
  root.setProperty("--warning", "#b45309");
  root.setProperty("--danger", "#b42318");
}
```

- [ ] **Step 2: Llamar `applyBaseTheme()` al bootear la app**

En `src/main.jsx`, agregar el import junto a los demás imports del tope del archivo:

```js
import { applyBaseTheme } from "./lib/theme";
```

E invocarla como primera línea ejecutable del archivo, inmediatamente después de los imports y antes de `function AppFallback(...)`:

```js
applyBaseTheme();
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin errores (el resultado ya visto en esta sesión es `✓ built in ~4s`).

- [ ] **Step 4: Verificar en el navegador que las variables quedan seteadas**

Run: `npm run dev`, abrir `http://127.0.0.1:5173`, abrir la consola del navegador y ejecutar:

```js
getComputedStyle(document.documentElement).getPropertyValue('--surface')
```

Expected: devuelve `" #fbfbf8"` (o `"#fbfbf8"` según el navegador).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.js src/main.jsx
git commit -m "feat: add base theme tokens as CSS custom properties"
```

---

### Task 2: Restyle `Panel` — sombra suave sin borde

**Files:**
- Modify: `src/components/ui/index.jsx:63-65`

**Interfaces:**
- No consume ni produce nada usado por otras tasks — `Panel` es una hoja terminal (los cambios son puramente visuales, la firma de props no cambia).

- [ ] **Step 1: Cambiar la clase base de `Panel`**

Reemplazar:

```jsx
export function Panel({ children, className = "" }) {
  return <section className={`rounded-[22px] border border-[#ececf0] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.035)] ${className}`}>{children}</section>;
}
```

por:

```jsx
export function Panel({ children, className = "" }) {
  return <section className={`rounded-[22px] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)] ${className}`}>{children}</section>;
}
```

(Se quita el borde y se sube la sombra de opacidad .035 a .06 — el valor exacto aprobado en el companion visual de brainstorming.)

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`, abrir el Dashboard. Expected: las cards (Pipeline abierto, Presupuestos, OT en ejecucion, Cuentas por cobrar y los paneles de abajo) se ven sin borde visible y con una sombra un poco más marcada que antes, sin overlaps raros entre cards.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/index.jsx
git commit -m "style: give Panel a soft shadow instead of a border"
```

---

### Task 3: Restyle `Header` con los tokens neutros

**Files:**
- Modify: `src/components/ui/index.jsx:90-118`

**Interfaces:**
- Consumes: `--surface`, `--border`, `--text` (definidas en Task 1, ya activas globalmente vía `applyBaseTheme()`).
- No cambia la firma de `Header({ activeLabel, databaseStatus, profile })` ni su contenido (el nombre de la organización real todavía no existe como dato — eso lo agrega el plan de branding; por ahora el texto "Bizon ERP Industrial" queda igual).

- [ ] **Step 1: Cambiar las clases de superficie del `<header>`**

Reemplazar:

```jsx
    <header className="border-b border-[#ececf0] bg-white/95 px-4 py-4 backdrop-blur md:px-8">
```

por:

```jsx
    <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 md:px-8">
```

(Se quita `backdrop-blur` y la opacidad `/95`: con un fondo sólido de superficie no hace falta transparencia ni blur.)

- [ ] **Step 2: Cambiar el color del título**

Reemplazar:

```jsx
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111]">{activeLabel}</h1>
```

por:

```jsx
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">{activeLabel}</h1>
```

- [ ] **Step 3: Cambiar el borde del chip de perfil**

Reemplazar:

```jsx
            <div className="flex items-center gap-3 rounded-2xl border border-[#ececf0] bg-white px-3 py-2">
```

por:

```jsx
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-3 py-2">
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Verificar visualmente**

Run: `npm run dev`, mirar el header en cualquier pantalla. Expected: fondo del header ligeramente hueso (no blanco puro), sin efecto de blur, título y borde inferior visualmente iguales a antes (los valores hex son los mismos, solo centralizados).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/index.jsx
git commit -m "style: wire Header surface colors to base theme tokens"
```

---

### Task 4: Sidebar — tokens + secciones colapsables + renombrar sección de super-admin

**Files:**
- Modify: `src/components/ui/index.jsx:1` (import), `src/components/ui/index.jsx:120-180` (`Sidebar`)
- Modify: `mini_erp_bizon_prototipo.jsx:244`

**Interfaces:**
- Consumes: `--surface`, `--border`, `--surface-alt` (Task 1). `Sidebar` sigue recibiendo las mismas props que hoy (`active, setActive, availableScreens, menuSections, databaseStatus, collapsed, onToggleCollapsed, onNew, onExportBackup, onResetLocal, onSignOut`) — no se agrega ni saca ninguna.
- No produce nada consumido por otra task — es la última del plan.

- [ ] **Step 1: Importar `useState` en `src/components/ui/index.jsx`**

Reemplazar la línea 1:

```jsx
import React from "react";
```

por:

```jsx
import React, { useState } from "react";
```

- [ ] **Step 2: Restylear las superficies del `Sidebar`**

Reemplazar la apertura del `<aside>`:

```jsx
    <aside className={`hidden h-screen shrink-0 border-r border-[#ececf0] bg-white p-3 transition-all duration-200 lg:block ${collapsed ? "w-16" : "w-44"}`}>
```

por:

```jsx
    <aside className={`hidden h-screen shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-3 transition-all duration-200 lg:block ${collapsed ? "w-16" : "w-44"}`}>
```

Reemplazar el borde inferior del bloque del logo:

```jsx
        <div className={`relative flex min-h-16 items-center border-b border-[#ececf0] pb-5 ${collapsed ? "justify-center" : "justify-start pr-12"}`}>
```

por:

```jsx
        <div className={`relative flex min-h-16 items-center border-b border-[var(--border)] pb-5 ${collapsed ? "justify-center" : "justify-start pr-12"}`}>
```

Reemplazar el borde del botón de colapsar (queda `bg-white` igual, es un botón chico que se destaca sobre la superficie a propósito):

```jsx
          <button type="button" onClick={onToggleCollapsed} className="absolute right-0 top-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ececf0] bg-white text-zinc-500 transition hover:border-[#ff7900] hover:text-[#ff7900] lg:inline-flex" title={collapsed ? "Expandir menu" : "Contraer menu"}>
```

por:

```jsx
          <button type="button" onClick={onToggleCollapsed} className="absolute right-0 top-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-zinc-500 transition hover:border-[#ff7900] hover:text-[#ff7900] lg:inline-flex" title={collapsed ? "Expandir menu" : "Contraer menu"}>
```

Reemplazar el borde superior de la zona de botones de acciones al pie:

```jsx
        <div className={`mt-5 border-t border-[#ececf0] pt-4 ${collapsed ? "grid justify-center gap-2" : "grid gap-2"}`}>
```

por:

```jsx
        <div className={`mt-5 border-t border-[var(--border)] pt-4 ${collapsed ? "grid justify-center gap-2" : "grid gap-2"}`}>
```

- [ ] **Step 3: Agregar el estado de colapso por sección**

Dentro de la función `Sidebar`, inmediatamente después de la línea `const hasDatabaseError = databaseStatus === "Error de base";`, agregar:

```jsx
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const initiallyCollapsed = new Set(menuSections.map((section) => section.title));
    const activeSection = menuSections.find((section) => section.keys.includes(active));
    if (activeSection) initiallyCollapsed.delete(activeSection.title);
    return initiallyCollapsed;
  });

  function toggleGroup(title) {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }
```

- [ ] **Step 4: Hacer las secciones colapsables en el render**

Reemplazar el bloque completo del `<nav>` (desde `<nav className="scrollbar-none ...` hasta el `</nav>` que le corresponde):

```jsx
        <nav className="scrollbar-none mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-0">
          {menuSections.map((section) => (
            <div key={section.title}>
              {!collapsed && <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{section.title}</p>}
              <div className="space-y-1.5">
                {section.keys.map((key) => screens.find((item) => item.key === key)).filter(Boolean).map((item) => {
                  const allowed = allowedKeys.has(item.key);
                  const isActive = active === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!allowed}
                      onClick={() => allowed && setActive(item.key)}
                      title={allowed ? item.label : "Bloqueado para este rol"}
                      className={`group flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-[13px] font-medium transition ${collapsed ? "justify-center px-0" : ""} ${
                        isActive
                          ? "bg-[#ff7900] text-black shadow-[0_12px_25px_rgba(255,121,0,0.22)]"
                          : allowed
                            ? "text-zinc-500 hover:bg-[#f7f7f5] hover:text-zinc-950"
                            : "cursor-not-allowed text-zinc-300"
                      }`}
                    >
                      <IconMark active={isActive} icon={item.icon} />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
```

por:

```jsx
        <nav className="scrollbar-none mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-0">
          {menuSections.map((section) => {
            const sectionCollapsed = !collapsed && collapsedGroups.has(section.title);
            return (
              <div key={section.title}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.title)}
                    className="mb-3 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
                  >
                    <span>{section.title}</span>
                    <span>{sectionCollapsed ? "›" : "⌄"}</span>
                  </button>
                )}
                {!sectionCollapsed && (
                  <div className="space-y-1.5">
                    {section.keys.map((key) => screens.find((item) => item.key === key)).filter(Boolean).map((item) => {
                      const allowed = allowedKeys.has(item.key);
                      const isActive = active === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          disabled={!allowed}
                          onClick={() => allowed && setActive(item.key)}
                          title={allowed ? item.label : "Bloqueado para este rol"}
                          className={`group flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-[13px] font-medium transition ${collapsed ? "justify-center px-0" : ""} ${
                            isActive
                              ? "bg-[#ff7900] text-black shadow-[0_12px_25px_rgba(255,121,0,0.22)]"
                              : allowed
                                ? "text-zinc-500 hover:bg-[var(--surface-alt)] hover:text-zinc-950"
                                : "cursor-not-allowed text-zinc-300"
                          }`}
                        >
                          <IconMark active={isActive} icon={item.icon} />
                          {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
```

Nota: `"›"` es `›` (grupo colapsado) y `"⌄"` es `⌄` (grupo expandido) — se usan escapes unicode para evitar problemas de encoding en el archivo fuente.

- [ ] **Step 5: Renombrar la sección dinámica de super-admin**

En `mini_erp_bizon_prototipo.jsx`, reemplazar:

```js
  const sidebarMenuSections = profile?.isSuperAdmin
    ? [...menuSections, { title: "Plataforma", keys: ["organizaciones"] }]
    : menuSections;
```

por:

```js
  const sidebarMenuSections = profile?.isSuperAdmin
    ? [...menuSections, { title: "Administracion", keys: ["organizaciones"] }]
    : menuSections;
```

(Cuando exista la pantalla Configuracion — plan de branding — se agrega `"configuracion"` a este mismo array de `keys`. No se hace ahora porque esa pantalla todavia no existe.)

- [ ] **Step 6: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 7: Verificar el comportamiento en el navegador**

Run: `npm run dev`, loguearse como en la sesión anterior (usuario admin). Expected:
- El sidebar arranca con la sección "Gestion comercial" expandida (porque Dashboard está activo) y "Operacion"/"Control" colapsadas mostrando solo el título con `›`.
- Clickear el título de una sección colapsada la expande (cambia a `⌄` y aparecen sus items).
- Clickear un item de otra sección (ej. "Inventario") navega correctamente y no rompe el estado de las demás secciones.
- Con el sidebar en modo icono (botón de colapsar arriba a la derecha del logo), se siguen viendo todos los iconos sin importar el estado de colapso de las secciones (el acordeón no aplica en modo icono).
- Si el usuario logueado es super-admin, aparece una sección "Administracion" con "Organizaciones" (antes decía "Plataforma").

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/index.jsx mini_erp_bizon_prototipo.jsx
git commit -m "feat: collapsible sidebar sections and neutral surface tokens"
```
