-- Harden RLS/RPC policies after the initial MVP rollout.

drop policy if exists "erp_mvp_read_companies" on public.companies;
drop policy if exists "erp_mvp_write_companies" on public.companies;
drop policy if exists "erp_mvp_update_companies" on public.companies;
drop policy if exists "erp_mvp_read_opportunities" on public.opportunities;
drop policy if exists "erp_mvp_write_opportunities" on public.opportunities;
drop policy if exists "erp_mvp_update_opportunities" on public.opportunities;
drop policy if exists "erp_mvp_read_quotes" on public.quotes;
drop policy if exists "erp_mvp_write_quotes" on public.quotes;
drop policy if exists "erp_mvp_update_quotes" on public.quotes;
drop policy if exists "erp_mvp_read_work_orders" on public.work_orders;
drop policy if exists "erp_mvp_write_work_orders" on public.work_orders;
drop policy if exists "erp_mvp_update_work_orders" on public.work_orders;
drop policy if exists "erp_mvp_read_inventory_items" on public.inventory_items;
drop policy if exists "erp_mvp_write_inventory_items" on public.inventory_items;
drop policy if exists "erp_mvp_update_inventory_items" on public.inventory_items;
drop policy if exists "erp_mvp_read_purchase_orders" on public.purchase_orders;
drop policy if exists "erp_mvp_write_purchase_orders" on public.purchase_orders;
drop policy if exists "erp_mvp_update_purchase_orders" on public.purchase_orders;
drop policy if exists "erp_mvp_read_invoices" on public.invoices;
drop policy if exists "erp_mvp_write_invoices" on public.invoices;
drop policy if exists "erp_mvp_update_invoices" on public.invoices;
drop policy if exists "erp_mvp_read_employees" on public.employees;
drop policy if exists "erp_mvp_write_employees" on public.employees;
drop policy if exists "erp_mvp_update_employees" on public.employees;
drop policy if exists "erp_mvp_read_tasks" on public.tasks;
drop policy if exists "erp_mvp_write_tasks" on public.tasks;
drop policy if exists "erp_mvp_update_tasks" on public.tasks;

create or replace function public.can_read_module(module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.current_account_status() <> 'active' then false
    when public.current_role() in ('admin', 'direccion') then true
    when module in ('quotes', 'work_orders') and public.current_role() = 'cliente' then true
    when module in ('companies', 'opportunities', 'quotes') and public.current_role() = 'ventas' then true
    when module in ('work_orders', 'inventory_items') and public.current_role() = 'operaciones' then true
    when module in ('inventory_items', 'purchase_orders') and public.current_role() = 'compras' then true
    when module in ('invoices', 'quotes') and public.current_role() = 'finanzas' then true
    when module = 'employees' and public.current_role() = 'rrhh' then true
    when module = 'tasks' and public.current_role() in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas', 'rrhh') then true
    when module = 'document_files' and public.current_role() in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas') then true
    else false
  end;
$$;

create or replace function public.can_write_module(module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.current_account_status() <> 'active' then false
    when public.current_role() = 'admin' then true
    when module in ('companies', 'opportunities', 'quotes') and public.current_role() = 'ventas' then true
    when module = 'work_orders' and public.current_role() = 'operaciones' then true
    when module in ('inventory_items', 'purchase_orders') and public.current_role() = 'compras' then true
    when module = 'invoices' and public.current_role() = 'finanzas' then true
    when module = 'employees' and public.current_role() = 'rrhh' then true
    when module = 'tasks' and public.current_role() in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas', 'rrhh') then true
    when module = 'document_files' and public.current_role() in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas') then true
    else false
  end;
$$;

create or replace function public.next_document_number(counter_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_counter document_counters%rowtype;
  generated_number text;
begin
  if auth.uid() is null
     or public.current_account_status() <> 'active'
     or public.current_role() not in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas') then
    raise exception 'Not authorized to generate document numbers';
  end if;

  select *
  into current_counter
  from document_counters
  where code = counter_code
  for update;

  if not found then
    raise exception 'Unknown counter code: %', counter_code;
  end if;

  generated_number := current_counter.prefix || '-' || lpad(current_counter.next_value::text, current_counter.padding, '0');

  update document_counters
  set next_value = next_value + 1,
      updated_at = now()
  where code = counter_code;

  return generated_number;
end;
$$;

revoke execute on function public.next_document_number(text) from anon;
grant execute on function public.next_document_number(text) to authenticated;

drop policy if exists "audit_log_insert_authenticated" on public.audit_log;
create policy "audit_log_insert_authenticated"
on public.audit_log
for insert
with check (auth.uid() is not null and public.current_account_status() = 'active');

drop policy if exists "material_price_catalog_read_by_role" on public.material_price_catalog;
drop policy if exists "material_price_catalog_write_admin" on public.material_price_catalog;
drop policy if exists "labor_rate_catalog_read_by_role" on public.labor_rate_catalog;
drop policy if exists "labor_rate_catalog_write_admin" on public.labor_rate_catalog;
drop policy if exists "quote_calculation_profiles_read_by_role" on public.quote_calculation_profiles;
drop policy if exists "quote_calculation_profiles_write_admin" on public.quote_calculation_profiles;

create policy "material_price_catalog_read_by_role" on public.material_price_catalog
for select using (auth.uid() is not null and public.current_account_status() = 'active');
create policy "material_price_catalog_write_admin" on public.material_price_catalog
for all using (public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion', 'compras'))
with check (public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion', 'compras'));

create policy "labor_rate_catalog_read_by_role" on public.labor_rate_catalog
for select using (auth.uid() is not null and public.current_account_status() = 'active');
create policy "labor_rate_catalog_write_admin" on public.labor_rate_catalog
for all using (public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion', 'rrhh'))
with check (public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion', 'rrhh'));

create policy "quote_calculation_profiles_read_by_role" on public.quote_calculation_profiles
for select using (auth.uid() is not null and public.current_account_status() = 'active');
create policy "quote_calculation_profiles_write_admin" on public.quote_calculation_profiles
for all using (public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion'))
with check (public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion'));
