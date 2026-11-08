-- Onboarding sin SQL a mano: al crear una organizacion, siembra un
-- quote_calculation_profiles default para que el Cotizador funcione desde el
-- primer dia (antes, create-organization dejaba la empresa nueva sin perfil
-- de calculo, y alguien de Bizon tenia que insertarlo a mano en el SQL
-- Editor de Supabase antes de que esa empresa pudiera cotizar nada).
--
-- Convencion: un solo perfil por organizacion, con id = organization_id::text
-- (no hay constraint de unicidad sobre organization_id en esta tabla porque
-- el diseño original permitia varios perfiles con nombre por fila -- para
-- organizaciones nuevas se simplifica a 1:1 por convencion de id, no de
-- constraint; si en el futuro una empresa necesita mas de un perfil de
-- calculo, se agrega un unique index real en vez de forzarlo con esto).

create or replace function public.seed_default_quote_calculation_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quote_calculation_profiles (
    id, name, organization_id, iva, iibb, target_profit, admin_overhead,
    technical_contingency, energy_per_kwh, travel_per_km, round_to, validity_days
  )
  values (
    new.id::text, new.name || ' - perfil default', new.id,
    0.21, 0.035, 0.25, 0.10, 0.05, 150, 700, 1000, 7
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_default_quote_calculation_profile on public.organizations;
create trigger seed_default_quote_calculation_profile
after insert on public.organizations
for each row execute function public.seed_default_quote_calculation_profile();
