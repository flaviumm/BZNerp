# Rediseño ERP — Fase 2: Dashboard (KPI cards) + reparación de paneles

## Contexto

Segunda fase del rediseño del ERP (ver
`2026-09-13-erp-redesign-fase1-fundacion-shell.md` para la decomposición y
la fundación de tokens). La Fase 1 dejó: tokens neutros/semánticos como CSS
custom properties (`src/lib/theme.js`), `Panel` con sombra suave y sin
borde, `Header`/`Sidebar`/`MobileNav` tokenizados, sidebar con secciones
colapsables.

El usuario eligió para esta fase un alcance **medio**: rehacer las 4 KPI
cards del Dashboard según el patrón "dato + contexto + variación + acción"
del brief de UX, dejando el resto de la pantalla (3 paneles con gráficos
custom, alertas de stock, layout general) igual.

Dos hallazgos durante el brainstorming condicionan el diseño:

1. **No hay datos históricos.** Ninguna entidad guarda snapshots de períodos
   anteriores, así que una "variación vs. mes anterior" no se puede
   calcular honestamente. Se decidió reemplazarla por **contexto derivable
   hoy** (desgloses reales calculables con los datos actuales: vencidos,
   atrasados, por estado) en vez de inventar un porcentaje o construir
   infraestructura de snapshots.
2. **Regresión de Fase 1.** `Panel` perdió el borde, pero 12 lugares le
   pasan `shadow-none` para anular la sombra — antes eso daba "solo borde",
   hoy da un panel sin borde ni sombra, invisible contra el fondo. Afecta a
   `StatCard` (todas las KPI cards de 10 pantallas), `DataTable` (todas las
   tablas) y paneles sueltos en Dashboard, Clientes, Cotizador y CRM. El
   usuario decidió incluir la reparación completa (los 12) en esta fase.

## Alcance

Incluye:
- Extender `StatCard` con props opcionales `detail`, `detailTone`,
  `onAction`, `actionLabel` — compatible hacia atrás con los ~35 usos
  existentes, que no cambian.
- Rehacer las 4 KPI cards del Dashboard con contexto derivado y acción.
- Consumir los tokens de Fase 1 en `Dashboard.jsx` (hex neutros → vars;
  `#b42318` → `--danger`; `#050505` → `--text`).
- Reparación: quitar los 12 `shadow-none` pasados a `Panel`.

No incluye:
- Snapshots históricos / tendencia real (decisión explícita, ver arriba).
- Los 3 paneles del medio del Dashboard, sus gráficos custom
  (`DashboardLineChart`, `DashboardRadialChart`, `DashboardStackChart`,
  `MiniSparkBars`) ni el panel de alertas de stock (más allá de tokens y
  `shadow-none`).
- Cambios de layout general del Dashboard.
- El color de marca (`#ff7900` y derivados, incluidos los rellenos naranjas
  de los gráficos) — sigue perteneciendo al plan de branding.
- Rediseño de las otras pantallas donde se quita `shadow-none` (solo se
  quita esa clase, nada más).

## Diseño

### 1. Reparación de `shadow-none`

Eliminar la clase `shadow-none` en estos 12 lugares (sin tocar el resto de
cada `className`):

| Archivo | Ocurrencias |
|---|---|
| `src/components/ui/index.jsx` | `StatCard` (`<Panel className="p-5 shadow-none">`), `DataTable` (`<Panel className="overflow-hidden shadow-none">`) |
| `src/components/screens/Dashboard.jsx` | hero (`p-7 shadow-none`), alertas de stock (`p-5 shadow-none`) |
| `src/components/screens/Clientes.jsx` | 1 (card de empresa) |
| `src/components/screens/Cotizador.jsx` | 5 |
| `src/components/screens/CRM.jsx` | 2 (columnas del tablero; una de ellas dentro de un template literal) |

Resultado: todos los paneles reciben la sombra suave de Fase 1, que es lo
que esa fase pretendía ("se propaga a toda la app").

### 2. `StatCard` extendida

