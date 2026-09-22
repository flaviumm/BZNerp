-- Cotizador wizard: desglose de precio (gastos admin, contingencia, IVA, titulo del trabajo)
-- que el PDF necesita para cuadrar subtotal + recargos + IVA = total.
alter table public.quotes
  add column if not exists pricing jsonb not null default '{}'::jsonb;
