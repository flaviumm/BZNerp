create table if not exists material_price_catalog (
  id text primary key,
  source text not null,
  category text not null,
  name text not null,
  spec text not null default '',
  unit text not null default 'u',
  length_m numeric(12,2),
  list_price numeric(14,2),
  transfer_price numeric(14,2),
  base_price numeric(14,2) not null default 0,
  price_per_meter numeric(14,2),
  provider text not null default 'Sin proveedor',
  price_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists labor_rate_catalog (
  id text primary key,
  trade text not null,
  agreement text not null default '',
  category text not null default '',
  base_hour numeric(14,2) not null default 0,
  monthly_bonus numeric(14,2) not null default 0,
  monthly_hours numeric(8,2) not null default 176,
  load_factor numeric(8,4) not null default 0,
  quote_hour numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists quote_calculation_profiles (
  id text primary key,
  name text not null,
  iva numeric(8,4) not null default 0.21,
  iibb numeric(8,4) not null default 0.035,
  target_profit numeric(8,4) not null default 0.25,
  admin_overhead numeric(8,4) not null default 0.10,
  technical_contingency numeric(8,4) not null default 0.05,
  energy_per_kwh numeric(14,2) not null default 150,
  travel_per_km numeric(14,2) not null default 700,
  round_to numeric(14,2) not null default 1000,
  validity_days integer not null default 7,
  created_at timestamptz not null default now()
);

alter table material_price_catalog enable row level security;
alter table labor_rate_catalog enable row level security;
alter table quote_calculation_profiles enable row level security;

drop policy if exists "material_price_catalog_read_by_role" on material_price_catalog;
drop policy if exists "material_price_catalog_write_admin" on material_price_catalog;
drop policy if exists "labor_rate_catalog_read_by_role" on labor_rate_catalog;
drop policy if exists "labor_rate_catalog_write_admin" on labor_rate_catalog;
drop policy if exists "quote_calculation_profiles_read_by_role" on quote_calculation_profiles;
drop policy if exists "quote_calculation_profiles_write_admin" on quote_calculation_profiles;

create policy "material_price_catalog_read_by_role" on material_price_catalog
for select using (auth.uid() is not null);
create policy "material_price_catalog_write_admin" on material_price_catalog
for all using (public.current_role() in ('admin', 'direccion', 'compras')) with check (public.current_role() in ('admin', 'direccion', 'compras'));

create policy "labor_rate_catalog_read_by_role" on labor_rate_catalog
for select using (auth.uid() is not null);
create policy "labor_rate_catalog_write_admin" on labor_rate_catalog
for all using (public.current_role() in ('admin', 'direccion', 'rrhh')) with check (public.current_role() in ('admin', 'direccion', 'rrhh'));

create policy "quote_calculation_profiles_read_by_role" on quote_calculation_profiles
for select using (auth.uid() is not null);
create policy "quote_calculation_profiles_write_admin" on quote_calculation_profiles
for all using (public.current_role() in ('admin', 'direccion')) with check (public.current_role() in ('admin', 'direccion'));

insert into quote_calculation_profiles (id, name, iva, iibb, target_profit, admin_overhead, technical_contingency, energy_per_kwh, travel_per_km, round_to, validity_days)
values ('bizon-metalurgico-2026-03', 'Bizon metalurgico marzo 2026', 0.21, 0.035, 0.25, 0.10, 0.05, 150, 700, 1000, 7)
on conflict (id) do update set
  name = excluded.name,
  iva = excluded.iva,
  iibb = excluded.iibb,
  target_profit = excluded.target_profit,
  admin_overhead = excluded.admin_overhead,
  technical_contingency = excluded.technical_contingency,
  energy_per_kwh = excluded.energy_per_kwh,
  travel_per_km = excluded.travel_per_km,
  round_to = excluded.round_to,
  validity_days = excluded.validity_days;

insert into labor_rate_catalog (id, trade, agreement, category, base_hour, monthly_bonus, monthly_hours, load_factor, quote_hour)
values
('soldador', 'Soldador', 'UOM CCT 260/75', 'Oficial Multiple / Oficial Superior CNC', 6112.95, 35000, 176, 0.65, 10414.49),
('soldador-especializado', 'Soldador especializado', 'UOM CCT 260/75', 'Oficial Multiple Superior CNC', 6541.35, 35000, 176, 0.65, 11121.35),
('electricista-taller', 'Electricista taller', 'UOM CCT 260/75', 'Oficial', 5675.08, 35000, 176, 0.65, 9692.01),
('electricista-obra', 'Electricista obra', 'UOCRA CCT 76/75', 'Oficial - Lineas e Instalacion', 5113, 134100, 176, 0.65, 9693.64),
('electricista-obra-especializado', 'Electricista obra especializado', 'UOCRA CCT 76/75', 'Oficial Especializado - Lineas e Instalacion', 6279, 147000, 176, 0.65, 11738.48),
('ayudante', 'Ayudante', 'UOM CCT 260/75', 'Medio Oficial', 4796.27, 35000, 176, 0.65, 8241.97)
on conflict (id) do update set quote_hour = excluded.quote_hour, base_hour = excluded.base_hour, monthly_bonus = excluded.monthly_bonus, load_factor = excluded.load_factor;

insert into material_price_catalog (id, source, category, name, spec, unit, length_m, list_price, transfer_price, base_price, price_per_meter, provider, price_date)
values
('nqn-hierro-torsionado-12m', 'Bizon Excel NQN', 'Hierros', 'Hierro torsionado x 12 metros', 'Medidas diam. 6 a diam. 32; precio desde variante minima', 'barra', 12, 6296.13, 5666.52, 5666.52, 472.21, 'Carlos Isla', '2026-04-28'),
('nqn-hierro-liso-12m', 'Bizon Excel NQN', 'Hierros', 'Hierro liso x 12 metros', 'Medidas diam. 6 a diam. 32; precio desde variante minima', 'barra', 12, 6644.23, 5979.81, 5979.81, 498.32, 'Carlos Isla', '2026-04-28'),
('nqn-cano-rectangular-6m', 'Bizon Excel NQN', 'Canos estructurales', 'Cano estructural rectangular x 6 metros', 'Medidas 10x20 a 150x50 mm; esp. 1,25 a 6,35 mm', 'barra', 6, 16676.51, 15008.86, 15008.86, 2501.48, 'Carlos Isla', '2026-04-28'),
('nqn-cano-cuadrado-6m', 'Bizon Excel NQN', 'Canos estructurales', 'Cano estructural cuadrado x 6 metros', 'Medidas 10x10 a 140x140 mm; esp. 0,90 a 6,35 mm', 'barra', 6, 10870.83, 9783.75, 9783.75, 1630.63, 'Carlos Isla', '2026-04-28'),
('nqn-cano-redondo-6m', 'Bizon Excel NQN', 'Canos estructurales', 'Cano estructural redondo x 6 metros', 'Diametros 12,70 a 127,00 mm; esp. 1,25 a 6,35 mm', 'barra', 6, 10989.32, 9890.39, 9890.39, 1648.40, 'Carlos Isla', '2026-04-28'),
('nqn-angulos-6m', 'Bizon Excel NQN', 'Perfiles herrero', 'Angulos', 'Medidas 1/2x1/8 a 4x5/16', 'barra', 6, 16748.92, 15074.03, 15074.03, 2512.34, 'Carlos Isla', '2026-04-28'),
('nqn-planchuela-6m', 'Bizon Excel NQN', 'Perfiles herrero', 'Planchuela', 'Variantes multiples de ancho/espesor', 'barra', 6, 8279.30, 7451.37, 7451.37, 1241.90, 'Carlos Isla', '2026-04-28'),
('nqn-electrodo-conarco-325', 'Bizon Excel NQN', 'Consumibles soldadura', 'Electrodo CONARCO-13 3,25 mm', 'Bolsa/caja x 1 kg', 'kg', null, 17821.13, 16039.02, 16039.02, null, 'Carlos Isla', '2026-04-28'),
('ayc-acero-kg-prom', 'AyC web', 'Aceros referencia', 'ACEROS kg/prom', 'Referencia historica A&C octubre 2022', 'kg', null, 290.50, null, 351.50, null, 'AyC', '2022-10-01'),
('ayc-perfil-c-80', 'AyC web', 'Aceros referencia', 'Perfil C 80 40 15 1,6 x 12', 'Referencia historica A&C octubre 2022', 'un', 12, 7427.05, null, 8986.73, 748.89, 'AyC', '2022-10-01')
on conflict (id) do update set base_price = excluded.base_price, price_date = excluded.price_date, provider = excluded.provider;
