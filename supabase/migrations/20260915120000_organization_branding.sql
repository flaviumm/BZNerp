-- Branding por organizacion: color principal y logo (data-URL), editables por
-- el admin de la propia organizacion. Ver
-- docs/superpowers/specs/2026-09-12-org-branding-settings-design.md

alter table organizations
  add column if not exists primary_color text not null default '#ff7900',
  add column if not exists logo_data_url text;

drop policy if exists "organizations_update_own_admin" on organizations;
create policy "organizations_update_own_admin"
on organizations
for update
using (
  id = public.current_organization_id()
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
)
with check (id = public.current_organization_id());

alter table organizations drop constraint if exists organizations_primary_color_hex;
alter table organizations
  add constraint organizations_primary_color_hex
  check (primary_color ~ '^#[0-9a-fA-F]{6}$');

alter table organizations drop constraint if exists organizations_logo_data_url_shape;
alter table organizations
  add constraint organizations_logo_data_url_shape
  check (
    logo_data_url is null
    or (logo_data_url like 'data:image/png;base64,%' and length(logo_data_url) <= 524288)
  );
