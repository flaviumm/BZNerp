-- Auditoria automatica (trigger) de cotizaciones y tablas de precios.
--
-- Por que: `logAuditEvent` (src/lib/erpRepository.js) existe desde hace meses
-- pero no tiene ningun call-site en el frontend (grep confirma 0 usos reales
-- fuera de la definicion). Hoy `audit_log` esta vacia para quotes/pricing:
-- la auditoria depende de que alguien se acuerde de llamarla a mano en cada
-- pantalla nueva, lo que para catalogos de precios y cotizaciones (plata de
-- por medio) no es aceptable. Este trigger corre en la base, sin depender del
-- cliente: nadie puede tocar precio/cotizacion sin dejar rastro, ni aunque
-- escriba directo por SQL/API saltandose el frontend.
--
-- Que cubre: quotes, material_price_catalog, labor_rate_catalog,
-- quote_calculation_profiles. La funcion es generica (usa to_jsonb(NEW/OLD),
-- no columnas fijas) para poder enganchar otras tablas despues sin reescribirla.

create or replace function public.log_table_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record jsonb;
  v_old jsonb;
  v_record_key text;
  v_actor_id uuid;
  v_actor_name text;
  v_org_id uuid;
  v_action text;
  v_summary text;
  v_metadata jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_col text;
begin
  v_record := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  v_old := case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end;

  -- quotes usa `number` como PK (texto, ej. "P-0001"); el resto usa `id`.
  v_record_key := coalesce(v_record->>'number', v_record->>'id', '-');

  v_actor_id := auth.uid();
  v_org_id := nullif(v_record->>'organization_id', '')::uuid;

  if v_actor_id is not null then
    select full_name into v_actor_name from public.profiles where id = v_actor_id;
    v_actor_name := coalesce(v_actor_name, 'Usuario desconocido');
    if v_org_id is null then
      v_org_id := public.current_organization_id();
    end if;
  else
    -- auth.uid() nulo = llamada con service_role (scripts de backup, seed,
    -- edge functions). No es un usuario real, no hay sesion que auditar como
    -- "sospechosa", pero se deja constancia de que fue el sistema.
    v_actor_name := 'Sistema';
  end if;

  v_action := case TG_OP
    when 'INSERT' then 'create'
    when 'UPDATE' then 'update'
    when 'DELETE' then 'delete'
    else 'update'
  end;

  if TG_OP = 'UPDATE' then
    -- Diff campo a campo. Ignora created_at/updated_at: cambian en cada
    -- touch y no aportan nada a una auditoria de "que precio/total cambio".
    for v_col in select jsonb_object_keys(v_record)
    loop
      if v_col not in ('created_at', 'updated_at')
         and v_record -> v_col is distinct from v_old -> v_col then
        v_changes := v_changes || jsonb_build_object(
          v_col,
          jsonb_build_object('antes', v_old -> v_col, 'despues', v_record -> v_col)
        );
      end if;
    end loop;

    if v_changes = '{}'::jsonb then
      -- Un UPDATE que no cambio ningun campo relevante (p.ej. solo bump de
      -- updated_at) no genera ruido en el log.
      return NEW;
    end if;
  end if;

  v_metadata := case TG_OP
    when 'DELETE' then v_record
    when 'UPDATE' then v_changes
    else v_record
  end;

  v_summary := format('%s en %s (%s)', v_action, TG_TABLE_NAME, v_record_key);

  insert into public.audit_log (action, module, record_key, summary, actor_id, actor_name, organization_id, metadata)
  values (v_action, TG_TABLE_NAME::text, v_record_key, v_summary, v_actor_id, v_actor_name, v_org_id, v_metadata);

  return case TG_OP when 'DELETE' then OLD else NEW end;
end;
$$;

-- Solo admin/direccion pueden crear/alterar triggers en produccion via
-- migraciones versionadas; esta funcion no se expone via RPC a los clientes.
revoke all on function public.log_table_audit() from anon, authenticated;

drop trigger if exists audit_quotes on public.quotes;
create trigger audit_quotes
after insert or update or delete on public.quotes
for each row execute function public.log_table_audit();

drop trigger if exists audit_material_price_catalog on public.material_price_catalog;
create trigger audit_material_price_catalog
after insert or update or delete on public.material_price_catalog
for each row execute function public.log_table_audit();

drop trigger if exists audit_labor_rate_catalog on public.labor_rate_catalog;
create trigger audit_labor_rate_catalog
after insert or update or delete on public.labor_rate_catalog
for each row execute function public.log_table_audit();

drop trigger if exists audit_quote_calculation_profiles on public.quote_calculation_profiles;
create trigger audit_quote_calculation_profiles
after insert or update or delete on public.quote_calculation_profiles
for each row execute function public.log_table_audit();
