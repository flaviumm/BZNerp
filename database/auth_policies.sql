create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Usuario Bizon',
  role text not null default 'ventas' check (role in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas', 'rrhh')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuario Bizon'),
    'ventas'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
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
    when public.current_role() in ('admin', 'direccion') then true
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

drop policy if exists "erp_mvp_read_companies" on companies;
drop policy if exists "erp_mvp_write_companies" on companies;
drop policy if exists "erp_mvp_update_companies" on companies;
drop policy if exists "erp_mvp_read_opportunities" on opportunities;
drop policy if exists "erp_mvp_write_opportunities" on opportunities;
drop policy if exists "erp_mvp_update_opportunities" on opportunities;
drop policy if exists "erp_mvp_read_quotes" on quotes;
drop policy if exists "erp_mvp_write_quotes" on quotes;
drop policy if exists "erp_mvp_update_quotes" on quotes;
drop policy if exists "erp_mvp_read_work_orders" on work_orders;
drop policy if exists "erp_mvp_write_work_orders" on work_orders;
drop policy if exists "erp_mvp_update_work_orders" on work_orders;
drop policy if exists "erp_mvp_read_inventory_items" on inventory_items;
drop policy if exists "erp_mvp_write_inventory_items" on inventory_items;
drop policy if exists "erp_mvp_update_inventory_items" on inventory_items;
drop policy if exists "erp_mvp_read_purchase_orders" on purchase_orders;
drop policy if exists "erp_mvp_write_purchase_orders" on purchase_orders;
drop policy if exists "erp_mvp_update_purchase_orders" on purchase_orders;
drop policy if exists "erp_mvp_read_invoices" on invoices;
drop policy if exists "erp_mvp_write_invoices" on invoices;
drop policy if exists "erp_mvp_update_invoices" on invoices;
drop policy if exists "erp_mvp_read_employees" on employees;
drop policy if exists "erp_mvp_write_employees" on employees;
drop policy if exists "erp_mvp_update_employees" on employees;
drop policy if exists "erp_mvp_read_tasks" on tasks;
drop policy if exists "erp_mvp_write_tasks" on tasks;
drop policy if exists "erp_mvp_update_tasks" on tasks;

drop policy if exists "profiles_read_self" on profiles;
drop policy if exists "profiles_update_admin" on profiles;
drop policy if exists "companies_read_by_role" on companies;
drop policy if exists "companies_insert_by_role" on companies;
drop policy if exists "companies_update_by_role" on companies;
drop policy if exists "companies_delete_by_role" on companies;
drop policy if exists "opportunities_read_by_role" on opportunities;
drop policy if exists "opportunities_insert_by_role" on opportunities;
drop policy if exists "opportunities_update_by_role" on opportunities;
drop policy if exists "opportunities_delete_by_role" on opportunities;
drop policy if exists "quotes_read_by_role" on quotes;
drop policy if exists "quotes_insert_by_role" on quotes;
drop policy if exists "quotes_update_by_role" on quotes;
drop policy if exists "quotes_delete_by_role" on quotes;
drop policy if exists "work_orders_read_by_role" on work_orders;
drop policy if exists "work_orders_insert_by_role" on work_orders;
drop policy if exists "work_orders_update_by_role" on work_orders;
drop policy if exists "work_orders_delete_by_role" on work_orders;
drop policy if exists "inventory_items_read_by_role" on inventory_items;
drop policy if exists "inventory_items_insert_by_role" on inventory_items;
drop policy if exists "inventory_items_update_by_role" on inventory_items;
drop policy if exists "inventory_items_delete_by_role" on inventory_items;
drop policy if exists "purchase_orders_read_by_role" on purchase_orders;
drop policy if exists "purchase_orders_insert_by_role" on purchase_orders;
drop policy if exists "purchase_orders_update_by_role" on purchase_orders;
drop policy if exists "purchase_orders_delete_by_role" on purchase_orders;
drop policy if exists "invoices_read_by_role" on invoices;
drop policy if exists "invoices_insert_by_role" on invoices;
drop policy if exists "invoices_update_by_role" on invoices;
drop policy if exists "invoices_delete_by_role" on invoices;
drop policy if exists "employees_read_by_role" on employees;
drop policy if exists "employees_insert_by_role" on employees;
drop policy if exists "employees_update_by_role" on employees;
drop policy if exists "employees_delete_by_role" on employees;
drop policy if exists "tasks_read_by_role" on tasks;
drop policy if exists "tasks_insert_by_role" on tasks;
drop policy if exists "tasks_update_by_role" on tasks;
drop policy if exists "tasks_delete_by_role" on tasks;

