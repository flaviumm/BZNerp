# Branding y configuración por organización

## Contexto

El ERP nació como single-tenant "Bizon" y luego se le agregó multiempresa
(`organizations`, ver `2026-08-01-multiempresa-design.md`). La tabla
`organizations` solo tiene `id`, `name`, `created_at` — no hay forma de que
una empresa configure su propio nombre, logo o color sin editar código.
El color de marca (`#ff7900`) y los logos de Bizon están hardcodeados en
~90 lugares de ~15 archivos de pantallas.

Objetivo: que el admin de una organización pueda, desde la propia app,
poner el nombre, color principal y logo de su empresa, y que ese branding
se refleje en toda la interfaz (reskin completo, no solo el chasis).
Además, la organización "Bizon" sembrada de ejemplo se reconfigura in-place
para la empresa real del usuario (no se crea una organización nueva), y sus
datos de ejemplo se vacían.

## Alcance

Incluye:
- Columnas `primary_color` y `logo_data_url` en `organizations`.
- Policy RLS para que el `admin` de una organización pueda actualizar
  (no crear) su propia fila de `organizations`.
- Helper de theming (`src/lib/theme.js`) que deriva 2 tonos del color base
  y los expone como CSS custom properties.
- Codemod de los ~90 usos de hex naranja-Bizon en las pantallas para que
  usen esas variables en vez de valores fijos.
- Pantalla `Configuracion.jsx` (nombre, color, logo) visible para rol `admin`.
- Script SQL manual (`scripts/reset-org-seed-data.sql`) para vaciar los
  datos de ejemplo de una organización — se corre una vez, a mano, en el
  SQL Editor de Supabase.

No incluye (explícitamente fuera de alcance, YAGNI):
- Bucket de Storage para el logo (se guarda como data-URL en la fila).
- Múltiples colores/tokens de marca (secundario, fuente, etc.).
- UI de "reset de datos" dentro de la app o historial/auditoría del borrado.
- Theming por usuario (es un ajuste de organización, no de sesión).

## Diseño

### 1. Datos y permisos

```sql
alter table organizations
  add column if not exists primary_color text not null default '#ff7900',
  add column if not exists logo_data_url text;

drop policy if exists "organizations_write_own_admin" on organizations;
create policy "organizations_write_own_admin"
on organizations for update
using (
  id = current_organization_id()
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
)
with check (id = current_organization_id());
```

La policy de super-admin existente (`organizations_write_super_admin`) sigue
para altas de organizaciones nuevas vía `create-organization`. Esta nueva
policy solo habilita `UPDATE` de la propia fila para el admin de esa
organización — no puede tocar otras organizaciones ni crear filas nuevas.

El frontend redimensiona la imagen a 256×256 (canvas) antes de convertirla a
data-URL, para no inflar la fila.

### 2. Theming

`src/lib/theme.js`:

```js
export function applyBrandTheme(hex) {
  const root = document.documentElement.style;
  root.setProperty("--brand", hex);
  root.setProperty("--brand-hover", shade(hex, -15));
  root.setProperty("--brand-tint", shade(hex, 88));
}

function shade(hex, percent) { /* hex -> HSL, ajusta L, HSL -> hex */ }
```

Se llama una vez apenas se conoce la organización del usuario logueado
(en el mismo punto donde hoy se carga el perfil/organización al iniciar
sesión).

Codemod (buscar/reemplazar literal, sin cambiar lógica) sobre los archivos
en `src/components/**`:

| Antes | Después |
|---|---|
| `#ff7900` | `var(--brand)` |
| `#d85f00` | `var(--brand-hover)` |
| `#fff1e5`, `#fff8f1`, `#fff4ea`, `#fffaf5`, `#fff8f3`, `#fff8f0`, `#fff8e8`, `#ffe0c2`, `#f2c48d` | `var(--brand-tint)` |

Colores neutros (grises), de error (rojo) y de éxito (verde/teal) no se
tocan — no son de marca.

### 3. Pantalla de Configuración

`src/components/screens/Configuracion.jsx`, agregada al menú junto a
`Organizaciones` pero visible para rol `admin` de la organización (no
requiere `is_super_admin`). Reusa `Panel`/`Field`/`TextInput`/`Button` de
`src/components/ui`.

Campos: nombre de la empresa, color (`input type="color"` + hex), logo
(`input type="file"`, preview, "Quitar logo"). Al guardar: `supabase.from
("organizations").update({ name, primary_color, logo_data_url }).eq("id",
organizationId)` y aplica `applyBrandTheme` de inmediato, sin recargar.

### 4. Vaciar datos de ejemplo

`scripts/reset-org-seed-data.sql`: `delete` parametrizado por
`organization_id` sobre `quotes` (los ítems de cotización viven como
`jsonb` dentro de la fila, no en tabla aparte), `work_orders`,
`purchase_orders`, `invoices`, `inventory_items`, `opportunities`, `tasks`,
`employees`, `companies`. Estas tablas no tienen foreign keys entre sí
(solo se relacionan por `organization_id`), así que el orden no es
significativo. No toca `profiles`/`auth.users` ni la fila de
`organizations`. Se corre a mano
en el SQL Editor de Supabase — es un DELETE masivo en producción, fuera del
alcance de lo que el modo automático de Claude Code permite ejecutar sin
supervisión directa del usuario.

### 5. Verificación

- Test `assert`-based para `shade()` (única lógica no trivial nueva).
- Verificación manual: cambiar color/logo en Configuración, navegar
  Dashboard/CRM/Calendario/ProcesoVentas y confirmar que reflejan el nuevo
  color.
- `npm run build` para confirmar que el codemod no rompió ninguna clase de
  Tailwind (arbitrary values con `var()` compilan igual que con hex).
