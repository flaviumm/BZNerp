alter table companies
add column if not exists contacts jsonb not null default '[]'::jsonb;

update companies
set contacts = jsonb_build_array(jsonb_build_object(
  'name', contact,
  'role', 'Principal',
  'phone', phone,
  'email', ''
))
where contacts = '[]'::jsonb;
