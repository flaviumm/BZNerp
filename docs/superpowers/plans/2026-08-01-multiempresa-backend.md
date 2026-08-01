# Multiempresa — Backend (schema, RLS, provisioning) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Bizon ERP into a multi-tenant backend where each `organizations` row has fully isolated data via Postgres RLS, provisioned manually by a super-admin, with supplier catalogs staying shared across all tenants.

**Architecture:** Row-level multi-tenancy: add an `organizations` table and an `organization_id` column to every tenant-scoped table, then extend the existing role-based RLS policies (`can_read_module`, `can_write_module`) with an additional organization filter. A `before insert` trigger auto-stamps `organization_id` from the caller's session so existing frontend insert code (`src/lib/erpRepository.js`) needs no changes. `material_price_catalog` is explicitly excluded — it stays shared.

**Tech Stack:** Supabase (Postgres + RLS + Storage + Edge Functions/Deno), `@supabase/supabase-js` v2, Node.js scripts (existing `scripts/*.mjs` convention).

## Global Constraints

- No self-signup — organizations and their first admin are created only via the `create-organization` edge function, callable only by a super-admin (from the approved spec, `docs/superpowers/specs/2026-08-01-multiempresa-design.md`).
- `material_price_catalog` (supplier catalog) is never organization-scoped — it stays global/shared (from spec).
- No migration of existing dev data is required — the user chose to start clean (from spec).
- Every new/changed RLS policy must preserve the existing role semantics (`admin`, `direccion`, `ventas`, `operaciones`, `compras`, `finanzas`, `rrhh`, `cliente`) exactly as defined in `supabase/migrations/20260510213000_harden_rls_rpc.sql` — this plan only adds an organization filter on top, it does not change who-can-do-what within an organization.
- This plan covers backend/data only. The "Organizaciones" super-admin UI screen is a separate follow-up plan (Plan 2) and is out of scope here.

---

### Task 1: Multiempresa schema migration (organizations, org scoping, RLS)

**Files:**
- Create: `supabase/migrations/20260801120000_multiempresa.sql`

**Interfaces:**
- Produces: table `organizations(id uuid, name text, created_at timestamptz)`; column `organization_id uuid` on `profiles`, `companies`, `opportunities`, `quotes`, `work_orders`, `inventory_items`, `purchase_orders`, `invoices`, `employees`, `tasks`, `document_files`, `audit_log`, `labor_rate_catalog`, `quote_calculation_profiles`, `captured_leads`, `lead_interactions`, `lead_tasks`, `document_counters`; column `is_super_admin boolean` on `profiles`; SQL functions `public.current_organization_id() returns uuid`, `public.is_super_admin() returns boolean`; rewritten `public.next_document_number(counter_code text) returns text` (now scoped per organization).

- [ ] **Step 1: Write the organizations table, profiles columns, and helper functions**

Create `supabase/migrations/20260801120000_multiempresa.sql` starting with:

```sql
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
```

- [ ] **Step 2: Scope `profiles` itself so admins only see users in their own organization**

Append to the same file:

```sql
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
```

- [ ] **Step 3: Scope the standard-pattern tables (companies, opportunities, inventory_items, purchase_orders, invoices, employees, tasks)**

Append to the same file — this repeats the identical pattern per table (add column, add trigger, rewrite the 4 policies with an organization filter layered on top of the existing role check):

```sql
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
```

- [ ] **Step 4: Scope `quotes` and `work_orders` (these have the extra `cliente`-role clause from `20260508014500_cliente_role_company_scope.sql` — preserve it)**

Append to the same file:

```sql
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
```

- [ ] **Step 5: Scope `document_files` + the `erp-documents` Storage bucket policies (path-prefix based)**

Append to the same file. Storage paths will be `{organization_id}/...` (wired in Task 4); `storage.foldername(name)` returns the path split into an array, so `[1]` is the first folder segment:

```sql
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
```

- [ ] **Step 6: Scope `audit_log`, `labor_rate_catalog`, `quote_calculation_profiles` (per spec, these are per-organization tariffs, not shared)**

Append to the same file:

```sql
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
```

Note: `material_price_catalog` is deliberately **not** touched in this migration — it stays shared across all organizations, per spec.

- [ ] **Step 7: Lock down `captured_leads`, `lead_interactions`, `lead_tasks` (currently have NO RLS at all)**

These three tables currently have row level security disabled entirely (verified: no `enable row level security` for them in any existing migration), meaning any authenticated grantee can read/write them today. They are only ever accessed through the `captured-leads` edge function using the service-role key (which bypasses RLS regardless of policies — verified the frontend `src/components/CaptadorLeads.jsx` never queries these tables directly). Enabling RLS with zero policies for `anon`/`authenticated` closes that pre-existing gap and forces all access through the edge function, which will enforce organization scoping itself (Task 3).

