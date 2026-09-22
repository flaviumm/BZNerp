import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://erp-snowy-one.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Missing Supabase function configuration.");

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.replace("Bearer ", "");
    if (!token) return json({ error: "No autorizado." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await userClient.auth.getUser(token);
    if (callerError || !callerData.user) return json({ error: "Sesion invalida." }, 401);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", callerData.user.id)
      .single();

    if (profileError || !callerProfile?.organization_id) {
      return json({ error: "Usuario sin organizacion asignada." }, 403);
    }
    const organizationId = callerProfile.organization_id;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");
    const parts = path.split("/").filter(Boolean);

    // route under /api/captured-leads...
    // support: POST /api/captured-leads, GET /api/captured-leads, GET /api/captured-leads/:id, PATCH, DELETE

    if (request.method === "POST" && parts.slice(-1)[0] === "captured-leads") {
      const body = await request.json();
      // expected: { source, image_url, raw_text, extracted_data }
      const insert = {
        organization_id: organizationId,
        source: body.source || 'web',
        image_url: body.image_url || null,
        raw_text: body.raw_text || null,
        extracted_data: body.extracted_data || null,
        company_name: body.company_name || null,
        project_name: body.project_name || null,
        contact_name: body.contact_name || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        website: body.website || null,
        address: body.address || null,
        city: body.city || null,
        province: body.province || null,
        business_type: body.business_type || null,
        project_type: body.project_type || null,
        services_match: Array.isArray(body.services_match) ? body.services_match : null,
        opportunity_level: body.opportunity_level || null,
        urgency: body.urgency || null,
        status: body.status || 'captado_desde_foto',
        next_action: body.next_action || null,
        next_follow_up_date: body.next_follow_up_date || null,
        notes: body.notes || null,
        confidence_score: body.confidence_score || null,
      };

      const { data, error } = await adminClient.from('captured_leads').insert(insert).select('*').single();
      if (error) return json({ error: error.message }, 400);
      return json({ lead: data }, 201);
    }

    if (request.method === "GET" && parts.slice(-1)[0] === "captured-leads") {
      // support CSV export via ?format=csv
      const format = url.searchParams.get('format');
      const { data, error } = await adminClient
        .from('captured_leads')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      if (format === 'csv') {
        const rows = data || [];
        const headers = ['id','created_at','company_name','project_name','contact_name','phone','whatsapp','email','website','city','province','status','opportunity_level','urgency','confidence_score'];
        const csv = [headers.join(',')].concat(rows.map((r: any) => headers.map(h => safeCsv(String(r[h] ?? ''))).join(','))).join('\n');
        return new Response(csv, { headers: { ...corsHeaders, 'Content-Type': 'text/csv' } });
      }
      return json({ leads: data });
    }

    // operations for specific id
    const idIndex = parts.indexOf('captured-leads');
    if (idIndex >= 0 && parts.length > idIndex + 1) {
      const id = parts[idIndex + 1];
      if (request.method === 'GET') {
        const { data, error } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
        if (error) return json({ error: error.message }, 404);
        return json({ lead: data });
      }

      if (request.method === 'PATCH') {
        const body = await request.json();
        const { organization_id: _ignoredOrgId, id: _ignoredId, ...safeUpdate } = body;
        const { data, error } = await adminClient.from('captured_leads').update(safeUpdate).eq('id', id).eq('organization_id', organizationId).select('*').single();
        if (error) return json({ error: error.message }, 400);
        return json({ lead: data });
      }

      if (request.method === 'DELETE') {
        const { error } = await adminClient.from('captured_leads').delete().eq('id', id).eq('organization_id', organizationId);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      // POST sub-actions: analyze-image, research, generate-email, generate-whatsapp, convert-to-client, create-opportunity, create-followup, log-interaction
      if (request.method === 'POST') {
        const action = parts[idIndex + 2] || '';
        const body = await request.json().catch(() => ({}));
        if (action === 'analyze-image') {
          // Attempt OCR using OCR.Space when available, otherwise accept raw_text from body
          const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
          let raw = body.raw_text || null;
          try {
            if (!raw) {
              // prefer image_url from lead record
              const { data: leadRec } = await adminClient.from('captured_leads').select('image_url').eq('id', id).eq('organization_id', organizationId).single();
              const imageUrl = leadRec?.image_url || body.image_url || null;
              if (imageUrl && ocrApiKey) {
                raw = await performOcrWithOcrSpace(imageUrl, ocrApiKey);
              }
            }
          } catch (e) {
            console.error('OCR error', e?.message || e);
          }

          // heuristic extraction from raw text
          const extracted = body.extracted_data || (raw ? parseExtractedData(String(raw)) : null);

          const { data, error } = await adminClient
            .from('captured_leads')
            .update({ raw_text: raw, extracted_data: extracted, company_name: extracted?.company_name || null, contact_name: extracted?.contact_name || null, phone: extracted?.phone || null, email: extracted?.email || null, website: extracted?.website || null, status: 'analizado' })
            .eq('id', id)
            .eq('organization_id', organizationId)
            .select('*')
            .single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'research') {
          // stub: mark pending investigation and attach research results
          const research = body.research || { notes: 'Pendiente: implementar agente OpenClaw/LLM' };
          const { data, error } = await adminClient.from('captured_leads').update({ extracted_data: research, status: 'investigado' }).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'generate-email') {
          // simple template generator
          const { data: lead } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
          if (!lead) return json({ error: 'Lead no encontrado' }, 404);
          const subject = `Contacto desde cartel - ${lead.company_name || lead.project_name || 'Nuevo Lead'}`;
          const bodyText = `Hola ${lead.contact_name || ''},\n\nMe contacto desde Bizon respecto a ${lead.project_name || lead.company_name || 'su proyecto'}. Nos dedicamos a: ${Array.isArray(lead.services_match) ? lead.services_match.join(', ') : 'servicios industriales'}.\n\nQuedo a disposición para coordinar una visita o llamada.\n\nSaludos.`;
          return json({ subject, body: bodyText });
        }

        if (action === 'generate-whatsapp') {
          const { data: lead } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
          if (!lead) return json({ error: 'Lead no encontrado' }, 404);
          const message = `Hola ${lead.contact_name || ''}, soy de Bizon. Vi su cartel en ${lead.project_name || lead.company_name || 'obra'} y quería coordinar una breve llamada. ¿Le viene bien mañana?`;
          return json({ message });
        }

        if (action === 'convert-to-client') {
          // stub: set crm_client_id after creating a client in CRM (not implemented)
          const fakeClientId = body.client_id || null;
          const updates: any = { status: 'ganado' };
          if (fakeClientId) updates.crm_client_id = fakeClientId;
          const { data, error } = await adminClient.from('captured_leads').update(updates).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'create-opportunity') {
          const fakeOppId = body.opportunity_id || null;
          const updates: any = { status: 'presupuesto_enviado' };
          if (fakeOppId) updates.crm_opportunity_id = fakeOppId;
          const { data, error } = await adminClient.from('captured_leads').update(updates).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'create-followup') {
          const { data: ownedLead, error: ownedLeadError } = await adminClient
            .from('captured_leads')
            .select('id')
            .eq('id', id)
            .eq('organization_id', organizationId)
            .single();
          if (ownedLeadError || !ownedLead) return json({ error: 'Lead no encontrado' }, 404);

          // create a lead_tasks entry
          const task = {
            organization_id: organizationId,
            lead_id: id,
            title: body.title || 'Seguimiento',
            description: body.description || null,
            due_date: body.due_date || null,
            status: body.status || 'pending',
            priority: body.priority || 'normal',
          };
          const { data, error } = await adminClient.from('lead_tasks').insert(task).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ task: data }, 201);
        }

        if (action === 'log-interaction') {
          const { data: ownedLead, error: ownedLeadError } = await adminClient
            .from('captured_leads')
            .select('id')
            .eq('id', id)
            .eq('organization_id', organizationId)
            .single();
          if (ownedLeadError || !ownedLead) return json({ error: 'Lead no encontrado' }, 404);

          const interaction = {
            organization_id: organizationId,
            lead_id: id,
            channel: body.channel || null,
            action_type: body.action_type || null,
            message_subject: body.message_subject || null,
            message_body: body.message_body || null,
            response_summary: body.response_summary || null,
            result: body.result || null,
            next_action: body.next_action || null,
            user_notes: body.user_notes || null,
          };
          const { data, error } = await adminClient.from('lead_interactions').insert(interaction).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ interaction: data }, 201);
        }

        if (action === 'find-duplicates') {
          const { data: lead, error: leadError } = await adminClient.from('captured_leads').select('*').eq('id', id).eq('organization_id', organizationId).single();
          if (leadError || !lead) return json({ error: leadError?.message || 'Lead no encontrado' }, 404);

          const companyName = normalizeText(body.company_name || lead.company_name || lead.project_name || '');
          const email = normalizeText(body.email || lead.email || '');
          const phone = normalizePhone(body.phone || lead.phone || lead.whatsapp || '');
          const contact = normalizeText(body.contact_name || lead.contact_name || '');

          const leadFilters = [];
          if (email) leadFilters.push(`email.eq.${email}`);
          if (phone) leadFilters.push(`phone.eq.${phone}`);
          if (contact) leadFilters.push(`contact_name.ilike.*${contact}*`);
          if (companyName) leadFilters.push(`company_name.ilike.*${companyName}*`);

          const duplicateLeads = leadFilters.length
            ? await fetchDuplicateCapturedLeads(adminClient, id, organizationId, leadFilters)
            : [];

          const companyFilters = [];
          if (companyName) companyFilters.push(`name.ilike.*${companyName}*`);
          if (phone) companyFilters.push(`phone.eq.${phone}`);
          if (email) companyFilters.push(`contacts.ilike.*${email}*`);
          if (phone) companyFilters.push(`contacts.ilike.*${phone}*`);

          const duplicateCompanies = companyFilters.length
            ? await fetchDuplicateCompanies(adminClient, organizationId, companyFilters)
            : [];

          return json({ duplicates: { leads: duplicateLeads, companies: duplicateCompanies } });
        }

        if (action === 'link-existing-client') {
          const clientId = body.client_id;
          if (!clientId) return json({ error: 'client_id es requerido.' }, 400);
          const { data, error } = await adminClient.from('captured_leads').update({ crm_client_id: clientId, status: 'contacto_preparado', notes: `Vinculado con cliente existente ${clientId}` }).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }

        if (action === 'link-existing-lead') {
          const duplicateLeadId = body.duplicate_lead_id;
          if (!duplicateLeadId) return json({ error: 'duplicate_lead_id es requerido.' }, 400);
          const { data, error } = await adminClient.from('captured_leads').update({ status: 'descartado', notes: `Duplicado de lead ${duplicateLeadId}` }).eq('id', id).eq('organization_id', organizationId).select('*').single();
          if (error) return json({ error: error.message }, 400);
          return json({ lead: data });
        }
      }
    }

    return json({ error: 'Ruta no encontrada' }, 404);
  } catch (error) {
    return json({ error: error.message || 'Error interno' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeCsv(value: string) {
  if (value == null) return '';
  const escaped = String(value).replace(/"/g, '""');
  if (escaped.search(/,|"|\n/) >= 0) return '"' + escaped + '"';
  return escaped;
}

async function performOcrWithOcrSpace(imageUrl, apiKey) {
  const form = new FormData();
  form.append('apikey', apiKey);
  form.append('url', imageUrl);
  form.append('language', 'spa');
  form.append('isOverlayRequired', 'false');

  const resp = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
  const json = await resp.json();
  if (!json || !json.ParsedResults || !json.ParsedResults.length) return null;
  return json.ParsedResults.map((r) => r.ParsedText).join('\n');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '');
}

async function fetchDuplicateCapturedLeads(adminClient, currentId, organizationId, filters) {
  const query = adminClient.from('captured_leads').select('*').eq('organization_id', organizationId).neq('id', currentId);
  filters.forEach((filter) => query.or(filter));
  const { data, error } = await query.limit(10);
  if (error) return [];
  return data;
}

async function fetchDuplicateCompanies(adminClient, organizationId, filters) {
  const query = adminClient.from('companies').select('*').eq('organization_id', organizationId);
  filters.forEach((filter) => query.or(filter));
  const { data, error } = await query.limit(10);
  if (error) return [];
  return data;
}

function parseExtractedData(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const extracted = {};
  // email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) extracted.email = emailMatch[0];
  // phone (simple)
  const phoneMatch = text.match(/(\+?\d[\d \-().]{6,}\d)/);
  if (phoneMatch) extracted.phone = phoneMatch[0].replace(/\s+/g, '');
  // website
  const webMatch = text.match(/(https?:\/\/)?([\w.-]+\.[A-Za-z]{2,})(\/\S*)?/);
  if (webMatch) extracted.website = webMatch[0];
  // company: heuristics: first non-generic line with words
  return extracted;
}
