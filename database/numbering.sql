create table if not exists document_counters (
  code text primary key,
  prefix text not null,
  next_value integer not null default 1 check (next_value > 0),
  padding integer not null default 4 check (padding between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into document_counters (code, prefix, next_value, padding) values
('quote', 'P', 4, 4),
('work_order', 'OT', 5, 4),
('purchase_order', 'OC', 44, 4),
('invoice', 'F', 87, 5)
on conflict (code) do nothing;

create or replace function public.next_document_number(counter_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_counter document_counters%rowtype;
  generated_number text;
begin
  select *
  into current_counter
  from document_counters
  where code = counter_code
  for update;

  if not found then
    raise exception 'Unknown counter code: %', counter_code;
  end if;

  generated_number := current_counter.prefix || '-' || lpad(current_counter.next_value::text, current_counter.padding, '0');

  update document_counters
  set next_value = next_value + 1,
      updated_at = now()
  where code = counter_code;

  return generated_number;
end;
$$;

alter table document_counters enable row level security;

drop policy if exists "document_counters_read_admin" on document_counters;
create policy "document_counters_read_admin"
on document_counters
for select
using (public.current_role() in ('admin', 'direccion'));
