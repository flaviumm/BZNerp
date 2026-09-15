# Rediseño ERP — Fase 2 (Dashboard KPI cards + reparación de paneles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar las 4 KPI cards del Dashboard al patrón "dato + contexto derivado + acción", consumir los tokens de Fase 1 en el Dashboard, y reparar la regresión de Fase 1 por la que 12 paneles con `shadow-none` quedaron sin borde ni sombra.

**Architecture:** Cuatro funciones puras nuevas en `src/lib/utils.js` calculan el contexto derivado (vencidos, atrasados, conteos por estado) comparando strings ISO `YYYY-MM-DD`; un script `assert` en `scripts/` las verifica sin framework. `StatCard` (`src/components/ui/index.jsx`) gana 4 props opcionales, compatibles con sus ~35 usos actuales. `Dashboard.jsx` llama a los helpers y pasa los props nuevos, y cambia sus hex neutros por las CSS vars de Fase 1. La reparación es quitar literalmente la clase `shadow-none` en 12 lugares de 5 archivos — nada más cambia en las pantallas ajenas al Dashboard.

**Tech Stack:** React 19 + Vite 7, Tailwind vía CDN Play, Node ≥ 20 (`node:assert`), sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-14-erp-redesign-fase2-dashboard.md`

## Global Constraints

- No tocar el color de marca (`#ff7900` y derivados, incluidos los rellenos naranjas de los gráficos del Dashboard) — pertenece al plan de branding.
- En las pantallas fuera del Dashboard (`Clientes.jsx`, `Cotizador.jsx`, `CRM.jsx`) el ÚNICO cambio permitido es borrar la clase `shadow-none`; ninguna otra clase, lógica o texto.
- No agregar frameworks de testing ni dependencias: la única verificación automatizada es `scripts/check-dashboard-metrics.mjs` con `node:assert`.
- Las clases `zinc-*`/`white` built-in de Tailwind no se tocan; solo los hex arbitrarios listados.
- Los 3 paneles del medio del Dashboard, sus gráficos custom y el layout general no cambian.

---

### Task 1: Helpers de métricas derivadas + script de chequeo

**Files:**
- Modify: `src/lib/utils.js` (agregar 4 funciones al final del archivo, después de `toneForStatus`)
- Create: `scripts/check-dashboard-metrics.mjs`

**Interfaces:**
- Produces (exportadas desde `src/lib/utils.js`, consumidas por Task 4):
  - `dueWithinDays(list, limitIso, field = "due")` → array con los items cuyo `item[field]` es fecha válida y `≤ limitIso` (string `YYYY-MM-DD`).
  - `overdueWorkOrders(list, todayIso)` → array con las OT cuyo `end` es fecha válida, `< todayIso`, y `Number(progress || 0) < 100`.
  - `overdueReceivables(list, todayIso)` → array con las facturas con `status !== "Cobrada"`, `due` válido y `< todayIso`.
  - `quotesByStatus(list)` → objeto `{ [status]: count }`.
- Consumes: `isValidDateValue` (ya existe en el mismo archivo).

- [ ] **Step 1: Escribir el script de chequeo (falla porque las funciones no existen)**

Crear `scripts/check-dashboard-metrics.mjs`:

```js
import assert from "node:assert/strict";
import { dueWithinDays, overdueWorkOrders, overdueReceivables, quotesByStatus } from "../src/lib/utils.js";

const today = "2026-09-14";
const in30 = "2026-10-14";

// dueWithinDays: incluye vencidas y las que vencen hasta el límite, excluye posteriores e inválidas
const opportunities = [
  { id: 1, due: "2026-09-01" },
  { id: 2, due: "2026-10-14" },
  { id: 3, due: "2026-10-15" },
  { id: 4, due: "" },
];
assert.deepEqual(dueWithinDays(opportunities, in30).map((o) => o.id), [1, 2]);

// overdueWorkOrders: fin pasado + progreso < 100. Progreso 100 NO cuenta. Fin futuro NO cuenta.
const workOrders = [
  { number: "OT-1", end: "2026-09-01", progress: 55 },
  { number: "OT-2", end: "2026-09-01", progress: 100 },
  { number: "OT-3", end: "2026-09-20", progress: 10 },
  { number: "OT-4", end: "2026-09-13", progress: 0 },
];
assert.deepEqual(overdueWorkOrders(workOrders, today).map((o) => o.number), ["OT-1", "OT-4"]);

// overdueReceivables: no cobrada + vencimiento pasado. Cobrada NO cuenta aunque esté vencida. Hoy mismo NO está vencida.
const invoices = [
  { number: "F-1", status: "Pendiente", due: "2026-09-01", total: 100 },
  { number: "F-2", status: "Cobrada", due: "2026-09-01", total: 200 },
  { number: "F-3", status: "Por vencer", due: "2026-09-14", total: 300 },
  { number: "F-4", status: "Pendiente", due: "2026-09-30", total: 400 },
];
assert.deepEqual(overdueReceivables(invoices, today).map((i) => i.number), ["F-1"]);

// quotesByStatus: conteo por estado, estados ausentes simplemente no aparecen
const quotes = [{ status: "Enviado" }, { status: "Enviado" }, { status: "Borrador" }];
assert.deepEqual(quotesByStatus(quotes), { Enviado: 2, Borrador: 1 });
assert.equal(quotesByStatus(quotes)["En revision"], undefined);

console.log("check-dashboard-metrics: ALL PASS");
```

- [ ] **Step 2: Correr el script y confirmar que falla**

Run: `node scripts/check-dashboard-metrics.mjs`
Expected: falla con `SyntaxError: The requested module '../src/lib/utils.js' does not provide an export named 'dueWithinDays'` (o equivalente).

Si en cambio falla por no poder importar `xlsx` (que `utils.js` importa arriba de todo), reportar NEEDS_CONTEXT con el error exacto — no improvisar un workaround.

- [ ] **Step 3: Implementar las 4 funciones**

Agregar al FINAL de `src/lib/utils.js`, después de la función `toneForStatus` (que termina con `return "zinc";` y `}`):

```js
function isoDay(value) {
  return String(value).slice(0, 10);
}

export function dueWithinDays(list, limitIso, field = "due") {
  return list.filter((item) => isValidDateValue(item[field]) && isoDay(item[field]) <= limitIso);
}

export function overdueWorkOrders(list, todayIso) {
  return list.filter((order) => isValidDateValue(order.end) && isoDay(order.end) < todayIso && Number(order.progress || 0) < 100);
}

export function overdueReceivables(list, todayIso) {
  return list.filter((invoice) => invoice.status !== "Cobrada" && isValidDateValue(invoice.due) && isoDay(invoice.due) < todayIso);
}

export function quotesByStatus(list) {
  return list.reduce((counts, quote) => {
    counts[quote.status] = (counts[quote.status] || 0) + 1;
    return counts;
  }, {});
}
```

- [ ] **Step 4: Correr el script y confirmar que pasa**

Run: `node scripts/check-dashboard-metrics.mjs`
Expected: `check-dashboard-metrics: ALL PASS`, exit code 0, sin otra salida.

