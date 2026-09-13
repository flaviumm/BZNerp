# Rediseño ERP — Fase 1: fundación de diseño + shell

## Contexto

El usuario pidió un rediseño completo del ERP a partir de un brief de UX/UI
(criterios de jerarquía visual, densidad, dark mode, etc.) y 8 referencias
visuales. El proyecto es demasiado grande para un solo spec (~16 pantallas),
así que se decompuso en fases:

1. **Fase 1 (este spec):** fundación de tokens de diseño + shell (Sidebar,
   Header, superficie de paneles/cards).
2. Fase 2: rediseño del Dashboard aplicando la fundación.
3. Fase 3+: resto de los módulos, agrupados por flujo.

Cada fase es su propio ciclo brainstorm → spec → plan.

Se resolvió una contradicción del brief antes de diseñar: el texto pide
evitar glassmorphism/gradientes/colores fluorescentes, pero varias de las
referencias visuales los usan. Se prioriza el texto del brief — estética
limpia tipo Linear/Stripe/Supabase — y las referencias solo aportan
patrones de layout (estructura de KPI cards, tablas), no el look visual.

El color de marca (hoy naranja `#ff7900` de Bizon) ya está resuelto aparte
en `2026-09-12-org-branding-settings-design.md` — se vuelve `--brand`,
configurable por organización vía la pantalla Configuración. Este spec
define los tokens *neutros y semánticos* que faltan alrededor de esa marca,
y el shell que los usa.

## Alcance

Incluye:
- Tokens neutros/semánticos como CSS custom properties (`src/lib/theme.js`,
  ampliando el mismo módulo del spec de branding).
- Reestructuración del `Sidebar` en secciones colapsables, incluyendo la
  sección dinámica ya existente sólo para super-admin (renombrada de
  "Plataforma" a "Administración").
- Rediseño del `Header`.
- Cambio de estilo del componente `Panel` (superficie con sombra suave en
  vez de borde plano) — se propaga a toda la app porque ya lo reusan todas
  las pantallas.

No incluye (fases posteriores):
- Dark mode (los tokens quedan preparados para agregarlo después, pero no
  se construye el toggle ni la paleta oscura ahora).
- Rediseño de pantallas individuales (Dashboard, CRM, etc.).
- El `context_panel` lateral del brief (patrón a introducir pantalla por
  pantalla más adelante, no es parte del shell).
- Tipografía/spacing nuevos: se mantiene Inter + la escala default de
  Tailwind, ya alineados con el brief.

## Diseño

### 1. Tokens (`src/lib/theme.js`)

Amplía el módulo ya previsto en el spec de branding. Además de
`applyBrandTheme(hex)` (que setea `--brand`/`--brand-hover`/`--brand-tint`),
agrega una función que corre una sola vez al bootear la app y fija los
tokens neutros/semánticos, que no dependen de la organización:

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

La mayoría de estos valores son tomados de los que ya usa la app (paleta
"Bone" elegida en el companion visual) — se centralizan los que ya existían
dispersos. La excepción es `--warning` (`#b45309`): es un color genuinamente
nuevo, sin precedente exacto en el código existente. Se eligió para ser
visualmente consistente con los tonos ámbar/warning ya en uso en distintas
pantallas (`#f59e0b`, `#a16207`, `#9a6500`, dispersos y ligeramente
distintos entre sí), sin ser una réplica exacta de ninguno de ellos.

### 2. Sidebar

`src/lib/navigation.js` no se toca. La 4ª sección no es una entrada estática
de `menuSections`: ya existía un mecanismo en `mini_erp_bizon_prototipo.jsx`
que calcula dinámicamente una sección extra, agregándola solo cuando el
usuario logueado es super-admin:

```js
const sidebarMenuSections = profile?.isSuperAdmin
  ? [...menuSections, { title: "Administracion", keys: ["organizaciones"] }]
  : menuSections;
```

Ese mecanismo existente se reutiliza tal cual, solo renombrando el título de
`"Plataforma"` a `"Administracion"`. Por ahora sigue conteniendo únicamente
`"organizaciones"` — `"configuracion"` todavía no existe como screen key (es
parte del spec de branding, aparte) y se agregará a este mismo array cuando
esa pantalla exista.

Este enfoque dinámico es preferible al originalmente planeado (una 4ª
entrada estática en `menuSections`): evita que los usuarios que no son
super-admin vean una entrada "Organizaciones" bloqueada/deshabilitada en el
menú — directamente no aparece para ellos.

`Sidebar` en `src/components/ui/index.jsx` gana estado local
`collapsedSections` (un Set de títulos colapsados). Por defecto todas las
secciones excepto la que contiene la pantalla activa empiezan colapsadas.
Cada título de sección es clickeable y togglea su entrada en el Set. No se
persiste el estado (F5 vuelve al default) — no se pidió persistencia y
agregarla es alcance extra sin pedido.

### 3. Header

`Header` en el mismo archivo no cambia de contenido ni de layout — se
mantiene tal cual está (mismos bloques, mismo texto, mismo chip de perfil).
El único cambio es de color, re-tokenizando lo que ya hardcodeaba hex:
fondo `bg-white/95` + `backdrop-blur` pasa a `bg-[var(--surface)]` (con un
fondo sólido de superficie no hace falta transparencia ni blur), borde
`border-[#ececf0]` pasa a `border-[var(--border)]`, y el color del título
pasa a `text-[var(--text)]`. No se agrega buscador, ícono de notificaciones
ni ningún elemento nuevo — eso queda fuera de alcance de esta fase.

### 4. Panel (superficie de cards)

`Panel` cambia su clase base de
`rounded-[22px] border border-[#ececf0] bg-white ...` a
`rounded-[22px] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)] ...` (sin
borde). Es un cambio de una sola definición en `src/components/ui/index.jsx`
que se propaga automáticamente a todas las pantallas.

### 5. Verificación

- `npm run build` sin errores.
- Recorrida manual por Dashboard, Clientes, CRM, Configuración (cuando
  exista) confirmando que el sidebar colapsa/expande bien y que los paneles
  se ven con la sombra nueva sin overlaps ni contraste roto.
- No hay lógica no trivial nueva que amerite un test automatizado (es
  esencialmente CSS + un Set de estado de UI).
