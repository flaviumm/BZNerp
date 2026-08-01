import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function CaptadorLeads() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [lead, setLead] = useState(null);
  const [duplicates, setDuplicates] = useState({ leads: [], companies: [] });
  const [resolving, setResolving] = useState(false);

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) return setMessage('Seleccione una imagen.');
    setLoading(true);
    setMessage(null);
    setLead(null);
    setDuplicates({ leads: [], companies: [] });

    try {
      let imageUrl = null;
      if (supabase) {
        const filePath = `captured_leads/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('captured-leads').upload(filePath, file, { upsert: false });
        if (!upErr) {
          const { data } = supabase.storage.from('captured-leads').getPublicUrl(filePath);
          imageUrl = data.publicUrl;
        }
      }

      const payload = { source: 'ui', image_url: imageUrl };
      const res = await fetch('/api/captured-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error creando lead');

      const createdLead = json.lead;
      setLead(createdLead);
      setMessage('Lead creado. Analizando imagen y buscando duplicados...');

      try {
        await analyzeLead(createdLead.id);
      } catch (analyzeError) {
        console.warn('Error en análisis OCR:', analyzeError);
      }

      await searchDuplicates(createdLead.id);
      setMessage('Lead creado. Revisa duplicados y vincula si corresponde.');
      setFile(null);
      setPreview(null);
    } catch (err) {
      setMessage(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function analyzeLead(leadId) {
    const res = await fetch(`/api/captured-leads/${leadId}/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Error analizando imagen');
    setLead(json.lead);
    return json.lead;
  }

  async function searchDuplicates(leadId) {
    const res = await fetch(`/api/captured-leads/${leadId}/find-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Error buscando duplicados');
    setDuplicates(json.duplicates || { leads: [], companies: [] });
    return json.duplicates;
  }

  async function linkExistingClient(clientId) {
    if (!lead) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/captured-leads/${lead.id}/link-existing-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error vinculando cliente');
      setLead(json.lead);
      setMessage('Lead vinculado a cliente existente.');
    } catch (err) {
      setMessage(err.message || String(err));
    } finally {
      setResolving(false);
    }
  }

  async function linkDuplicateLead(duplicateLeadId) {
    if (!lead) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/captured-leads/${lead.id}/link-existing-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicate_lead_id: duplicateLeadId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error marcando duplicado');
      setLead(json.lead);
      setMessage('Lead marcado como duplicado de un lead existente.');
    } catch (err) {
      setMessage(err.message || String(err));
    } finally {
      setResolving(false);
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <h2>Captador de Leads</h2>
      <p>Subí una foto de un cartel para extraer datos y crear un lead.</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input type="file" accept="image/*" onChange={handleFile} />
        <button onClick={submit} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Enviando...' : 'Crear lead'}</button>
      </div>
      {preview && <div style={{ marginTop: 12 }}><img src={preview} alt="preview" style={{ maxWidth: 320, borderRadius: 8 }} /></div>}
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      {lead && (
        <div style={{ marginTop: 18, padding: 14, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Lead creado</h3>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>ID: {lead.id} · Estado: {lead.status}</p>
          <div style={{ marginTop: 10, display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
            <div><strong>Empresa:</strong> {lead.company_name || lead.project_name || '-'}</div>
            <div><strong>Contacto:</strong> {lead.contact_name || '-'}</div>
            <div><strong>Email:</strong> {lead.email || '-'}</div>
            <div><strong>Teléfono:</strong> {lead.phone || lead.whatsapp || '-'}</div>
          </div>
        </div>
      )}
      {lead && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Duplicados detectados</h3>
          <p style={{ margin: '6px 0 12px', color: '#64748b' }}>Revisa clientes y leads similares antes de continuar.</p>

          {duplicates.companies.length === 0 && duplicates.leads.length === 0 && (
            <p style={{ margin: 0, color: '#475569' }}>No se encontraron duplicados por ahora.</p>
          )}

          {duplicates.companies.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Clientes existentes</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                {duplicates.companies.map((company) => (
                  <div key={company.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: 'white' }}>
                    <div style={{ fontWeight: 700 }}>{company.name}</div>
                    <div style={{ fontSize: 13, color: '#475569' }}>{company.city || 'Sin ciudad'} · {company.type || 'Sin tipo'}</div>
                    <div style={{ marginTop: 8, fontSize: 13 }}>{company.contact || 'Sin contacto'} · {company.phone || '-'}</div>
                    <button disabled={resolving} onClick={() => linkExistingClient(company.id)} style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #2563eb', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer' }}>Vincular este cliente</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {duplicates.leads.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Leads similares</h4>
              <div style={{ display: 'grid', gap: 12 }}>
                {duplicates.leads.map((duplicate) => (
                  <div key={duplicate.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: 'white' }}>
                    <div style={{ fontWeight: 700 }}>{duplicate.company_name || duplicate.project_name || 'Lead sin nombre'}</div>
                    <div style={{ fontSize: 13, color: '#475569' }}>{duplicate.contact_name || 'Sin contacto'} · {duplicate.email || duplicate.phone || '-'}</div>
                    <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>Estado: {duplicate.status || 'N/A'}</div>
                    <button disabled={resolving} onClick={() => linkDuplicateLead(duplicate.id)} style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #dc2626', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>Marcar como duplicado</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
