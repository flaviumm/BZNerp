alter table public.profiles
add column if not exists status text not null default 'pending' check (status in ('pending', 'active', 'suspended'));

update public.profiles
set status = 'active'
where status = 'pending';

create or replace function public.current_account_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuario Bizon'),
    'ventas',
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
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

drop policy if exists "profiles_read_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_read_self"
on public.profiles
for select
using (
  auth.uid() = id
  or (public.current_role() in ('admin', 'direccion') and public.current_account_status() = 'active')
);

create policy "profiles_update_admin"
on public.profiles
for update
using (public.current_role() = 'admin' and public.current_account_status() = 'active')
with check (public.current_role() = 'admin' and public.current_account_status() = 'active');
