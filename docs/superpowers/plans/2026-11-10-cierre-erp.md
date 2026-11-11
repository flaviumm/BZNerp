# Plan: cierre del ERP (seguridad, usabilidad, utilidad)

Spec: `docs/superpowers/specs/2026-11-10-cierre-erp-design.md`. Un commit por fase.

## Fase 1 — Seguridad

- [x] Migración `20261110120000_cierre_seguridad.sql`:
  - `material_price_catalog` escribible solo por super admin.
  - `set_organization_id()` rechaza inserts de usuarios autenticados sin organización.
  - Cliente no ve presupuestos/OT en `Borrador`.
  - Unicidad por organización: `quotes`, `work_orders`, `inventory_items`, `purchase_orders`, `invoices` (PK compuesta), `companies.name`, `employees.name`, `opportunities(company, service)`, `tasks(text, owner, due)`.
  - `can_read_module`: finanzas lee `companies` y `opportunities`.
- [x] `supabaseClient.js`: demo imposible en build de producción.
- [x] `mini_erp_bizon_prototipo.jsx`: con base configurada nunca rellenar con datos demo.
- [x] `auth.jsx`: sin registro público.
- [x] `authRepository.updateUserProfile`: devolver `organization_id`/`is_super_admin`.
- [x] `admin-create-user`: lista de pantallas actualizada.
- [x] `scripts/test-multitenant-isolation.mjs`: + cliente no ve otra empresa ni borradores, + mismo número de presupuesto en dos orgs, + super admin sin org no inserta.
- [x] `.github/workflows/backup.yml` nocturno + `backup-supabase.mjs` exporta `organizations`, leads y catálogos; restore respeta el orden.
- [x] `BACKUP.md` y `SUPABASE_SETUP.md` al día.

## Fase 2 — Menú + OT/Tareas

- [x] `navigation.js`: quitar inventario, compras, finanzas, rrhh, captador_leads. Finanzas ve reportes.
- [x] `mini_erp_bizon_prototipo.jsx`: quitar pantallas y estado de los módulos ocultos.
- [x] `modals.jsx`: alta de OT y Tareas con campos reales (cliente de la lista, fechas, equipo / responsable, prioridad).
- [x] OT: cliente ve solo las suyas (ya hace), sin borradores.

## Fase 3 — Alta de empresa

- [ ] (pendiente: requiere sesión de super admin y deploy) Recorrido en producción con el navegador: crear org + admin, entrar como admin, branding, crear usuario ventas y cliente.
- [ ] Arreglar lo que trabe.

## Fase 4 — Reportes y Presupuestos

- [x] `Reportes.jsx`: solo datos reales (pipeline, conversión, presupuestos por estado, OT, tareas vencidas).
- [x] `Dashboard.jsx`: sin facturas ni stock; tarjetas sobre clientes, pipeline, presupuestos, OT.
- [x] `Presupuestos.jsx`: filtro por estado, cambio de estado explícito (Borrador → Enviado → Aprobado/Rechazado).

## Fase 5 — Usabilidad

- [x] Recorrido como vendedor en el navegador: Clientes (alta, edición, contactos, búsqueda) y Cotizador/Presupuestos (nuevo, re-editar, PDF).
- [x] Fixes de fricción encontrados.

## Verificación

- `npm run build` verde en cada fase.
- `node --test` de los tests existentes y nuevos.
- Test de aislamiento corrido contra producción (requiere `SUPABASE_SERVICE_ROLE_KEY`).
