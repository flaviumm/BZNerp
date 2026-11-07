-- Cierra el gap de aislamiento multi-tenant en material_price_catalog.
--
-- La migracion multiempresa (20260801120000_multiempresa.sql) escopeo
-- organization_id en labor_rate_catalog y quote_calculation_profiles (sus
-- hermanas de /database/pricing.sql) pero dejo afuera material_price_catalog.
-- Sus políticas (material_price_catalog_read_by_role / write_admin, definidas
-- en database/pricing.sql y redefinidas igual en
-- 20260510213000_harden_rls_rpc.sql) solo chequean rol/estado activo, sin
-- organization_id — cualquier usuario activo de CUALQUIER organizacion puede
-- leer, y admin/direccion/compras de cualquier organizacion puede escribir,
-- el catalogo de precios negociados de Bizon con sus proveedores. Mientras
-- el sistema tenga una sola organizacion esto es invisible; el dia que se
-- cree una segunda via create-organization, esa org ve y puede pisar los
-- precios de proveedor de Bizon.

-- 1. Columna + trigger de auto-stamp (mismo patron que el resto de las tablas).
alter table public.material_price_catalog add column if not exists organization_id uuid references organizations(id);

drop trigger if exists set_org_material_price_catalog on public.material_price_catalog;
create trigger set_org_material_price_catalog before insert on public.material_price_catalog
for each row execute function public.set_organization_id();

-- 2. Backfill: las filas existentes no tienen organization_id porque la
-- columna no existia. A diferencia del backfill de companies/opportunities/etc
-- en la migracion multiempresa (que borraba filas sin organization_id porque
-- eran datos demo sin dueno claro), este catalogo SI tiene dueno real: es el
-- catalogo de costos de Bizon, cargado antes de que existiera multiempresa.
-- Asignarlo a la organizacion mas antigua (la primera creada, asumible como
-- Bizon) en vez de borrarlo evita perder el catalogo de precios en produccion.
do $$
declare
  v_default_org uuid;
begin
  select id into v_default_org from public.organizations order by created_at asc limit 1;

  if v_default_org is not null then
    update public.material_price_catalog
    set organization_id = v_default_org
    where organization_id is null;
  end if;
end;
$$;

-- 3. Si alguna fila quedo sin organization_id (no hay ninguna organizacion
-- todavia, o el backfill no corrio), no la dejamos huerfana-pero-visible-a-todos:
-- falla cerrado igual que el resto de las tablas (NOT NULL + politica exige match).
alter table public.material_price_catalog alter column organization_id set not null;

-- 4. Politicas con scoping real, reemplazando las de solo-rol.
drop policy if exists "material_price_catalog_read_by_role" on public.material_price_catalog;
drop policy if exists "material_price_catalog_write_admin" on public.material_price_catalog;

create policy "material_price_catalog_read_by_role" on public.material_price_catalog
for select using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active')
);

create policy "material_price_catalog_write_admin" on public.material_price_catalog
for all using (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.current_account_status() = 'active'
    and public.current_role() in ('admin', 'direccion', 'compras')
  )
)
with check (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.current_account_status() = 'active'
    and public.current_role() in ('admin', 'direccion', 'compras')
  )
);
