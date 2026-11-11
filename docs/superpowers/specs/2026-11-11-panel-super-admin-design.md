# Panel de super admin — Design

Date: 2026-11-11
Status: Approved in brainstorming, pending builder check
Depends on: docs/superpowers/specs/2026-11-10-cierre-erp-design.md (cierre multiempresa)

## Intent

El super admin (plataforma, sin organización propia) tiene que poder hacer cualquier
modificación sobre cualquier empresa sin entrar con la cuenta de un admin de esa
empresa: cargar y corregir datos, administrar usuarios, editar/suspender/borrar
empresas y definir los parámetros de cálculo y tarifas de cada una.

## Mecanismo central: empresa activa

- El super admin elige una **empresa activa** con un selector en el header. Se persiste
  en `profiles.acting_organization_id` (solo tiene efecto si `is_super_admin`).
- `public.current_organization_id()` devuelve `organization_id` para usuarios normales y
  `acting_organization_id` para el super admin. Con eso numeradores, triggers de
  estampado y auditoría funcionan sin cambios.
- El frontend carga datos filtrando por la empresa activa en el servidor
  (`organization_id = acting`), y las escrituras por clave de negocio (`number`, `sku`)
  también se acotan a esa empresa: con unicidad por organización, un `update ... eq
  number` del super admin sin filtro tocaría la misma numeración en todas las empresas.
- Sin empresa activa el super admin ve solo Plataforma y Configuración; el resto del
  menú aparece al elegir una.
- El super admin sigue sin pertenecer a ninguna empresa. Bizon es una empresa más.

## Pantalla Plataforma (reemplaza Organizaciones)

Tabla de empresas: nombre, estado (`active`/`suspended`), usuarios, creada. Acciones:
- **Operar**: la vuelve empresa activa y lleva al Dashboard.
- **Renombrar** (inline).
- **Suspender / Reactivar**: `organizations.status`. `current_account_status()` devuelve
  `suspended` si la empresa está suspendida, con lo que las policies niegan lectura y
  escritura a todos sus usuarios; el frontend muestra "Cuenta suspendida".
- **Borrar**: pide escribir el nombre exacto. Llama a `public.delete_organization(uuid)`
  (security definer, solo super admin) que borra filas de todas las tablas tenant,
  objetos de storage del prefijo, usuarios de `auth.users` (cascade a `profiles`) y la
  organización.
- Crear empresa + primer admin queda como está.

## Usuarios de cualquier empresa

- Para el super admin, Usuarios lista los de la empresa activa y crea en ella:
  `admin-create-user` acepta `organizationId` en el body cuando el llamador es super
  admin (para un admin normal se ignora y se usa la suya).
- Nueva acción `reset-password` en la misma edge function: `{ action: "reset-password",
  userId, password }`. Permitida al super admin para cualquier usuario y al admin de una
  empresa para usuarios de su empresa. Botón "Nueva contraseña" en la fila del usuario.

## Parámetros por empresa

- Configuración gana dos bloques: **Tarifas de mano de obra** (filas de
  `labor_rate_catalog`: oficio, convenio, categoría, hora base, plus mensual, horas
  mensuales, factor de carga, hora cotizada) y **Parámetros de cálculo** (una fila en
  `quote_calculation_profiles`: IVA, IIBB, ganancia, gastos admin, contingencia, energía,
  traslado, redondeo, validez).
- El cotizador lee ambos de la base para la empresa activa/propia. Si la empresa no cargó
  nada, usa los valores actuales de `src/lib/pricingData.js` (Bizon) como default.
- `labor_rate_catalog.id` y `quote_calculation_profiles.id` pasan a ser únicos por
  organización (mismo patrón que la migración de cierre).
- El catálogo de materiales sigue global, con el botón "Actualizar precios" existente.

## Non-goals

- Impersonar un usuario concreto (ver el ERP "como Juan").
- Métricas cruzadas entre empresas.
- Billing / planes.

## Anti-goals

- Que un admin de empresa pueda cambiar `acting_organization_id` y leer otra empresa (el
  campo solo influye cuando `is_super_admin`; el guard trigger además lo bloquea).
- Que borrar una empresa deje usuarios de auth huérfanos que sigan pudiendo entrar.
- Que el super admin, al operar una empresa, escriba por accidente en otra.

## Constraints

- Mismo stack y estilo ponytail. Migración versionada nueva; la edge function
  `admin-create-user` se modifica (el usuario la redeploya con `supabase functions deploy`).
- El usuario aplica la migración con `npm run db:push`.

## Decisiones tras el builder check

| Duda | Decisión |
|---|---|
| Archivos de storage al borrar una empresa | Se borran las filas de `storage.objects` por SQL. Los bytes quedan huérfanos en el bucket pero inaccesibles (sin fila no hay URL ni listado). Limpieza física: fuera de alcance. |
| Aislamiento del super admin en RLS | Las policies conservan el bypass. El aislamiento al operar es del cliente (filtro por empresa activa en lecturas y escrituras) más el trigger que estampa la empresa activa en inserts. |
| Rol del super admin | Tiene permisos completos sin importar `profiles.role`: `can_read_module`, `can_write_module` y `next_document_number` lo contemplan. |
| Hora cotizada | Se carga a mano. Las otras columnas de la tarifa son referencia. |
| Configuración sin empresa activa | Sigue a la empresa activa; sin empresa activa muestra un aviso y el menú solo ofrece Plataforma. |
| Suspensión y super admin | No lo afecta: puede operar una empresa suspendida para soporte. |

## Dejado al constructor

- Dónde vive el selector en el header y cómo se muestra en móvil.
- Forma de los editores de tarifas y parámetros (tabla editable simple alcanza).
- Si el conteo de usuarios por empresa se calcula en cliente a partir de `profiles`.
