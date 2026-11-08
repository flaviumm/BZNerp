-- Datos fiscales/moneda de la organizacion (autoservicio del admin) y
-- modulos habilitados por organizacion (solo super-admin, es plan/contrato).
--
-- Por que separado en dos bloques dentro de la misma migracion: las columnas
-- fiscales son datos de la propia empresa (su CUIT, condicion de IVA, moneda
-- de trabajo) -- igual de legitimo que el nombre/color/logo que ya edita el
-- admin de organizacion en Configuracion.jsx, cubierto por la policy
-- "organizations_update_own_admin" existente sin cambios.
--
-- enabled_modules es distinto: define que pantallas incluye el plan/contrato
-- que Bizon le vendio a esa empresa cliente. Si el admin de esa empresa
-- pudiera escribirlo el mismo con su propia sesion, se auto-habilitaria
-- modulos que no pago -- mismo patron de riesgo que is_super_admin/
-- organization_id en profiles (ver guard_profile_privileges en
-- 20260801120000_multiempresa.sql). Se bloquea con un trigger equivalente.

alter table public.organizations
  add column if not exists currency text not null default 'ARS',
  add column if not exists tax_id text,
  add column if not exists fiscal_condition text,
  add column if not exists enabled_modules text[];

alter table public.organizations drop constraint if exists organizations_currency_valid;
alter table public.organizations
  add constraint organizations_currency_valid check (currency in ('ARS', 'USD'));

create or replace function public.guard_organization_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = service_role (create-organization, scripts) -- siempre
  -- permitido. Solo se bloquea una sesion de usuario real (no super-admin)
  -- que intente cambiar que modulos tiene habilitada su propia organizacion.
  if auth.uid() is not null
     and not public.is_super_admin()
     and new.enabled_modules is distinct from old.enabled_modules then
    raise exception 'No autorizado a modificar los modulos habilitados de la organizacion';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_organization_privileges on public.organizations;
create trigger guard_organization_privileges
before update on public.organizations
for each row execute function public.guard_organization_privileges();
