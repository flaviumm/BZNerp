-- Multiempresa (multi-tenant): organizations table + per-tenant RLS scoping.
-- See docs/superpowers/specs/2026-08-01-multiempresa-design.md

-- 1. Organizations + profile columns
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

alter table profiles
add column if not exists organization_id uuid references organizations(id);

alter table profiles
add column if not exists is_super_admin boolean not null default false;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_super_admin, false) from public.profiles where id = auth.uid();
$$;

drop policy if exists "organizations_read" on organizations;
create policy "organizations_read"
on organizations
for select
using (public.is_super_admin() or id = public.current_organization_id());

drop policy if exists "organizations_write_super_admin" on organizations;
create policy "organizations_write_super_admin"
on organizations
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- 2. Auto-stamp trigger: fills organization_id from the caller's session on
-- insert when not explicitly provided. Service-role callers (edge functions)
-- must set organization_id explicitly since auth.uid() is null for them.
create or replace function public.set_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;
  return new;
end;
$$;

-- 3. profiles: admins/direccion can list/update only their own org's users
drop policy if exists "profiles_read_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_read_self"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.current_role() in ('admin', 'direccion')
    and public.current_account_status() = 'active'
  )
);

create policy "profiles_update_admin"
on public.profiles
for update
using (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.current_role() = 'admin'
    and public.current_account_status() = 'active'
  )
)
with check (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.current_role() = 'admin'
    and public.current_account_status() = 'active'
  )
);

-- 4. companies
alter table companies add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_companies on companies;
create trigger set_org_companies before insert on companies
for each row execute function public.set_organization_id();

drop policy if exists "companies_read_by_role" on companies;
drop policy if exists "companies_insert_by_role" on companies;
drop policy if exists "companies_update_by_role" on companies;
drop policy if exists "companies_delete_by_role" on companies;

create policy "companies_read_by_role" on companies for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('companies')));
create policy "companies_insert_by_role" on companies for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('companies')));
create policy "companies_update_by_role" on companies for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('companies')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('companies')));
create policy "companies_delete_by_role" on companies for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('companies')));

-- 5. opportunities
alter table opportunities add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_opportunities on opportunities;
create trigger set_org_opportunities before insert on opportunities
for each row execute function public.set_organization_id();

drop policy if exists "opportunities_read_by_role" on opportunities;
drop policy if exists "opportunities_insert_by_role" on opportunities;
drop policy if exists "opportunities_update_by_role" on opportunities;
drop policy if exists "opportunities_delete_by_role" on opportunities;

create policy "opportunities_read_by_role" on opportunities for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('opportunities')));
create policy "opportunities_insert_by_role" on opportunities for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('opportunities')));
create policy "opportunities_update_by_role" on opportunities for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('opportunities')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('opportunities')));
create policy "opportunities_delete_by_role" on opportunities for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('opportunities')));

-- 6. inventory_items
alter table inventory_items add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_inventory_items on inventory_items;
create trigger set_org_inventory_items before insert on inventory_items
for each row execute function public.set_organization_id();

drop policy if exists "inventory_items_read_by_role" on inventory_items;
drop policy if exists "inventory_items_insert_by_role" on inventory_items;
drop policy if exists "inventory_items_update_by_role" on inventory_items;
drop policy if exists "inventory_items_delete_by_role" on inventory_items;

create policy "inventory_items_read_by_role" on inventory_items for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('inventory_items')));
create policy "inventory_items_insert_by_role" on inventory_items for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('inventory_items')));
create policy "inventory_items_update_by_role" on inventory_items for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('inventory_items')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('inventory_items')));
create policy "inventory_items_delete_by_role" on inventory_items for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('inventory_items')));

-- 7. purchase_orders
alter table purchase_orders add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_purchase_orders on purchase_orders;
create trigger set_org_purchase_orders before insert on purchase_orders
for each row execute function public.set_organization_id();

drop policy if exists "purchase_orders_read_by_role" on purchase_orders;
drop policy if exists "purchase_orders_insert_by_role" on purchase_orders;
drop policy if exists "purchase_orders_update_by_role" on purchase_orders;
drop policy if exists "purchase_orders_delete_by_role" on purchase_orders;

create policy "purchase_orders_read_by_role" on purchase_orders for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('purchase_orders')));
create policy "purchase_orders_insert_by_role" on purchase_orders for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('purchase_orders')));
create policy "purchase_orders_update_by_role" on purchase_orders for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('purchase_orders')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('purchase_orders')));
create policy "purchase_orders_delete_by_role" on purchase_orders for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('purchase_orders')));

-- 8. invoices
alter table invoices add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_invoices on invoices;
create trigger set_org_invoices before insert on invoices
for each row execute function public.set_organization_id();

drop policy if exists "invoices_read_by_role" on invoices;
drop policy if exists "invoices_insert_by_role" on invoices;
drop policy if exists "invoices_update_by_role" on invoices;
drop policy if exists "invoices_delete_by_role" on invoices;

