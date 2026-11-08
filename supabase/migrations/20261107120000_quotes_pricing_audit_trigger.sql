-- Auditoria automatica (trigger) de cotizaciones y tablas de precios.
--
-- Por que: el frontend ya audita (audit() en mini_erp_bizon_prototipo.jsx ->
-- logAuditEvent), pero solo lo que pasa POR la app, y sin diff de valores.
-- Cualquier escritura directa por la API REST de Supabase o por SQL (o una
-- pantalla nueva que no pase por persistRecord/persistUpdate, como
-- PreciosConfiguracion, o el GitHub Action que actualiza precios con
-- service_role) no deja rastro. Para catalogos de precios y cotizaciones
-- (plata de por medio) la auditoria tiene que vivir en la base, donde nadie
-- la puede saltear, y registrar el antes/despues de cada campo.
--
-- Para no duplicar: el frontend deja de escribir en audit_log para los
-- modulos que cubre este trigger (DB_AUDITED_MODULES en el shell de la app).
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

-- actor_id: este trigger completa actor_id = auth.uid(). El frontend
-- (audit() en mini_erp_bizon_prototipo.jsx) nunca lo completaba, por eso la
-- FK original sin ON DELETE nunca molesto. Con el trigger activo, borrar un
-- usuario que alguna vez toco una cotizacion o un precio fallaria por
-- violacion de FK. ON DELETE SET NULL: la fila de auditoria sobrevive y
-- actor_name (texto) conserva quien fue.
-- El nombre de la constraint se busca en el catalogo en vez de asumir el
-- default de Postgres: si se asumiera mal, el drop no haria nada y quedarian
-- DOS FKs (la vieja seguiria bloqueando el borrado).
do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.audit_log'::regclass
      and con.contype = 'f'
      and att.attname = 'actor_id'
  loop
    execute format('alter table public.audit_log drop constraint %I', v_name);
  end loop;
end;
$$;

alter table public.audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

-- 'import': el frontend registra la carga masiva de leads con
-- action = 'import' (importLeads en mini_erp_bizon_prototipo.jsx), pero el
-- CHECK original solo aceptaba create/update/delete/upload: esas filas
-- fallaban en silencio (el .catch del frontend solo hace console.error).
do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.audit_log'::regclass
      and con.contype = 'c'
      and att.attname = 'action'
  loop
    execute format('alter table public.audit_log drop constraint %I', v_name);
  end loop;
end;
$$;

alter table public.audit_log
  add constraint audit_log_action_check
  check (action in ('create', 'update', 'delete', 'upload', 'import'));
