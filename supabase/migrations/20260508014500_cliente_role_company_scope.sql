alter table public.profiles
add column if not exists company_name text;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas', 'rrhh', 'cliente'));

create or replace function public.current_company_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company_name from public.profiles where id = auth.uid();
$$;

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
    when module in ('employees') and public.current_role() = 'rrhh' then true
    when module in ('tasks', 'document_files') then true
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
    when module in ('work_orders') and public.current_role() = 'operaciones' then true
    when module in ('inventory_items', 'purchase_orders') and public.current_role() = 'compras' then true
    when module in ('invoices') and public.current_role() = 'finanzas' then true
    when module in ('employees') and public.current_role() = 'rrhh' then true
    when module in ('tasks', 'document_files') then true
    else false
  end;
$$;

drop policy if exists "quotes_read_by_role" on public.quotes;
drop policy if exists "quotes_insert_by_role" on public.quotes;
drop policy if exists "quotes_update_by_role" on public.quotes;
drop policy if exists "quotes_delete_by_role" on public.quotes;

create policy "quotes_read_by_role" on public.quotes
for select using (
  public.can_read_module('quotes')
  and (
    public.current_role() <> 'cliente'
    or client = public.current_company_name()
  )
);

create policy "quotes_insert_by_role" on public.quotes for insert with check (public.can_write_module('quotes'));
create policy "quotes_update_by_role" on public.quotes for update using (public.can_write_module('quotes')) with check (public.can_write_module('quotes'));
create policy "quotes_delete_by_role" on public.quotes for delete using (public.can_write_module('quotes'));

drop policy if exists "work_orders_read_by_role" on public.work_orders;
drop policy if exists "work_orders_insert_by_role" on public.work_orders;
drop policy if exists "work_orders_update_by_role" on public.work_orders;
drop policy if exists "work_orders_delete_by_role" on public.work_orders;

create policy "work_orders_read_by_role" on public.work_orders
for select using (
  public.can_read_module('work_orders')
  and (
    public.current_role() <> 'cliente'
    or client = public.current_company_name()
  )
);

create policy "work_orders_insert_by_role" on public.work_orders for insert with check (public.can_write_module('work_orders'));
create policy "work_orders_update_by_role" on public.work_orders for update using (public.can_write_module('work_orders')) with check (public.can_write_module('work_orders'));
create policy "work_orders_delete_by_role" on public.work_orders for delete using (public.can_write_module('work_orders'));
