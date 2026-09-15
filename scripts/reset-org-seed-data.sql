-- Vacia los datos de ejemplo de UNA organizacion. Reemplazar 'TU_ORG_ID'
-- (uuid de organizations.id) antes de correr en el SQL Editor de Supabase.
-- No toca profiles, auth.users, organizations, audit_log ni los catalogos
-- (labor_rate_catalog, quote_calculation_profiles). Los archivos en Storage
-- referenciados por document_files NO se borran (solo las filas).

begin;

delete from lead_tasks where organization_id = 'TU_ORG_ID';
delete from lead_interactions where organization_id = 'TU_ORG_ID';
delete from captured_leads where organization_id = 'TU_ORG_ID';
delete from document_files where organization_id = 'TU_ORG_ID';
delete from quotes where organization_id = 'TU_ORG_ID';
delete from work_orders where organization_id = 'TU_ORG_ID';
delete from purchase_orders where organization_id = 'TU_ORG_ID';
delete from invoices where organization_id = 'TU_ORG_ID';
delete from inventory_items where organization_id = 'TU_ORG_ID';
delete from opportunities where organization_id = 'TU_ORG_ID';
delete from tasks where organization_id = 'TU_ORG_ID';
delete from employees where organization_id = 'TU_ORG_ID';
delete from companies where organization_id = 'TU_ORG_ID';

commit;