create policy "invoices_read_by_role" on invoices for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('invoices')));
create policy "invoices_insert_by_role" on invoices for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('invoices')));
create policy "invoices_update_by_role" on invoices for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('invoices')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('invoices')));
create policy "invoices_delete_by_role" on invoices for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('invoices')));

-- 9. employees
alter table employees add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_employees on employees;
create trigger set_org_employees before insert on employees
for each row execute function public.set_organization_id();

drop policy if exists "employees_read_by_role" on employees;
drop policy if exists "employees_insert_by_role" on employees;
drop policy if exists "employees_update_by_role" on employees;
drop policy if exists "employees_delete_by_role" on employees;

create policy "employees_read_by_role" on employees for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('employees')));
create policy "employees_insert_by_role" on employees for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('employees')));
create policy "employees_update_by_role" on employees for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('employees')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('employees')));
create policy "employees_delete_by_role" on employees for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('employees')));

-- 10. tasks
alter table tasks add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_tasks on tasks;
create trigger set_org_tasks before insert on tasks
for each row execute function public.set_organization_id();

drop policy if exists "tasks_read_by_role" on tasks;
drop policy if exists "tasks_insert_by_role" on tasks;
drop policy if exists "tasks_update_by_role" on tasks;
drop policy if exists "tasks_delete_by_role" on tasks;

create policy "tasks_read_by_role" on tasks for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('tasks')));
create policy "tasks_insert_by_role" on tasks for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('tasks')));
create policy "tasks_update_by_role" on tasks for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('tasks')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('tasks')));
create policy "tasks_delete_by_role" on tasks for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('tasks')));

-- 11. quotes (preserves the cliente-role "only their own company" clause)
alter table quotes add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_quotes on quotes;
create trigger set_org_quotes before insert on quotes
for each row execute function public.set_organization_id();

drop policy if exists "quotes_read_by_role" on quotes;
drop policy if exists "quotes_insert_by_role" on quotes;
drop policy if exists "quotes_update_by_role" on quotes;
drop policy if exists "quotes_delete_by_role" on quotes;

create policy "quotes_read_by_role" on quotes for select
using (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.can_read_module('quotes')
    and (public.current_role() <> 'cliente' or client = public.current_company_name())
  )
);
create policy "quotes_insert_by_role" on quotes for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('quotes')));
create policy "quotes_update_by_role" on quotes for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('quotes')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('quotes')));
create policy "quotes_delete_by_role" on quotes for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('quotes')));

-- 12. work_orders (same cliente-role clause)
alter table work_orders add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_work_orders on work_orders;
create trigger set_org_work_orders before insert on work_orders
for each row execute function public.set_organization_id();

drop policy if exists "work_orders_read_by_role" on work_orders;
drop policy if exists "work_orders_insert_by_role" on work_orders;
drop policy if exists "work_orders_update_by_role" on work_orders;
drop policy if exists "work_orders_delete_by_role" on work_orders;

create policy "work_orders_read_by_role" on work_orders for select
using (
  public.is_super_admin()
  or (
    organization_id = public.current_organization_id()
    and public.can_read_module('work_orders')
    and (public.current_role() <> 'cliente' or client = public.current_company_name())
  )
);
create policy "work_orders_insert_by_role" on work_orders for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('work_orders')));
create policy "work_orders_update_by_role" on work_orders for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('work_orders')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('work_orders')));
create policy "work_orders_delete_by_role" on work_orders for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('work_orders')));

-- 13. document_files
alter table document_files add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_document_files on document_files;
create trigger set_org_document_files before insert on document_files
for each row execute function public.set_organization_id();

drop policy if exists "document_files_read_by_role" on document_files;
drop policy if exists "document_files_insert_by_role" on document_files;
drop policy if exists "document_files_update_by_role" on document_files;
drop policy if exists "document_files_delete_by_role" on document_files;

create policy "document_files_read_by_role" on document_files for select
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_read_module('document_files')));
create policy "document_files_insert_by_role" on document_files for insert
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('document_files')));
create policy "document_files_update_by_role" on document_files for update
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('document_files')))
with check (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('document_files')));
create policy "document_files_delete_by_role" on document_files for delete
using (public.is_super_admin() or (organization_id = public.current_organization_id() and public.can_write_module('document_files')));

drop policy if exists "erp_documents_storage_read" on storage.objects;
drop policy if exists "erp_documents_storage_insert" on storage.objects;
drop policy if exists "erp_documents_storage_update" on storage.objects;
drop policy if exists "erp_documents_storage_delete" on storage.objects;

create policy "erp_documents_storage_read" on storage.objects for select
using (
  bucket_id = 'erp-documents'
  and public.can_read_module('document_files')
  and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_organization_id()::text)
);
create policy "erp_documents_storage_insert" on storage.objects for insert
with check (
  bucket_id = 'erp-documents'
  and public.can_write_module('document_files')
  and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_organization_id()::text)
);
create policy "erp_documents_storage_update" on storage.objects for update
using (
  bucket_id = 'erp-documents'
  and public.can_write_module('document_files')
  and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_organization_id()::text)
)
with check (
  bucket_id = 'erp-documents'
  and public.can_write_module('document_files')
  and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_organization_id()::text)
);
create policy "erp_documents_storage_delete" on storage.objects for delete
using (
  bucket_id = 'erp-documents'
  and public.can_write_module('document_files')
  and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_organization_id()::text)
);

