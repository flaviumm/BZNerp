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
- Reestructuración del `Sidebar` en 4 secciones colapsables, reusando
  `menuSections` de `src/lib/navigation.js` (se agrega una 4ª sección
  "Administración").
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

Valores tomados de los que ya usa la app (paleta "Bone" elegida en el
companion visual), no son colores nuevos — se centralizan los que ya
existían dispersos.

### 2. Sidebar

`src/lib/navigation.js`: se agrega una 4ª entrada a `menuSections`:

```js
{ title: "Administracion", keys: ["organizaciones", "configuracion"] }
```

(`configuracion` es la screen key nueva del spec de branding, todavía no
agregada a `screens`/`menuSections` — se agrega en este trabajo junto con
`organizaciones`.)

`Sidebar` en `src/components/ui/index.jsx` gana estado local
`collapsedSections` (un Set de títulos colapsados). Por defecto todas las
secciones excepto la que contiene la pantalla activa empiezan colapsadas.
Cada título de sección es clickeable y togglea su entrada en el Set. No se
persiste el estado (F5 vuelve al default) — no se pidió persistencia y
agregarla es alcance extra sin pedido.

### 3. Header

`Header` en el mismo archivo pasa a un layout de dos bloques: izquierda
(nombre de organización en `--brand` + título de la pantalla activa),
derecha (buscador visual — sin command palette funcional todavía, eso es
una feature aparte — ícono de notificaciones sin backend de notificaciones
real, y el perfil ya existente). Fondo `--surface`, borde `--border`.

### 4. Panel (superficie de cards)

`Panel` cambia su clase base de
`rounded-2xl border border-[#ececf0] bg-white ...` a
`rounded-2xl bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)] ...` (sin
borde). Es un cambio de una sola definición en `src/components/ui/index.jsx`
que se propaga automáticamente a todas las pantallas.

### 5. Verificación

- `npm run build` sin errores.
- Recorrida manual por Dashboard, Clientes, CRM, Configuración (cuando
  exista) confirmando que el sidebar colapsa/expande bien y que los paneles
  se ven con la sombra nueva sin overlaps ni contraste roto.
- No hay lógica no trivial nueva que amerite un test automatizado (es
  esencialmente CSS + un Set de estado de UI).