Append to the same file:

```sql
-- 17. captured_leads / lead_interactions / lead_tasks
alter table captured_leads add column if not exists organization_id uuid references organizations(id);
alter table lead_interactions add column if not exists organization_id uuid references organizations(id);
alter table lead_tasks add column if not exists organization_id uuid references organizations(id);

alter table captured_leads enable row level security;
alter table lead_interactions enable row level security;
alter table lead_tasks enable row level security;
```

- [ ] **Step 8: Scope `document_counters` per organization and rewrite `next_document_number`**

`document_counters` currently has a simple `code` primary key shared globally (`quote`, `work_order`, `purchase_order`, `invoice`). Each organization needs its own independent numbering sequence starting at 1. Append to the same file:

```sql
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
```

- [ ] **Step 9: Apply the migration to a Supabase dev/staging project**

This project has no local Docker-based Supabase stack configured (`supabase/config.toml` exists but no evidence of `supabase start` in the documented workflow — `DEPLOY.md`/`SUPABASE_SETUP.md` both describe running SQL against a hosted project). Apply against a **dev/staging** Supabase project (not production), linked via the Supabase CLI:

```bash
supabase link --project-ref <dev-project-ref>
supabase db push
```

Expected: CLI reports the new migration `20260801120000_multiempresa` applied successfully, no errors.

- [ ] **Step 10: Verify the migration applied cleanly**

Run this sanity check via `supabase db push` output or the Supabase SQL editor:

```sql
select table_name, column_name
from information_schema.columns
where column_name = 'organization_id'
order by table_name;
```

Expected: 18 rows — one per table: `audit_log`, `captured_leads`, `companies`, `document_counters`, `document_files`, `employees`, `inventory_items`, `invoices`, `labor_rate_catalog`, `lead_interactions`, `lead_tasks`, `opportunities`, `profiles`, `purchase_orders`, `quote_calculation_profiles`, `quotes`, `tasks`, `work_orders`. `material_price_catalog` must **not** appear.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260801120000_multiempresa.sql
git commit -m "$(cat <<'EOF'
Add multiempresa schema migration (organizations, org-scoped RLS)

Adds organizations table, organization_id on every tenant table, an
auto-stamp trigger, and rewrites RLS policies to filter by organization
on top of the existing role checks. material_price_catalog stays shared.
Also closes a pre-existing gap: captured_leads/lead_interactions/lead_tasks
had no RLS at all.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `create-organization` edge function + scope `admin-create-user` to caller's organization

**Files:**
- Create: `supabase/functions/create-organization/index.ts`
- Modify: `supabase/functions/admin-create-user/index.ts`

**Interfaces:**
- Consumes: `organizations` table, `profiles.organization_id`, `profiles.is_super_admin` (Task 1).
- Produces: HTTP endpoint `POST /functions/v1/create-organization` — body `{ organizationName, email, password, fullName }`, response `{ organization: { id, name, created_at }, user: { id, fullName, role, status, organizationId, createdAt } }` on success, `{ error }` on failure. `admin-create-user` now stamps `organization_id` from the caller's own profile instead of leaving it unset.

- [ ] **Step 1: Write `create-organization`**