-- 14. audit_log
alter table audit_log add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_audit_log on audit_log;
create trigger set_org_audit_log before insert on audit_log
for each row execute function public.set_organization_id();

drop policy if exists "audit_log_read_admin_direction" on audit_log;
drop policy if exists "audit_log_insert_authenticated" on audit_log;

create policy "audit_log_read_admin_direction" on audit_log for select
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_role() in ('admin', 'direccion'))
);
create policy "audit_log_insert_authenticated" on audit_log for insert
with check (
  auth.uid() is not null
  and public.current_account_status() = 'active'
  and (public.is_super_admin() or organization_id = public.current_organization_id())
);

-- 15. labor_rate_catalog (per-organization tariffs, per spec)
alter table labor_rate_catalog add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_labor_rate_catalog on labor_rate_catalog;
create trigger set_org_labor_rate_catalog before insert on labor_rate_catalog
for each row execute function public.set_organization_id();

drop policy if exists "labor_rate_catalog_read_by_role" on labor_rate_catalog;
drop policy if exists "labor_rate_catalog_write_admin" on labor_rate_catalog;

create policy "labor_rate_catalog_read_by_role" on labor_rate_catalog for select
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active')
);
create policy "labor_rate_catalog_write_admin" on labor_rate_catalog for all
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion', 'rrhh'))
)
with check (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion', 'rrhh'))
);

-- 16. quote_calculation_profiles (per-organization, per spec)
alter table quote_calculation_profiles add column if not exists organization_id uuid references organizations(id);
drop trigger if exists set_org_quote_calculation_profiles on quote_calculation_profiles;
create trigger set_org_quote_calculation_profiles before insert on quote_calculation_profiles
for each row execute function public.set_organization_id();

drop policy if exists "quote_calculation_profiles_read_by_role" on quote_calculation_profiles;
drop policy if exists "quote_calculation_profiles_write_admin" on quote_calculation_profiles;

create policy "quote_calculation_profiles_read_by_role" on quote_calculation_profiles for select
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active')
);
create policy "quote_calculation_profiles_write_admin" on quote_calculation_profiles for all
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion'))
)
with check (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_account_status() = 'active' and public.current_role() in ('admin', 'direccion'))
);

-- 17. captured_leads / lead_interactions / lead_tasks
alter table captured_leads add column if not exists organization_id uuid references organizations(id);
alter table lead_interactions add column if not exists organization_id uuid references organizations(id);
alter table lead_tasks add column if not exists organization_id uuid references organizations(id);

alter table captured_leads enable row level security;
alter table lead_interactions enable row level security;
alter table lead_tasks enable row level security;

-- 18. document_counters: per-organization numbering.
-- Old global seed rows are dropped (no data migration needed, per spec) —
-- each organization's counters are created on first use by next_document_number.
alter table document_counters add column if not exists organization_id uuid references organizations(id);
alter table document_counters drop constraint if exists document_counters_pkey;
delete from document_counters;
alter table document_counters add constraint document_counters_pkey primary key (organization_id, code);
alter table document_counters alter column organization_id set not null;

drop policy if exists "document_counters_read_admin" on document_counters;
create policy "document_counters_read_admin" on document_counters for select
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.current_role() in ('admin', 'direccion'))
);

create or replace function public.next_document_number(counter_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_counter document_counters%rowtype;
  generated_number text;
  org_id uuid;
  default_prefix text;
  default_padding integer;
begin
  if auth.uid() is null
     or public.current_account_status() <> 'active'
     or public.current_role() not in ('admin', 'direccion', 'ventas', 'operaciones', 'compras', 'finanzas') then
    raise exception 'Not authorized to generate document numbers';
  end if;

  org_id := public.current_organization_id();
  if org_id is null then
    raise exception 'User has no organization assigned';
  end if;

  default_prefix := case counter_code
    when 'quote' then 'P'
    when 'work_order' then 'OT'
    when 'purchase_order' then 'OC'
    when 'invoice' then 'F'
    else null
  end;

  if default_prefix is null then
    raise exception 'Unknown counter code: %', counter_code;
  end if;

  default_padding := case counter_code when 'invoice' then 5 else 4 end;

  insert into document_counters (organization_id, code, prefix, next_value, padding)
  values (org_id, counter_code, default_prefix, 1, default_padding)
  on conflict (organization_id, code) do nothing;

  select *
  into current_counter
  from document_counters
  where organization_id = org_id and code = counter_code
  for update;

  generated_number := current_counter.prefix || '-' || lpad(current_counter.next_value::text, current_counter.padding, '0');

  update document_counters
  set next_value = next_value + 1,
      updated_at = now()
  where organization_id = org_id and code = counter_code;

  return generated_number;
end;
$$;
