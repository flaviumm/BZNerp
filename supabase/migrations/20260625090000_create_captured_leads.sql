-- Migration: Create tables for Captador de Leads
create table if not exists public.captured_leads (
  id bigserial primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  source text,
  image_url text,
  raw_text text,
  extracted_data jsonb,
  company_name text,
  project_name text,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram text,
  linkedin text,
  address text,
  city text,
  province text,
  latitude numeric,
  longitude numeric,
  business_type text,
  project_type text,
  services_match text[],
  opportunity_level text,
  urgency text,
  status text,
  next_action text,
  next_follow_up_date timestamptz,
  notes text,
  confidence_score numeric,
  crm_client_id bigint,
  crm_opportunity_id bigint
);

create index if not exists idx_captured_leads_company on public.captured_leads (company_name);
create index if not exists idx_captured_leads_email on public.captured_leads (email);
create index if not exists idx_captured_leads_phone on public.captured_leads (phone);
create index if not exists idx_captured_leads_status on public.captured_leads (status);
create index if not exists idx_captured_leads_created_at on public.captured_leads (created_at);

create table if not exists public.lead_interactions (
  id bigserial primary key,
  lead_id bigint references public.captured_leads(id) on delete cascade,
  created_at timestamptz default now() not null,
  channel text,
  action_type text,
  message_subject text,
  message_body text,
  response_summary text,
  result text,
  next_action text,
  user_notes text
);

create index if not exists idx_lead_interactions_lead on public.lead_interactions (lead_id);

create table if not exists public.lead_tasks (
  id bigserial primary key,
  lead_id bigint references public.captured_leads(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  status text,
  priority text,
  completed_at timestamptz
);

create index if not exists idx_lead_tasks_lead on public.lead_tasks (lead_id);

-- Trigger to update updated_at on captured_leads
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at on public.captured_leads;
create trigger trg_set_updated_at
before update on public.captured_leads
for each row execute procedure public.set_updated_at();