Create `supabase/functions/create-organization/index.ts`:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bznerp.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase function configuration.");
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace("Bearer ", "");
    if (!token) {
      return json({ error: "No autorizado." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await userClient.auth.getUser(token);
    if (callerError || !callerData.user) {
      return json({ error: "Sesion invalida." }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_super_admin")
      .eq("id", callerData.user.id)
      .single();

    if (profileError || !callerProfile?.is_super_admin) {
      return json({ error: "Solo un super-admin puede crear organizaciones." }, 403);
    }

    const body = await request.json();
    const organizationName = String(body.organizationName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || email).trim();

    if (!organizationName) {
      return json({ error: "El nombre de la organizacion es obligatorio." }, 400);
    }
    if (!email || !password || password.length < 6) {
      return json({ error: "Email y password de al menos 6 caracteres son obligatorios." }, 400);
    }

    const { data: organization, error: organizationError } = await adminClient
      .from("organizations")
      .insert({ name: organizationName })
      .select("id, name, created_at")
      .single();

    if (organizationError) {
      return json({ error: organizationError.message }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    const { data: profile, error: upsertError } = await adminClient
      .from("profiles")
      .upsert(
        { id: created.user.id, full_name: fullName, role: "admin", status: "active", organization_id: organization.id },
        { onConflict: "id" }
      )
      .select("id, full_name, role, status, organization_id, created_at")
      .single();

    if (upsertError) {
      return json({ error: upsertError.message }, 400);
    }

    return json({
      organization,
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        status: profile.status,
        organizationId: profile.organization_id,
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    return json({ error: error.message || "No se pudo crear la organizacion." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Scope `admin-create-user` to the caller's own organization**

Replace the full contents of `supabase/functions/admin-create-user/index.ts` with:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bznerp.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roles = new Set(["admin", "direccion", "ventas", "operaciones", "compras", "finanzas", "rrhh", "cliente"]);
const statuses = new Set(["pending", "active", "suspended"]);
const screenKeys = new Set([
  "dashboard",
  "clientes",
  "crm",
  "importar",
  "presupuestos",
  "cotizador",
  "ot",
  "inventario",
  "compras",
  "finanzas",
  "rrhh",
  "tareas",
  "calendario",
  "documentos",
  "auditoria",
  "usuarios",
  "reportes",
]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase function configuration.");
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace("Bearer ", "");
    if (!token) {
      return json({ error: "No autorizado." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await userClient.auth.getUser(token);
    if (callerError || !callerData.user) {
      return json({ error: "Sesion invalida." }, 401);
    }

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, status, organization_id")
      .eq("id", callerData.user.id)
      .single();

    if (
      profileError ||
      callerProfile?.role !== "admin" ||
      callerProfile?.status !== "active" ||
      !callerProfile?.organization_id
    ) {
      return json({ error: "Solo un administrador activo de una organizacion puede crear usuarios." }, 403);
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.fullName || email).trim();
    const role = roles.has(body.role) ? body.role : "ventas";
    const status = statuses.has(body.status) ? body.status : "pending";
    const companyName = String(body.companyName || "").trim() || null;
    const menuKeys = Array.isArray(body.menuKeys)
      ? body.menuKeys.filter((key: unknown) => screenKeys.has(String(key))).map(String)
      : [];

    if (!email || !password || password.length < 6) {
      return json({ error: "Email y password de al menos 6 caracteres son obligatorios." }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    const { data: profile, error: upsertError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: created.user.id,
          full_name: fullName,
          role,
          status,
          company_name: companyName,
          menu_keys: menuKeys.length ? menuKeys : null,
          organization_id: callerProfile.organization_id,
        },
        { onConflict: "id" }
      )
      .select("id, full_name, role, status, company_name, menu_keys, organization_id, created_at")
      .single();

    if (upsertError) {
      return json({ error: upsertError.message }, 400);
    }

    return json({
      user: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
        status: profile.status,
        companyName: profile.company_name || "",
        menuKeys: Array.isArray(profile.menu_keys) ? profile.menu_keys : null,
        organizationId: profile.organization_id,
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    return json({ error: error.message || "No se pudo crear el usuario." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

The key change: `organization_id: callerProfile.organization_id` is now stamped server-side from the caller's own profile — an org admin can never assign an arbitrary organization to a new user, and the endpoint now requires the caller to belong to an organization (rejects bare super-admins, who use `create-organization` instead).

- [ ] **Step 3: Deploy both functions to the dev/staging project**

```bash
supabase functions deploy create-organization --project-ref <dev-project-ref>
supabase functions deploy admin-create-user --project-ref <dev-project-ref>
```

Expected: both report "Deployed Function" with no errors.

- [ ] **Step 4: Smoke-test `create-organization` manually**

First, bootstrap one super-admin directly in the dev database (one-time, mirrors the existing admin-promotion pattern in `SUPABASE_SETUP.md`):

```sql
update profiles set is_super_admin = true where full_name = 'NOMBRE DEL SUPER-ADMIN';
```

Then call the function with that user's session token:

```bash
curl -X POST "https://<dev-project-ref>.supabase.co/functions/v1/create-organization" \
  -H "Authorization: Bearer <super-admin-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Cliente Prueba SA","email":"admin@clienteprueba.test","password":"testpass123","fullName":"Admin Prueba"}'
```

Expected: HTTP 200, JSON body with `organization.id` and `user.organizationId` matching.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/create-organization/index.ts supabase/functions/admin-create-user/index.ts
git commit -m "$(cat <<'EOF'
Add create-organization function, scope admin-create-user to caller's org

Super-admins provision new organizations + their first admin via
create-organization. admin-create-user now stamps organization_id from
the caller's own profile instead of leaving new users unscoped.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Scope the `captured-leads` edge function to the caller's organization

**Files:**
- Modify: `supabase/functions/captured-leads/index.ts` (full replacement)

**Interfaces:**
- Consumes: `captured_leads.organization_id`, `lead_interactions.organization_id`, `lead_tasks.organization_id`, `companies.organization_id` (Task 1).
- Produces: same HTTP routes as before, now organization-scoped — a request from one organization's user can never read, update, delete, or discover-as-duplicate another organization's leads/companies.

This function uses the service-role key (`adminClient`), which bypasses RLS entirely — so without this change, Task 1's RLS on `captured_leads`/`lead_interactions`/`lead_tasks` would give zero real isolation for this feature, since 100% of its access goes through this function.

- [ ] **Step 1: Replace the full file**

Replace the full contents of `supabase/functions/captured-leads/index.ts` with:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bznerp.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Missing Supabase function configuration.");

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace("Bearer ", "");
    if (!token) return json({ error: "No autorizado." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await userClient.auth.getUser(token);
    if (callerError || !callerData.user) return json({ error: "Sesion invalida." }, 401);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", callerData.user.id)
      .single();

    if (profileError || !callerProfile?.organization_id) {
      return json({ error: "Usuario sin organizacion asignada." }, 403);
    }
    const organizationId = callerProfile.organization_id;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");
    const parts = path.split("/").filter(Boolean);

    // route under /api/captured-leads...
    // support: POST /api/captured-leads, GET /api/captured-leads, GET /api/captured-leads/:id, PATCH, DELETE

    if (request.method === "POST" && parts.slice(-1)[0] === "captured-leads") {
      const body = await request.json();
      // expected: { source, image_url, raw_text, extracted_data }
      const insert = {
        organization_id: organizationId,
        source: body.source || 'web',
        image_url: body.image_url || null,
        raw_text: body.raw_text || null,
        extracted_data: body.extracted_data || null,
        company_name: body.company_name || null,
        project_name: body.project_name || null,
        contact_name: body.contact_name || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        website: body.website || null,
        address: body.address || null,
        city: body.city || null,
        province: body.province || null,
        business_type: body.business_type || null,
        project_type: body.project_type || null,
        services_match: Array.isArray(body.services_match) ? body.services_match : null,
        opportunity_level: body.opportunity_level || null,
        urgency: body.urgency || null,
        status: body.status || 'captado_desde_foto',
        next_action: body.next_action || null,
        next_follow_up_date: body.next_follow_up_date || null,
        notes: body.notes || null,
        confidence_score: body.confidence_score || null,
      };

      const { data, error } = await adminClient.from('captured_leads').insert(insert).select('*').single();
      if (error) return json({ error: error.message }, 400);
      return json({ lead: data }, 201);
    }

    if (request.method === "GET" && parts.slice(-1)[0] === "captured-leads") {
      // support CSV export via ?format=csv
      const format = url.searchParams.get('format');
      const { data, error } = await adminClient
        .from('captured_leads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      if (format === 'csv') {
        const rows = data || [];
        const headers = ['id','created_at','company_name','project_name','contact_name','phone','whatsapp','email','website','city','province','status','opportunity_level','urgency','confidence_score'];
        const csv = [headers.join(',')].concat(rows.map((r: any) => headers.map(h => safeCsv(String(r[h] ?? ''))).join(','))).join('\n');
        return new Response(csv, { headers: { ...corsHeaders, 'Content-Type': 'text/csv' } });
      }
      return json({ leads: data });
    }

    // operations for specific id
    const idIndex = parts.indexOf('captured-leads');
    if (idIndex >= 0 && parts.length > idIndex + 1) {
      const id = parts[idIndex + 1];
      if (request.method === 'GET') {
        const { data, error } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
        if (error) return json({ error: error.message }, 404);
        return json({ lead: data });
      }

      if (request.method === 'PATCH') {
        const body = await request.json();
        const { data, error } = await adminClient.from('captured_leads').update(body).eq('id', id).eq('organization_id', organizationId).select('*').single();
        if (error) return json({ error: error.message }, 400);
        return json({ lead: data });
      }

      if (request.method === 'DELETE') {
        const { error } = await adminClient.from('captured_leads').delete().eq('id', id).eq('organization_id', organizationId);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      // POST sub-actions: analyze-image, research, generate-email, generate-whatsapp, convert-to-client, create-opportunity, create-followup, log-interaction
      if (request.method === 'POST') {
        const action = parts[idIndex + 2] || '';
        const body = await request.json().catch(() => ({}));
        if (action === 'analyze-image') {
          // Attempt OCR using OCR.Space when available, otherwise accept raw_text from body
          const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
          let raw = body.raw_text || null;
          try {
            if (!raw) {
              // prefer image_url from lead record
              const { data: leadRec } = await adminClient.from('captured_leads').select('image_url').eq('id', id).eq('organization_id', organizationId).single();
              const imageUrl = leadRec?.image_url || body.image_url || null;
              if (imageUrl && ocrApiKey) {
                raw = await performOcrWithOcrSpace(imageUrl, ocrApiKey);
              }
            }
          } catch (e) {
            console.error('OCR error', e?.message || e);
          }

          // heuristic extraction from raw text
          const extracted = body.extracted_data || (raw ? parseExtractedData(String(raw)) : null);

          const { data, error } = await adminClient
            .from('captured_leads')
            .update({ raw_text: raw, extracted_data: extracted, company_name: extracted?.company_name || null, contact_name: extracted?.contact_name || null, phone: extracted?.phone || null, email: extracted?.email || null, website: extracted?.website || null, status: 'analizado' })
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select('*')
            .single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'research') {
          // stub: mark pending investigation and attach research results
          const research = body.research || { notes: 'Pendiente: implementar agente OpenClaw/LLM' };
          const { data, error } = await adminClient.from('captured_leads').update({ extracted_data: research, status: 'investigado' }).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'generate-email') {
          // simple template generator
          const { data: lead } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
          const subject = `Contacto desde cartel - ${lead.company_name || lead.project_name || 'Nuevo Lead'}`;
          const bodyText = `Hola ${lead.contact_name || ''},\n\nMe contacto desde Bizon respecto a ${lead.project_name || lead.company_name || 'su proyecto'}. Nos dedicamos a: ${Array.isArray(lead.services_match) ? lead.services_match.join(', ') : 'servicios industriales'}.\n\nQuedo a disposición para coordinar una visita o llamada.\n\nSaludos.`;
          return json({ subject, body: bodyText });
        }

        if (action === 'generate-whatsapp') {
          const { data: lead } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
          const message = `Hola ${lead.contact_name || ''}, soy de Bizon. Vi su cartel en ${lead.project_name || lead.company_name || 'obra'} y quería coordinar una breve llamada. ¿Le viene bien mañana?`;
          return json({ message });
        }

        if (action === 'convert-to-client') {
          // stub: set crm_client_id after creating a client in CRM (not implemented)
          const fakeClientId = body.client_id || null;
          const updates: any = { status: 'ganado' };
          if (fakeClientId) updates.crm_client_id = fakeClientId;
          const { data, error } = await adminClient.from('captured_leads').update(updates).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'create-opportunity') {
          const fakeOppId = body.opportunity_id || null;
          const updates: any = { status: 'presupuesto_enviado' };
          if (fakeOppId) updates.crm_opportunity_id = fakeOppId;
          const { data, error } = await adminClient.from('captured_leads').update(updates).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'create-followup') {
          // create a lead_tasks entry
          const task = {
            organization_id: organizationId,
            lead_id: id,
            title: body.title || 'Seguimiento',
            description: body.description || null,
            due_date: body.due_date || null,
            status: body.status || 'pending',
            priority: body.priority || 'normal',
          };
          const { data, error } = await adminClient.from('lead_tasks').insert(task).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ task: data }, 201);
        }

        if (action === 'log-interaction') {
          const interaction = {
            organization_id: organizationId,
            lead_id: id,
            channel: body.channel || null,
            action_type: body.action_type || null,
            message_subject: body.message_subject || null,
            message_body: body.message_body || null,
            response_summary: body.response_summary || null,
            result: body.result || null,
            next_action: body.next_action || null,
            user_notes: body.user_notes || null,
          };
          const { data, error } = await adminClient.from('lead_interactions').insert(interaction).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ interaction: data }, 201);
        }

        if (action === 'find-duplicates') {
          const { data: lead, error: leadError } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
          if (leadError || !lead) return json({ error: leadError?.message || 'Lead no encontrado' }, 404);

          const companyName = normalizeText(body.company_name || lead.company_name || lead.project_name || '');
          const email = normalizeText(body.email || lead.email || '');
          const phone = normalizePhone(body.phone || lead.phone || lead.whatsapp || '');
          const contact = normalizeText(body.contact_name || lead.contact_name || '');

          const leadFilters = [];
          if (email) leadFilters.push(`email.eq.${email}`);
          if (phone) leadFilters.push(`phone.eq.${phone}`);
          if (contact) leadFilters.push(`contact_name.ilike.*${contact}*`);
          if (companyName) leadFilters.push(`company_name.ilike.*${companyName}*`);

          const duplicateLeads = leadFilters.length
            ? await fetchDuplicateCapturedLeads(adminClient, id, organizationId, leadFilters)
            : [];

          const companyFilters = [];
          if (companyName) companyFilters.push(`name.ilike.*${companyName}*`);
          if (phone) companyFilters.push(`phone.eq.${phone}`);
          if (email) companyFilters.push(`contacts.ilike.*${email}*`);
          if (phone) companyFilters.push(`contacts.ilike.*${phone}*`);

          const duplicateCompanies = companyFilters.length
            ? await fetchDuplicateCompanies(adminClient, organizationId, companyFilters)
            : [];

          return json({ duplicates: { leads: duplicateLeads, companies: duplicateCompanies } });
        }

        if (action === 'link-existing-client') {
          const clientId = body.client_id;
          if (!clientId) return json({ error: 'client_id es requerido.' }, 400);
          const { data, error } = await adminClient.from('captured_leads').update({ crm_client_id: clientId, status: 'contacto_preparado', notes: `Vinculado con cliente existente ${clientId}` }).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'link-existing-lead') {
          const duplicateLeadId = body.duplicate_lead_id;
          if (!duplicateLeadId) return json({ error: 'duplicate_lead_id es requerido.' }, 400);
          const { data, error } = await adminClient.from('captured_leads').update({ status: 'descartado', notes: `Duplicado de lead ${duplicateLeadId}` }).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }
      }
    }

    return json({ error: 'Ruta no encontrada' }, 404);
  } catch (error) {
    return json({ error: error.message || 'Error interno' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeCsv(value: string) {
  if (value == null) return '';
  const escaped = String(value).replace(/"/g, '""');
  if (escaped.search(/,|"|\n/) >= 0) return '"' + escaped + '"';
  return escaped;
}

async function performOcrWithOcrSpace(imageUrl, apiKey) {
  const form = new FormData();
  form.append('apikey', apiKey);
  form.append('url', imageUrl);
  form.append('language', 'spa');
  form.append('isOverlayRequired', 'false');

  const resp = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
  const json = await resp.json();
  if (!json || !json.ParsedResults || !json.ParsedResults.length) return null;
  return json.ParsedResults.map((r) => r.ParsedText).join('\n');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

async function fetchDuplicateCapturedLeads(adminClient, currentId, organizationId, filters) {
  const query = adminClient.from('captured_leads').select('*').eq('organization_id', organizationId).neq('id', currentId);
  filters.forEach((filter) => query.or(filter));
  const { data, error } = await query.limit(10);
  if (error) return [];
  return data;
}

async function fetchDuplicateCompanies(adminClient, organizationId, filters) {
  const query = adminClient.from('companies').select('*').eq('organization_id', organizationId);
  filters.forEach((filter) => query.or(filter));
  const { data, error } = await query.limit(10);
  if (error) return [];
  return data;
}

function parseExtractedData(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const extracted = {};
  // email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) extracted.email = emailMatch[0];
  // phone (simple)
  const phoneMatch = text.match(/(\+?\d[\d \-().]{6,}\d)/);
  if (phoneMatch) extracted.phone = phoneMatch[0].replace(/\s+/g, '');
  // website
  const webMatch = text.match(/(https?:\/\/)?([\w.-]+\.[A-Za-z]{2,})(\/\S*)?/);
  if (webMatch) extracted.website = webMatch[0];
  // company: heuristics: first non-generic line with words
  return extracted;
}
```

Note: this also fixes a pre-existing bug in `generate-email`/`generate-whatsapp` where the original code destructured `{ lead }` from the query result instead of `{ data: lead }` (the Supabase client returns `{ data, error }`, not `{ lead }`) — those two actions would have thrown on `lead.company_name` being undefined before this change. Fixed as `{ data: lead }` while making the organization-scoping change to the same lines.

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy captured-leads --project-ref <dev-project-ref>
```

Expected: "Deployed Function" with no errors.

- [ ] **Step 3: Smoke-test organization scoping manually**

Using two different users (from two different organizations created via Task 2's `create-organization`), create a lead as user A, then try to fetch it by id as user B:

```bash
curl "https://<dev-project-ref>.supabase.co/functions/v1/captured-leads/<lead-id-from-org-a>" \
  -H "Authorization: Bearer <user-b-access-token>"
```

Expected: HTTP 404 `{ "error": "..." }` — user B cannot see org A's lead.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/captured-leads/index.ts
git commit -m "$(cat <<'EOF'
Scope captured-leads function to caller's organization

This function uses the service-role key and bypasses RLS entirely, so
without explicit organization_id filtering on every query it would leak
leads/interactions/tasks across organizations regardless of the RLS
policies added in the schema migration.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Thread `organizationId` into document uploads (Storage path prefix)

**Files:**
- Modify: `src/lib/authRepository.js:50-82`
- Modify: `src/lib/erpRepository.js:307-330`
- Modify: `mini_erp_bizon_prototipo.jsx:4303-4328`

**Interfaces:**
- Consumes: `profiles.organization_id`, `profiles.is_super_admin` (Task 1), the storage policies from Task 1 Step 5 (which require the first path segment to equal the caller's `organization_id`).
- Produces: `getCurrentProfile()`/`listUserProfiles()` results now include `organizationId` and `isSuperAdmin`; `uploadDocumentFile(file, metadata, organizationId)` gains a third parameter and prefixes the Storage path with it.

- [ ] **Step 1: Add `organizationId`/`isSuperAdmin` to the profile shape**

In `src/lib/authRepository.js`, replace the `mapProfile` function (currently lines 50-60):

```js
function mapProfile(profile) {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    status: profile.status || "pending",
    companyName: profile.company_name || "",
    menuKeys: Array.isArray(profile.menu_keys) ? profile.menu_keys : null,
    organizationId: profile.organization_id || null,
    isSuperAdmin: Boolean(profile.is_super_admin),
    createdAt: profile.created_at,
  };
}
```

Then update the two `.select(...)` calls that read `profiles` to include the new columns. In `getCurrentProfile` (currently `select("id, full_name, role, status, company_name, menu_keys")`):

```js
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, company_name, menu_keys, organization_id, is_super_admin")
    .eq("id", id)
    .maybeSingle();
```

And in `listUserProfiles` (currently `select("id, full_name, role, status, company_name, menu_keys, created_at")`):

```js
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, company_name, menu_keys, organization_id, is_super_admin, created_at")
    .order("created_at", { ascending: false });
```

- [ ] **Step 2: Prefix the Storage path with `organizationId`**

In `src/lib/erpRepository.js`, replace `uploadDocumentFile` (currently lines 307-330):

```js
export async function uploadDocumentFile(file, metadata, organizationId) {
  if (!isDatabaseConfigured) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const orgFolder = organizationId || "sin-organizacion";
  const folder = `${orgFolder}/${metadata.relatedType || "General"}/${metadata.relatedNumber || "sin-numero"}`;
  const storagePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("erp-documents").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const record = {
    ...metadata,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
    url: null,
  };

  return saveErpRecord("documents", record);
}
```

- [ ] **Step 3: Pass `profile.organizationId` at the call site**

In `mini_erp_bizon_prototipo.jsx`, inside `uploadDocument` (currently around line 4303-4328), change the call:

```js
    if (isDatabaseConfigured) {
      const saved = await uploadDocumentFile(file, baseRecord, profile?.organizationId);
      const record = saved || baseRecord;
      setDocuments((items) => [...items, record]);
      audit("upload", "documents", record, `Documento cargado: ${record.name}`);
      return;
    }
```

(only the `uploadDocumentFile(file, baseRecord)` call changes to `uploadDocumentFile(file, baseRecord, profile?.organizationId)` — everything else in the function is unchanged).

- [ ] **Step 4: Manually verify an upload round-trips correctly**

With the dev project from Tasks 1-3, sign in as an organization's user in the running app (`npm run dev`), upload a document from any screen that calls `uploadDocument`, then check in the Supabase Storage browser that the object's path starts with that user's `organization_id`.

Expected: object path is `<organization-id>/<relatedType>/<relatedNumber>/<timestamp>-<filename>`, and the upload succeeds (no RLS violation from the Task 1 Step 5 storage policies).

- [ ] **Step 5: Commit**

```bash
git add src/lib/authRepository.js src/lib/erpRepository.js mini_erp_bizon_prototipo.jsx
git commit -m "$(cat <<'EOF'
Thread organizationId into profile shape and document uploads

Storage paths are now prefixed with organization_id so the Task 1
storage.objects RLS policies (which check the first path segment) can
actually enforce per-organization file isolation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Automated isolation test + bootstrap documentation

**Files:**
- Create: `scripts/test-multitenant-isolation.mjs`
- Modify: `SUPABASE_SETUP.md` (append a new section)

**Interfaces:**
- Consumes: `create-organization` function (Task 2), all RLS policies from Task 1, `captured-leads` function (Task 3).
- Produces: a runnable script that proves organization isolation end-to-end; exits non-zero on any isolation failure.

This is the mandatory verification for a data-isolation/security feature (per the approved spec's Testing section) — it is not optional.

- [ ] **Step 1: Write the isolation test script**

Create `scripts/test-multitenant-isolation.mjs`, following the existing `scripts/backup-supabase.mjs` convention for reading env vars and creating a service-role client:

```js
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL, VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

let failures = 0;

function assertTrue(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function createTestOrgAndAdmin(label) {
  const stamp = Date.now();
  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .insert({ name: `Test Org ${label} ${stamp}` })
    .select("id, name")
    .single();
  if (organizationError) throw organizationError;

  const email = `test-${label.toLowerCase()}-${stamp}@isolation.test`;
  const password = `Test${stamp}pass!`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test Admin ${label}` },
  });
  if (createError) throw createError;

  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert({ id: created.user.id, full_name: `Test Admin ${label}`, role: "admin", status: "active", organization_id: organization.id }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: session, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { organization, userId: created.user.id, userClient, session };
}

async function cleanup(ids) {
  await adminClient.from("companies").delete().in("organization_id", ids.organizationIds);
  await adminClient.from("profiles").delete().in("id", ids.userIds);
  for (const userId of ids.userIds) {
    await adminClient.auth.admin.deleteUser(userId);
  }
  await adminClient.from("organizations").delete().in("id", ids.organizationIds);
}

async function main() {
  const orgA = await createTestOrgAndAdmin("A");
  const orgB = await createTestOrgAndAdmin("B");

  const { data: companyA, error: companyAError } = await orgA.userClient
    .from("companies")
    .insert({ name: `Cliente Org A ${Date.now()}` })
    .select("id, organization_id")
    .single();
  assertTrue(!companyAError, `org A admin can create a company (error: ${companyAError?.message})`);
  assertTrue(companyA?.organization_id === orgA.organization.id, "created company is auto-stamped with org A's organization_id");

  const { data: crossReadAttempt, error: crossReadError } = await orgB.userClient
    .from("companies")
    .select("id")
    .eq("id", companyA.id);
  assertTrue(!crossReadError, `org B querying org A's company id does not error (error: ${crossReadError?.message})`);
  assertTrue((crossReadAttempt || []).length === 0, "org B cannot read org A's company (RLS filters it out)");

  const { data: ownReadAttempt, error: ownReadError } = await orgA.userClient
    .from("companies")
    .select("id")
    .eq("id", companyA.id);
  assertTrue(!ownReadError && (ownReadAttempt || []).length === 1, "org A can read its own company");

  const { error: superAdminPromoteError } = await adminClient
    .from("profiles")
    .update({ is_super_admin: true })
    .eq("id", orgA.userId);
  assertTrue(!superAdminPromoteError, `promoting org A's user to super_admin for the next check (error: ${superAdminPromoteError?.message})`);

  const superAdminSession = await orgA.userClient.auth.refreshSession();
  const { data: superAdminRead, error: superAdminReadError } = await orgA.userClient
    .from("companies")
    .select("id")
    .eq("id", companyA.id);
  assertTrue(!superAdminReadError && (superAdminRead || []).length === 1, "super-admin can still read org A's company after promotion");

  await cleanup({
    organizationIds: [orgA.organization.id, orgB.organization.id],
    userIds: [orgA.userId, orgB.userId],
  });

  if (failures > 0) {
    console.error(`\n${failures} isolation check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll multi-tenant isolation checks passed.");
}

main().catch((error) => {
  console.error("Isolation test crashed:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against the dev/staging project**

```bash
VITE_SUPABASE_URL=https://<dev-project-ref>.supabase.co \
VITE_SUPABASE_ANON_KEY=<dev-anon-key> \
SUPABASE_SERVICE_ROLE_KEY=<dev-service-role-key> \
node scripts/test-multitenant-isolation.mjs
```

Expected output ends with:

```
OK: org A admin can create a company (error: undefined)
OK: created company is auto-stamped with org A's organization_id
OK: org B querying org A's company id does not error (error: undefined)
OK: org B cannot read org A's company (RLS filters it out)
OK: org A can read its own company
OK: promoting org A's user to super_admin for the next check (error: undefined)
OK: super-admin can still read org A's company after promotion

All multi-tenant isolation checks passed.
```

Exit code `0`. If any `FAIL:` line appears, the corresponding RLS policy from Task 1 has a bug — stop and fix it before proceeding; do not treat this test as optional.

- [ ] **Step 3: Document the first super-admin bootstrap step**

Append to `SUPABASE_SETUP.md`, following the existing "Crear primer usuario admin" section's style (verified pattern at `SUPABASE_SETUP.md:56-84`):

```markdown
## 7. Multiempresa: crear el primer super-admin

El sistema es multiempresa: cada organizacion tiene sus datos aislados. Un
super-admin (vos) crea cada organizacion nueva y su primer usuario admin
invocando la funcion `create-organization`.

1. Crear un usuario normal desde `Crear usuario` en el ERP (o via
   `admin-create-user` si ya existe una organizacion).
2. Promoverlo a super-admin en Supabase:

```sql
update profiles
set is_super_admin = true
where full_name = 'NOMBRE DEL SUPER-ADMIN'
   or id = 'UUID_DEL_USUARIO';
```

3. Ese usuario ya puede llamar a `create-organization` con su token de sesion
   para dar de alta empresas nuevas (nombre de la empresa + datos del primer
   admin de esa empresa):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/create-organization" \
  -H "Authorization: Bearer <token-del-super-admin>" \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Nombre Empresa Cliente","email":"admin@empresa.com","password":"password-temporal","fullName":"Nombre Admin"}'
```

Verificar organizaciones existentes:

```sql
select id, name, created_at from organizations order by created_at desc;
```
```

- [ ] **Step 4: Commit**

```bash
git add scripts/test-multitenant-isolation.mjs SUPABASE_SETUP.md
git commit -m "$(cat <<'EOF'
Add multi-tenant isolation test and super-admin bootstrap docs

Verifies end-to-end that one organization cannot read another's data
through RLS, and that super-admins retain cross-org access. Documents
how to bootstrap the first super-admin and create organizations.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Follow-up (Plan 2, not in this plan)

- "Organizaciones" super-admin screen in `mini_erp_bizon_prototipo.jsx` (list + create-organization form), gated on `profile.isSuperAdmin`. Until then, the super-admin bootstraps organizations via `curl` per Task 5 Step 3.
- No other frontend screens need changes — RLS transparently scopes every existing query once a user has an `organization_id`.