- [ ] **Step 5: Verificar que el build sigue limpio**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.js scripts/check-dashboard-metrics.mjs
git commit -m "feat: add derived dashboard metric helpers with assert check"
```

---

### Task 2: Reparación — quitar los 12 `shadow-none` de `Panel`

**Files:**
- Modify: `src/components/ui/index.jsx` (2 lugares: `StatCard`, `DataTable`)
- Modify: `src/components/screens/Dashboard.jsx` (2 lugares)
- Modify: `src/components/screens/Clientes.jsx` (1 lugar)
- Modify: `src/components/screens/Cotizador.jsx` (5 lugares)
- Modify: `src/components/screens/CRM.jsx` (2 lugares)

**Interfaces:**
- No produce ni consume nada. Es un cambio de clases CSS, puramente mecánico. Task 3 asume que `StatCard` ya quedó como `<Panel className="p-5">` (sin `shadow-none`).

- [ ] **Step 1: Confirmar el estado inicial**

Run: `grep -rn "shadow-none" src`
Expected: exactamente 12 líneas, en los 5 archivos listados.

- [ ] **Step 2: Aplicar los 12 reemplazos**

En cada uno, borrar el fragmento ` shadow-none` (con el espacio previo) y nada más:

`src/components/ui/index.jsx`:
- `<Panel className="p-5 shadow-none">` → `<Panel className="p-5">`
- `<Panel className="overflow-hidden shadow-none">` → `<Panel className="overflow-hidden">`

`src/components/screens/Dashboard.jsx`:
- `<Panel className="p-7 shadow-none">` → `<Panel className="p-7">`
- `<Panel className="p-5 shadow-none">` → `<Panel className="p-5">`

`src/components/screens/Clientes.jsx`:
- `className="flex min-h-[360px] flex-col overflow-hidden shadow-none"` → `className="flex min-h-[360px] flex-col overflow-hidden"`

`src/components/screens/Cotizador.jsx` (4 iguales + 1 distinto):
- `<Panel className="p-5 shadow-none">` → `<Panel className="p-5">` (4 veces)
- `<Panel className="overflow-hidden shadow-none">` → `<Panel className="overflow-hidden">`

`src/components/screens/CRM.jsx`:
- `className="min-h-[460px] min-w-0 p-3 shadow-none"` → `className="min-h-[460px] min-w-0 p-3"`
- dentro del template literal: `` className={`min-h-[520px] min-w-0 p-3 shadow-none transition ${ `` → `` className={`min-h-[520px] min-w-0 p-3 transition ${ `` (el resto de la expresión queda idéntico)

- [ ] **Step 3: Confirmar que no queda ninguno**

Run: `grep -rn "shadow-none" src`
Expected: sin resultados (exit code 1 de grep).

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Verificar visualmente**

Run: `npm run dev`, abrir Dashboard y Clientes. Expected: las KPI cards, el panel hero, las alertas de stock, las cards de empresa y la tabla de Clientes muestran una sombra suave que las separa del fondo (antes se veían sin borde ni sombra). Si no hay acceso a navegador, decirlo explícitamente en el reporte.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/index.jsx src/components/screens/Dashboard.jsx src/components/screens/Clientes.jsx src/components/screens/Cotizador.jsx src/components/screens/CRM.jsx
git commit -m "fix: drop shadow-none overrides so borderless Panels keep their shadow"
```

---

### Task 3: Extender `StatCard` con `detail` / `detailTone` / `onAction` / `actionLabel`

**Files:**
- Modify: `src/components/ui/index.jsx` (solo la función `StatCard`)

**Interfaces:**
- Produces (consumido por Task 4): `StatCard({ title, value, subtitle, tone, chart, detail, detailTone, onAction, actionLabel })`. Los 4 props nuevos son opcionales; sin ellos el render es idéntico al actual.

- [ ] **Step 1: Reemplazar la función `StatCard` completa**

Reemplazar (estado tras Task 2 — ya sin `shadow-none`):

```jsx
export function StatCard({ title, value, subtitle, tone = "zinc", chart = [] }) {
  const colors = {
    zinc: "text-zinc-500 bg-zinc-100",
    green: "text-[#0f766e] bg-[#ecfdf5]",
    amber: "text-[#a16207] bg-[#fff8e1]",
    red: "text-[#b42318] bg-[#fff1f1]",
    blue: "text-[#334155] bg-[#eef2f7]",
  };
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-zinc-500">{title}</p>
          <p className="mt-5 text-[28px] font-semibold leading-none tracking-tight text-[#050505]">{value}</p>
          <p className="mt-3 text-[13px] font-semibold text-zinc-400">{subtitle}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone] || colors.zinc}`}><MenuGlyph name="chart" /></span>
      </div>
      {!!chart.length && <MiniSparkBars values={chart} tone={tone} />}
    </Panel>
  );
}
```

por:

```jsx
export function StatCard({ title, value, subtitle, tone = "zinc", chart = [], detail, detailTone, onAction, actionLabel }) {
  const colors = {
    zinc: "text-zinc-500 bg-zinc-100",
    green: "text-[#0f766e] bg-[#ecfdf5]",
    amber: "text-[#a16207] bg-[#fff8e1]",
    red: "text-[#b42318] bg-[#fff1f1]",
    blue: "text-[#334155] bg-[#eef2f7]",
  };
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-zinc-500">{title}</p>
          <p className="mt-5 text-[28px] font-semibold leading-none tracking-tight text-[var(--text)]">{value}</p>
          <p className="mt-3 text-[13px] font-semibold text-zinc-400">{subtitle}</p>
          {detail && (
            <p className={`mt-2 text-[12px] font-semibold ${detailTone === "danger" ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>{detail}</p>
          )}
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone] || colors.zinc}`}><MenuGlyph name="chart" /></span>
      </div>
      {!!chart.length && <MiniSparkBars values={chart} tone={tone} />}
      {onAction && actionLabel && (
        <button type="button" onClick={onAction} className="mt-4 text-[12px] font-semibold text-zinc-600 transition hover:text-[var(--text)]">
          {actionLabel} {"→"}
        </button>
      )}
    </Panel>
  );
}
```

(Cambios: 4 props nuevos; `text-[#050505]` del valor → `text-[var(--text)]`; línea `detail` condicional; botón de acción condicional. El objeto `colors` con sus hex de tono NO cambia — son tonos semánticos de ícono, no forman parte de este alcance.)

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Verificar que los usos existentes no cambian**

Run: `npm run dev`, abrir CRM (4 StatCards sin props nuevos). Expected: se ven igual que antes, sin línea extra ni botón. Si no hay navegador, confirmar leyendo el diff que `detail` y el botón solo se renderizan cuando los props vienen.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/index.jsx
git commit -m "feat: StatCard accepts derived-context detail and an action link"
```

---

### Task 4: Dashboard — 4 KPI cards con contexto y acción + tokens

**Files:**
- Modify: `src/components/screens/Dashboard.jsx`

**Interfaces:**
- Consumes: `dueWithinDays`, `overdueWorkOrders`, `overdueReceivables`, `quotesByStatus`, `addDaysIso`, `sum`, `money` de `src/lib/utils.js` (Task 1 + existentes); props `detail`/`detailTone`/`onAction`/`actionLabel` de `StatCard` (Task 3); `setActive` ya llega como prop del Dashboard.
- Produces: nada consumido por otra task — es la última.

- [ ] **Step 1: Ampliar el import de utils**

Reemplazar:

```js
import { money, sum, weightedPipeline } from "../../lib/utils";
```

por:

```js
import { money, sum, weightedPipeline, addDaysIso, dueWithinDays, overdueWorkOrders, overdueReceivables, quotesByStatus } from "../../lib/utils";
```

- [ ] **Step 2: Calcular las métricas derivadas**

Inmediatamente después de la línea `const stockAlerts = data.inventory.filter((item) => item.stock <= item.min);` agregar:

```js
  const today = addDaysIso(0);
  const dueSoon = dueWithinDays(data.opportunities, addDaysIso(30));
  const quoteCounts = quotesByStatus(data.quotes);
  const lateOrders = overdueWorkOrders(data.workOrders, today);
  const overdueTotal = sum(overdueReceivables(data.invoices, today), "total");
```

- [ ] **Step 3: Reemplazar las 4 StatCards**

Reemplazar el bloque:

```jsx
        <StatCard title="Pipeline abierto" value={money(pipelineTotal)} subtitle={`${data.opportunities.length} oportunidades`} tone="green" chart={data.opportunities.map((item) => item.amount)} />
        <StatCard title="Presupuestos" value={data.quotes.filter((item) => item.status !== "Aprobado").length} subtitle="Pendientes o en revision" tone="blue" chart={data.quotes.map((item) => item.total)} />
        <StatCard title="OT en ejecucion" value={data.workOrders.filter((item) => item.status === "En ejecucion").length} subtitle={`${data.workOrders.length} ordenes totales`} tone="amber" chart={data.workOrders.map((item) => item.progress)} />
        <StatCard title="Cuentas por cobrar" value={money(sum(receivables, "total"))} subtitle={`${receivables.length} facturas pendientes`} tone="red" chart={receivables.map((item) => item.total)} />
```

por:

```jsx
        <StatCard
          title="Pipeline abierto"
          value={money(pipelineTotal)}
          subtitle={`${data.opportunities.length} oportunidades`}
          tone="green"
          chart={data.opportunities.map((item) => item.amount)}
          detail={`${dueSoon.length} vencen en 30 dias · forecast ${money(winForecast)}`}
          onAction={() => setActive("crm")}
          actionLabel="Ver CRM"
        />
        <StatCard
          title="Presupuestos"
          value={data.quotes.filter((item) => item.status !== "Aprobado").length}
          subtitle="Pendientes o en revision"
          tone="blue"
          chart={data.quotes.map((item) => item.total)}
          detail={`${quoteCounts["Enviado"] || 0} enviados · ${quoteCounts["En revision"] || 0} en revision · ${quoteCounts["Borrador"] || 0} borrador`}
          onAction={() => setActive("presupuestos")}
          actionLabel="Ver presupuestos"
        />
        <StatCard
          title="OT en ejecucion"
          value={data.workOrders.filter((item) => item.status === "En ejecucion").length}
          subtitle={`${data.workOrders.length} ordenes totales`}
          tone="amber"
          chart={data.workOrders.map((item) => item.progress)}
          detail={`${lateOrders.length} atrasadas`}
          detailTone={lateOrders.length ? "danger" : undefined}
          onAction={() => setActive("ot")}
          actionLabel="Ver ordenes"
        />
        <StatCard
          title="Cuentas por cobrar"
          value={money(sum(receivables, "total"))}
          subtitle={`${receivables.length} facturas pendientes`}
          tone="red"
          chart={receivables.map((item) => item.total)}
          detail={`${money(overdueTotal)} vencido`}
          detailTone={overdueTotal > 0 ? "danger" : undefined}
          onAction={() => setActive("finanzas")}
          actionLabel="Ver finanzas"
        />
```

(Los textos van sin tildes, igual que el resto de la app — "dias", "revision", "ordenes".)

- [ ] **Step 4: Tokenizar los hex neutros del archivo**

Reemplazar TODAS las ocurrencias en `Dashboard.jsx` (son 4, 2 y 2 respectivamente):
- `border-[#ecece6] bg-[#fbfbf8]` → `border-[var(--border)] bg-[var(--surface)]`
- `text-[#b42318]` → `text-[var(--danger)]`
- `text-[#050505]` → `text-[var(--text)]`

No tocar `text-[#ff7900]` (línea "Vista general") ni ninguna clase `zinc-*`.

- [ ] **Step 5: Confirmar que no queda ningún hex neutro**

Run: `grep -n "#ecece6\|#fbfbf8\|#b42318\|#050505" src/components/screens/Dashboard.jsx`
Expected: sin resultados. Y `grep -c "#ff7900" src/components/screens/Dashboard.jsx` debe seguir dando `1`.

- [ ] **Step 6: Verificar que compila y que el chequeo sigue pasando**

Run: `npm run build && node scripts/check-dashboard-metrics.mjs`
Expected: build exitoso y `check-dashboard-metrics: ALL PASS`.

- [ ] **Step 7: Verificar visualmente**

Run: `npm run dev`, loguearse, abrir Dashboard. Expected:
- Cada una de las 4 cards muestra una línea de detalle debajo del subtítulo y un link "Ver … →" al pie.
- Con los datos demo (fechas de mayo 2026) "OT en ejecucion" dice `N atrasadas` en rojo y "Cuentas por cobrar" dice `$… vencido` en rojo — es lo esperado, las fechas demo ya pasaron.
- Click en "Ver CRM" navega al CRM; "Ver finanzas" a Finanzas.
- Las cajas de resumen de los 3 paneles del medio y las alertas de stock se ven igual que antes (fondo hueso, borde suave).
Si no hay acceso a navegador/login, indicar exactamente qué se verificó y qué no.

- [ ] **Step 8: Commit**

```bash
git add src/components/screens/Dashboard.jsx
git commit -m "feat: dashboard KPI cards show derived context and link to their module"
```