Firma nueva en `src/components/ui/index.jsx`:

```jsx
export function StatCard({ title, value, subtitle, tone = "zinc", chart = [], detail, detailTone, onAction, actionLabel })
```

- `detail` (string, opcional): línea de contexto, debajo del subtítulo, en
  gris muted (`text-[var(--text-muted)]`).
- `detailTone` (opcional): si es `"danger"`, `detail` se pinta con
  `text-[var(--danger)]`.
- `onAction` + `actionLabel` (opcionales): si ambos vienen, se renderiza un
  botón-link chico al pie de la card (`actionLabel` + `→`), con
  `onClick={onAction}`. Sin ellos, la card se ve exactamente como hoy.

Los 35 usos existentes en otras pantallas no pasan los props nuevos y no
cambian de aspecto.

### 3. Las 4 KPI cards del Dashboard

La derivación vive en funciones puras nuevas de `src/lib/utils.js`
(`dueWithinDays`, `overdueWorkOrders`, `overdueReceivables`,
`quotesByStatus`) que `Dashboard.jsx` llama; comparan strings ISO
`YYYY-MM-DD` (formato en que ya vienen `due`, `end`, `validUntil`) contra
`addDaysIso(0)` (hoy) y `addDaysIso(30)`. No se agregan librerías de fechas.

| Card | Valor (sin cambio) | `detail` | `detailTone` | Acción |
|---|---|---|---|---|
| Pipeline abierto | `money(pipelineTotal)` | `{N} vencen en 30 dias · forecast {money(winForecast)}` — N = oportunidades con `due` ≤ hoy+30 | — | `setActive("crm")`, "Ver CRM" |
| Presupuestos | pendientes (≠ Aprobado) | `{a} enviados · {b} en revision · {c} borrador` — conteo por `status` (`Enviado`, `En revision`, `Borrador`) | — | `setActive("presupuestos")`, "Ver presupuestos" |
| OT en ejecución | count `En ejecucion` | `{N} atrasadas` — OT en ejecución (`status === "En ejecucion"`) con `end` < hoy y `progress` < 100 | `"danger"` si N > 0 | `setActive("ot")`, "Ver ordenes" |
| Cuentas por cobrar | `money(sum(receivables,"total"))` | `{money(X)} vencido` — facturas con `status !== "Cobrada"` y `due` < hoy | `"danger"` si X > 0 | `setActive("finanzas")`, "Ver finanzas" |

Nota conocida: los datos demo son de mayo 2026; con la fecha actual todo
aparece como atrasado/vencido. Es correcto — la lógica es la honesta y con
datos reales de la empresa da el resultado real.

### 4. Tokens en `Dashboard.jsx`

Mismo criterio que Fase 1 (solo hex arbitrarios; las clases `zinc-*` de
Tailwind y `#ff7900` no se tocan):

| Antes | Después |
|---|---|
| `border-[#ecece6] bg-[#fbfbf8]` (4 cajas) | `border-[var(--border)] bg-[var(--surface)]` |
| `text-[#b42318]` (stock bajo, alertas) | `text-[var(--danger)]` |
| `text-[#050505]` | `text-[var(--text)]` |

### 5. Verificación

- `npm run build` sin errores.
- La derivación de las 4 cards tiene ramas (fechas, estados, `progress`),
  así que se extrae a funciones puras exportadas desde `src/lib/utils.js`
  (`dueWithinDays`, `overdueWorkOrders`, `overdueReceivables`,
  `quotesByStatus`) y se deja **un** script de chequeo con `assert` (sin
  framework), `scripts/check-dashboard-metrics.mjs`, que las ejecuta contra
  datos fijos: factura vencida vs. al
  día; OT con `end` pasado y `progress` 100 **no** cuenta como atrasada; OT
  con `end` pasado y `progress` 55 sí; conteos por estado de presupuestos.
- Recorrida visual: Dashboard (4 cards con detail + link, paneles con sombra
  visible) y Clientes (tabla y cards de empresa con sombra visible, ya no
  invisibles).
