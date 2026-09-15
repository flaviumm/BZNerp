# Rediseño ERP — Fase 3b (tokens en flujo comercial + consolidación de neutros) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la migración a tokens: reemplazar en las pantallas del flujo comercial los hex que coinciden exactamente con un token, y consolidar los 12 grises "casi iguales" que hacen de borde/divisor/track o de fondo suave en los dos tokens neutros (`--border`, `--surface`), en pantallas y en los primitivos compartidos.

**Architecture:** Cada cambio es un reemplazo de fragmento hex → `var(--token)` dentro de un archivo (replace-all del hex, que es válido tanto en clases Tailwind con corchetes como en strings CSS inline como `conic-gradient(...)`). Los colores de marca tienen valores distintos y no se ven afectados por construcción; las exclusiones explícitas (`Progress`, `utils.js`, `CaptadorLeads.jsx`, `main.jsx`) simplemente no están en la lista de archivos. Cada task se acota con greps de conteo antes/después y con el conteo de `#ff7900` por archivo como invariante.

**Tech Stack:** React 19 + Vite 7, Tailwind vía CDN Play. Sin dependencias nuevas.

**Spec:** diseño corto aprobado en conversación (fase acotada). Tokens definidos en `index.html` `:root` desde la fase 3a.

## Global Constraints

- No tocar el color de marca ni sus tintes: `#ff7900`, `#d85f00`, `#ff8f1f`, `#fff1e5`, `#fff4ea`, `#fffaf5`, `#fff8f1`, `#ffe0c2`, `#f2c48d`, `#fff3e8`, `#ffd2ad`, `#fff8e8`, `#fff3f1`. El conteo de `#ff7900` en cada archivo tocado debe ser idéntico antes y después.
- No tocar el `bg-[#050505]` del componente `Progress` ni ningún otro `#050505`.
- No tocar `src/lib/utils.js` (sus hex están dentro de HTML de PDF standalone y deben quedar), `src/components/CaptadorLeads.jsx` (paleta propia, decisión aparte), `src/main.jsx` (pantalla de error, sin dependencias), `Presupuestos.jsx` (no tiene hex).
- Las clases `zinc-*`/`white` built-in de Tailwind no se tocan.
- Solo cambia el fragmento hex; el resto de cada línea queda byte-idéntico.
- No agregar frameworks de testing ni dependencias.

## Mapa de reemplazos (aplica a todas las tasks)

| Hex | → token | Familia |
|---|---|---|
| `#ececf0` | `var(--border)` | exacto |
| `#b42318` | `var(--danger)` | exacto |
| `#0f766e` | `var(--success)` | exacto |
| `#f5f5f3` | `var(--surface-alt)` | exacto |
| `#e6e6e2`, `#eeeeec`, `#e4e4de`, `#e4e4e7`, `#f0f0ed`, `#ededeb`, `#edede8`, `#e7e7e2` | `var(--border)` | borde/divisor/track (casi iguales) |
| `#fafaf8`, `#fbfbfa`, `#f7f7f4` | `var(--surface)` | fondo suave (casi iguales) |

---

### Task 1: Pantallas del flujo comercial

**Files:**
- Modify: `src/components/screens/Clientes.jsx`
- Modify: `src/components/screens/CRM.jsx`
- Modify: `src/components/screens/Cotizador.jsx`
- Modify: `src/components/screens/ProcesoVentas.jsx`
- Modify: `src/components/screens/ImportarLeads.jsx`

**Interfaces:**
- Consumes: `--border`, `--danger`, `--success`, `--surface` (definidos en `index.html`).
- No produce nada.

- [ ] **Step 1: Registrar el estado inicial**

Run: `grep -o "#ececf0\|#b42318\|#0f766e\|#fafaf8\|#f0f0ed\|#e6e6e2\|#eeeeec\|#e4e4e7" src/components/screens/Clientes.jsx src/components/screens/CRM.jsx src/components/screens/Cotizador.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/ImportarLeads.jsx | sort | uniq -c`
Expected (ocurrencias por archivo y hex):
- `Clientes.jsx`: `#ececf0` 17, `#fafaf8` 9, `#f0f0ed` 3, `#b42318` 7, `#0f766e` 8
- `CRM.jsx`: `#ececf0` 14, `#fafaf8` 5, `#b42318` 5, `#0f766e` 2
- `Cotizador.jsx`: `#ececf0` 5, `#fafaf8` 3, `#e6e6e2` 1, `#eeeeec` 1
- `ProcesoVentas.jsx`: `#ececf0` 9, `#e4e4e7` 1
- `ImportarLeads.jsx`: `#ececf0` 1

Run: `grep -c "#ff7900" src/components/screens/Clientes.jsx src/components/screens/CRM.jsx src/components/screens/Cotizador.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/ImportarLeads.jsx`
Anotar los 5 números (invariante).

- [ ] **Step 2: Aplicar los reemplazos (replace-all del fragmento hex, por archivo)**

En los 5 archivos, reemplazar TODAS las ocurrencias:
- `#ececf0` → `var(--border)`
- `#b42318` → `var(--danger)`
- `#0f766e` → `var(--success)`
- `#fafaf8` → `var(--surface)`
- `#f0f0ed` → `var(--border)` (solo aparece en Clientes)
- `#e6e6e2` → `var(--border)` (solo en Cotizador)
- `#eeeeec` → `var(--border)` (solo en Cotizador)
- `#e4e4e7` → `var(--border)` (solo en ProcesoVentas)

