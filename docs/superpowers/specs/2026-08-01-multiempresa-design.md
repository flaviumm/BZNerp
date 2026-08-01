# Multiempresa (multi-tenant SaaS) — Design

Date: 2026-08-01
Status: Approved, ready for implementation planning

## Purpose

Turn the Bizon ERP from a single-company app into a multi-tenant product: several
independent PyME customers use the same deployment, each with their own users and
fully isolated data. Bizon (the vendor) provisions each new customer manually — no
self-signup.

## Scope decisions (from brainstorming)

- **Tenant model**: multi-tenant SaaS — each customer company ("organization") has
  isolated data and users, not "Bizon manages several of its own legal entities."
- **Provisioning**: manual, by a platform super-admin. No public signup flow.
- **Super-admin role**: yes — a platform-level role, separate from each
  organization's own `admin` role, that can create organizations and see across
  them for support purposes.
- **Existing data**: not migrated. The current dev/seed data can be wiped; the
  system starts clean under the new schema. No backfill logic needed.
- **Shared vs per-tenant data**: supplier catalogs (Neucon, Ferromundo, Carlos
  Isla — synced via `scripts/nightly-update.mjs` into `material_price_catalog`)
  stay **global/shared** across all organizations. Labor rates and quote
  calculation profiles (`labor_rate_catalog`, `quote_calculation_profiles`) are
  **per-organization**.

## Out of scope (this spec)

- Billing/subscription plans.
- Self-service signup.
- Support "impersonate a tenant" tooling beyond the super-admin's blanket RLS
  bypass.
- UI for switching between organizations (not needed — each user belongs to
  exactly one organization).
- Migrating/backfilling current data into a "Bizon" tenant.

## Architecture

Row-level multi-tenancy on the existing single Postgres/Supabase project: add an
`organizations` table and an `organization_id` column to every tenant-scoped
table, then extend existing RLS policies to filter by the caller's organization.
This reuses all existing role logic (`current_role`, `can_read_module`,
`can_write_module`) unchanged — it only adds an *additional* filter dimension.

Rejected alternatives: schema-per-tenant and project-per-tenant were both
rejected as operationally heavy for no isolation benefit at PyME scale (see
conversation — the design doc doesn't repeat that discussion).

## Data model

New table:

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
```

`organization_id uuid references organizations(id)` is added to every
tenant-scoped table:

`companies`, `opportunities`, `quotes`, `quote_line_items`, `work_orders`,
`invoices`, `purchase_orders`, `inventory_items`, `employees`, `tasks`,
`document_files`, `document_counters`, `audit_log`, `captured_leads`,
`lead_interactions`, `lead_tasks`, `quote_calculation_profiles`,
`labor_rate_catalog`.

**Excluded** (stays global, no `organization_id`): `material_price_catalog`.

`profiles` gains:

- `organization_id uuid references organizations(id)` — null only for
  super-admins.
- `is_super_admin boolean not null default false`

`document_counters`: the counter key is scoped by `organization_id` so each
organization's quote/work-order/purchase-order/invoice numbering starts at 1
independently.

## Access control (RLS)

New helper functions, alongside the existing `current_role()`:

```sql
create or replace function public.current_organization_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(is_super_admin, false) from public.profiles where id = auth.uid();
$$;
```

Every existing RLS policy on a tenant-scoped table is rewritten to add an
organization filter on top of the existing role filter:

```sql
using (
  public.is_super_admin()
  or (organization_id = public.current_organization_id() and public.can_read_module('quotes'))
)
```

(same pattern for write policies using `can_write_module`).

`material_price_catalog` policies are unchanged — no organization filter, stays
readable by all authenticated users as today.

## Provisioning flow

A new serverless function `create-organization` (alongside the existing
`admin-create-user`), callable only by a super-admin:

- Input: organization name + first admin user's details (email, full name).
- Creates the `organizations` row, creates the `auth.users` entry, creates the
  matching `profiles` row with `role='admin'`, `organization_id` = the new
  organization, `status='active'`.

The first super-admin is created once, directly via SQL (same pattern as the
existing `supabase_setup_admin_promotion_sql` note in SUPABASE_SETUP.md) — no UI
needed for that one-time bootstrap.

## Storage

The `erp-documents` Storage bucket paths gain an `organization_id` prefix
(`{organization_id}/quotes/...`, etc.), and the bucket's Storage policies are
updated to match: readable/writable only by users of that organization, or a
super-admin. Prevents cross-tenant access to files via guessed/leaked URLs.

## Frontend changes

Minimal, by design:

- New **"Organizaciones"** screen, visible only when `profile.is_super_admin` is
  true: lists existing organizations, has a form to create a new one (name +
  first admin's email/name) that calls `create-organization`.
- No other screen changes. Every other user belongs to exactly one organization,
  so RLS transparently scopes all existing queries — no organization switcher,
  no per-screen filtering logic needed in the frontend.

## Testing

Because this is a data-isolation/security feature, a runnable verification is
required (not optional): a SQL test script (e.g.
`supabase/tests/multitenant_isolation.sql`) that:

1. Creates 2 test organizations, 1 admin user in each, and one record (e.g. a
   `companies` row) per organization.
2. Asserts the org-A user, authenticated, cannot read or write the org-B record
   (and vice versa).
3. Asserts the super-admin can read both.

This is the minimum check that would catch a broken/missing `organization_id`
filter in any policy.

## Open questions for implementation planning

None — all scope questions were resolved during brainstorming. The
implementation plan should sequence: (1) schema + RLS migration, (2) provisioning
function, (3) storage policy update, (4) frontend Organizaciones screen, (5)
isolation test script.
