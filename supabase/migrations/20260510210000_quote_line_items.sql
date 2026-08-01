alter table public.quotes
add column if not exists line_items jsonb not null default '[]'::jsonb,
add column if not exists client_details jsonb not null default '{}'::jsonb;