Ejemplos del resultado esperado: `border-[#ececf0]` → `border-[var(--border)]`; `text-[#b42318]` → `text-[var(--danger)]`; `hover:border-[#0f766e]` → `hover:border-[var(--success)]`; `divide-[#eeeeec]` → `divide-[var(--border)]`; `bg-[#fafaf8]` → `bg-[var(--surface)]`.

- [ ] **Step 3: Confirmar el resultado**

Run: el mismo grep de Step 1.
Expected: sin resultados.

Run: el `grep -c "#ff7900"` de Step 1.
Expected: los mismos 5 números.

Run: `grep -n "#050505" src/components/screens/Clientes.jsx src/components/screens/CRM.jsx src/components/screens/Cotizador.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/ImportarLeads.jsx`
Expected: sin resultados (ninguno de estos archivos lo usa; si aparece, algo se copió mal).

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/Clientes.jsx src/components/screens/CRM.jsx src/components/screens/Cotizador.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/ImportarLeads.jsx
git commit -m "style: tokenize neutral and semantic colors across the commercial screens"
```

---

### Task 2: Consolidar neutros en los primitivos, `index.html` y el shell

**Files:**
- Modify: `src/components/ui/index.jsx`
- Modify: `index.html`
- Modify: `mini_erp_bizon_prototipo.jsx`

**Interfaces:**
- Consumes: `--border`, `--surface`, `--surface-alt`.
- No produce nada.

- [ ] **Step 1: Registrar el estado inicial**

Run: `grep -o "#e7e7e2\|#f7f7f4\|#e6e6e2\|#e4e4de\|#edede8\|#fafaf8\|#eeeeec\|#fbfbfa\|#ededeb" src/components/ui/index.jsx | sort | uniq -c`
Expected: `#e7e7e2` 1, `#f7f7f4` 1, `#e6e6e2` 3, `#e4e4de` 1, `#edede8` 1, `#fafaf8` 1, `#eeeeec` 2, `#fbfbfa` 1, `#ededeb` 1 (total 12).

Run: `grep -c "#ff7900" src/components/ui/index.jsx` — anotar (invariante).
Run: `grep -c "#050505" src/components/ui/index.jsx` — debe ser 1 (`Progress`) antes y después.
Run: `grep -n "#f5f5f3" index.html mini_erp_bizon_prototipo.jsx` — 1 línea en cada archivo.

- [ ] **Step 2: `src/components/ui/index.jsx` — replace-all por fragmento**

- `#e7e7e2` → `var(--border)` (Badge zinc, borde)
- `#e6e6e2` → `var(--border)` (TextInput, Select, TextArea)
- `#e4e4de` → `var(--border)` (MobileNav, píldora inactiva — la rama `border-[#ff7900] bg-[#ff7900]` del mismo ternario queda igual)
- `#edede8` → `var(--border)` (track de `Progress`)
- `#ededeb` → `var(--border)` (track de `CleanBarList`)
- `#eeeeec` → `var(--border)` (2: `divide-[#eeeeec]` en `DataTable` y el `#eeeeec 0deg` dentro del `conic-gradient` de `ProgressRing` — en el string queda `var(--border) 0deg`)
- `#f7f7f4` → `var(--surface)` (Badge zinc, fondo)
- `#fafaf8` → `var(--surface)` (`thead` de `DataTable`)
- `#fbfbfa` → `var(--surface)` (hover de fila de `DataTable`)

- [ ] **Step 3: `index.html`**

Reemplazar:

```css
      body {
        margin: 0;
        background: #f5f5f3;
      }
```

por:

```css
      body {
        margin: 0;
        background: var(--surface-alt);
      }
```

- [ ] **Step 4: `mini_erp_bizon_prototipo.jsx`**

Reemplazar la única ocurrencia de `#f5f5f3` por `var(--surface-alt)` (queda, por ejemplo, `bg-[var(--surface-alt)]`). Nada más en ese archivo.

- [ ] **Step 5: Confirmar el resultado**

Run: el grep de Step 1 sobre `ui/index.jsx`.
Expected: sin resultados.

Run: `grep -c "#ff7900" src/components/ui/index.jsx` → mismo número. `grep -c "#050505" src/components/ui/index.jsx` → 1.
Run: `grep -n "#f5f5f3" index.html mini_erp_bizon_prototipo.jsx` → sin resultados.
Run: `grep -c "var(--surface-alt)" index.html` → 1 (además de la declaración en `:root`, que es `--surface-alt:` sin `var(`, así que no cuenta).

- [ ] **Step 6: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/index.jsx index.html mini_erp_bizon_prototipo.jsx
git commit -m "style: consolidate near-duplicate neutral greys into the border and surface tokens"
```

---

## Verificación visual (la corre el controlador al final, con Edge headless)

1. Dashboard en modo demo (`npx vite --port 5199` en el worktree, que no tiene `.env.local`): tabla/cards con los nuevos `--border`/`--surface`; debe verse igual que la captura de 3a.
2. Login con Supabase configurado (`VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npx vite --port 5198`): inputs con borde `--border`; fondo `--surface-alt` ahora vía `body`.