create policy "profiles_read_self" on profiles for select using (auth.uid() = id or public.current_role() in ('admin', 'direccion'));
create policy "profiles_update_admin" on profiles for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "companies_read_by_role" on companies for select using (public.can_read_module('companies'));
create policy "companies_insert_by_role" on companies for insert with check (public.can_write_module('companies'));
create policy "companies_update_by_role" on companies for update using (public.can_write_module('companies')) with check (public.can_write_module('companies'));
create policy "companies_delete_by_role" on companies for delete using (public.can_write_module('companies'));

create policy "opportunities_read_by_role" on opportunities for select using (public.can_read_module('opportunities'));
create policy "opportunities_insert_by_role" on opportunities for insert with check (public.can_write_module('opportunities'));
create policy "opportunities_update_by_role" on opportunities for update using (public.can_write_module('opportunities')) with check (public.can_write_module('opportunities'));
create policy "opportunities_delete_by_role" on opportunities for delete using (public.can_write_module('opportunities'));

create policy "quotes_read_by_role" on quotes for select using (public.can_read_module('quotes'));
create policy "quotes_insert_by_role" on quotes for insert with check (public.can_write_module('quotes'));
create policy "quotes_update_by_role" on quotes for update using (public.can_write_module('quotes')) with check (public.can_write_module('quotes'));
create policy "quotes_delete_by_role" on quotes for delete using (public.can_write_module('quotes'));

create policy "work_orders_read_by_role" on work_orders for select using (public.can_read_module('work_orders'));
create policy "work_orders_insert_by_role" on work_orders for insert with check (public.can_write_module('work_orders'));
create policy "work_orders_update_by_role" on work_orders for update using (public.can_write_module('work_orders')) with check (public.can_write_module('work_orders'));
create policy "work_orders_delete_by_role" on work_orders for delete using (public.can_write_module('work_orders'));

create policy "inventory_items_read_by_role" on inventory_items for select using (public.can_read_module('inventory_items'));
create policy "inventory_items_insert_by_role" on inventory_items for insert with check (public.can_write_module('inventory_items'));
create policy "inventory_items_update_by_role" on inventory_items for update using (public.can_write_module('inventory_items')) with check (public.can_write_module('inventory_items'));
create policy "inventory_items_delete_by_role" on inventory_items for delete using (public.can_write_module('inventory_items'));

create policy "purchase_orders_read_by_role" on purchase_orders for select using (public.can_read_module('purchase_orders'));
create policy "purchase_orders_insert_by_role" on purchase_orders for insert with check (public.can_write_module('purchase_orders'));
create policy "purchase_orders_update_by_role" on purchase_orders for update using (public.can_write_module('purchase_orders')) with check (public.can_write_module('purchase_orders'));
create policy "purchase_orders_delete_by_role" on purchase_orders for delete using (public.can_write_module('purchase_orders'));

create policy "invoices_read_by_role" on invoices for select using (public.can_read_module('invoices'));
create policy "invoices_insert_by_role" on invoices for insert with check (public.can_write_module('invoices'));
create policy "invoices_update_by_role" on invoices for update using (public.can_write_module('invoices')) with check (public.can_write_module('invoices'));
create policy "invoices_delete_by_role" on invoices for delete using (public.can_write_module('invoices'));

create policy "employees_read_by_role" on employees for select using (public.can_read_module('employees'));
create policy "employees_insert_by_role" on employees for insert with check (public.can_write_module('employees'));
create policy "employees_update_by_role" on employees for update using (public.can_write_module('employees')) with check (public.can_write_module('employees'));
create policy "employees_delete_by_role" on employees for delete using (public.can_write_module('employees'));

create policy "tasks_read_by_role" on tasks for select using (public.can_read_module('tasks'));
create policy "tasks_insert_by_role" on tasks for insert with check (public.can_write_module('tasks'));
create policy "tasks_update_by_role" on tasks for update using (public.can_write_module('tasks')) with check (public.can_write_module('tasks'));
create policy "tasks_delete_by_role" on tasks for delete using (public.can_write_module('tasks'));
