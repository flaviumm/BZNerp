// Prueba de humo contra un Supabase REAL de staging (nunca produccion).
// Verifica lo que agrega el PR #2 de punta a punta:
//   1. Trigger de auditoria: una fila por cambio real en quotes (create/update/
//      delete), ninguna por un UPDATE sin cambios, actor y organizacion correctos.
//   2. audit_log acepta action = 'import' (carga masiva de leads).
//   3. Borrar un usuario con historial de auditoria funciona (FK actor_id
//      ON DELETE SET NULL) y la fila conserva actor_name.
//   4. Edge function captured-leads / find-duplicates (tiene que estar deployada):
//      - un nombre con coma ("ACME, S.A.") encuentra su duplicado,
//      - alcanza con que coincida UN criterio (OR, no AND),
//      - un payload de inyeccion de filtro PostgREST no devuelve leads ajenos.
//
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/test-staging-smoke.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Ref de produccion (supabase/config.toml, .env.production): esta prueba crea y
// borra datos, no puede correr nunca contra ese proyecto.
const PRODUCTION_REF = "bewqfxodhhanbxbqngsf";

if (!url || !anonKey || !serviceRoleKey) {
  console.error("Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (url.includes(PRODUCTION_REF)) {
  console.error("ABORTADO: SUPABASE_URL apunta al proyecto de PRODUCCION. Esta prueba es solo para staging.");
  process.exit(1);
}

const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

let failures = 0;
let cleanupFailures = 0;

function assertTrue(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function cleanupStep(label, run) {
  try {
    const result = await run();
    if (result?.error) throw result.error;
  } catch (error) {
    cleanupFailures += 1;
    console.error(`CLEANUP FAIL: ${label} (${error?.message || error})`);
  }
}

async function callCapturedLeads(accessToken, path, body) {
  const response = await fetch(`${url}/functions/v1/captured-leads${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, payload };
}

async function auditRowsFor(recordKey) {
  const { data, error } = await adminClient
    .from("audit_log")
    .select("id, action, actor_id, actor_name, organization_id, metadata")
    .eq("module", "quotes")
    .eq("record_key", recordKey)
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function main() {
  const stamp = Date.now();
  const state = { organizationId: null, userId: null, userDeleted: false };

  try {
    const { data: organization, error: organizationError } = await adminClient
      .from("organizations")
      .insert({ name: `Smoke Org ${stamp}` })
      .select("id")
      .single();
    if (organizationError) throw organizationError;
    state.organizationId = organization.id;

    const email = `smoke-${stamp}@staging.test`;
    const password = `Smoke${stamp}pass!`;
    const fullName = `Smoke Admin ${stamp}`;
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError) throw createError;
    state.userId = created.user.id;

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({ id: state.userId, full_name: fullName, role: "admin", status: "active", organization_id: state.organizationId }, { onConflict: "id" });
    if (profileError) throw profileError;

    const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    const accessToken = signIn.session.access_token;

    // --- 1. Trigger de auditoria sobre quotes -------------------------------
    const quoteNumber = `SMOKE-${stamp}`;
    const { error: quoteInsertError } = await userClient
      .from("quotes")
      .insert({ number: quoteNumber, client: "Cliente Smoke", service: "Prueba de auditoria", total: 0 });
    assertTrue(!quoteInsertError, `admin can create a quote (error: ${quoteInsertError?.message})`);

    const { error: quoteUpdateError } = await userClient.from("quotes").update({ total: 1000 }).eq("number", quoteNumber);
    assertTrue(!quoteUpdateError, `admin can update the quote total (error: ${quoteUpdateError?.message})`);

    // UPDATE sin cambios reales: el trigger no tiene que generar fila.
    const { error: noopUpdateError } = await userClient.from("quotes").update({ total: 1000 }).eq("number", quoteNumber);
    assertTrue(!noopUpdateError, `no-op update runs (error: ${noopUpdateError?.message})`);

    const { error: quoteDeleteError } = await userClient.from("quotes").delete().eq("number", quoteNumber);
    assertTrue(!quoteDeleteError, `admin can delete the quote (error: ${quoteDeleteError?.message})`);

    const rows = await auditRowsFor(quoteNumber);
    assertTrue(
      rows.map((row) => row.action).join(",") === "create,update,delete",
      `exactly one audit row per real change: create,update,delete (got: ${rows.map((row) => row.action).join(",") || "none"})`
    );
    assertTrue(rows.every((row) => row.actor_id === state.userId), "audit rows carry the acting user's id");
    assertTrue(rows.every((row) => row.actor_name === fullName), "audit rows carry the acting user's name");
    assertTrue(rows.every((row) => row.organization_id === state.organizationId), "audit rows are stamped with the quote's organization");
    const updateRow = rows.find((row) => row.action === "update");
    assertTrue(
      Number(updateRow?.metadata?.total?.antes) === 0 && Number(updateRow?.metadata?.total?.despues) === 1000,
      "update audit row stores the before/after diff of the changed column (total 0 -> 1000)"
    );

    // --- 2. audit_log acepta 'import' ----------------------------------------
    const { error: importAuditError } = await userClient
      .from("audit_log")
      .insert({ action: "import", module: "opportunities", record_key: `smoke-import-${stamp}`, summary: "Carga masiva de prueba", actor_name: fullName });
    assertTrue(!importAuditError, `audit_log accepts action 'import' from a user session (error: ${importAuditError?.message})`);

    // --- 4. find-duplicates (antes de borrar al usuario: necesita su sesion) --
    const lead1 = await callCapturedLeads(accessToken, "", { company_name: "ACME, S.A.", email: "ventas@acme-smoke.test", source: "smoke" });
    const lead2 = await callCapturedLeads(accessToken, "", { company_name: "ACME, S.A.", source: "smoke" });
    const lead3 = await callCapturedLeads(accessToken, "", { company_name: "Otra Empresa SRL", email: "ventas@acme-smoke.test", source: "smoke" });
    const lead4 = await callCapturedLeads(accessToken, "", { company_name: "x),id.not.is.null,company_name.ilike.*", source: "smoke" });
    const leadIds = [lead1, lead2, lead3, lead4].map((result) => result.payload?.lead?.id);
    assertTrue(
      [lead1, lead2, lead3, lead4].every((result) => result.status === 201) && leadIds.every(Boolean),
      `captured-leads edge function is deployed and creates leads (statuses: ${[lead1, lead2, lead3, lead4].map((result) => result.status).join(",")})`
    );

    if (leadIds.every(Boolean)) {
      const [id1, id2, id3, id4] = leadIds;
      const dupFrom1 = await callCapturedLeads(accessToken, `/${id1}/find-duplicates`);
      const found1 = (dupFrom1.payload?.duplicates?.leads || []).map((lead) => lead.id);
      assertTrue(dupFrom1.status === 200, `find-duplicates responds 200 (got ${dupFrom1.status})`);
      assertTrue(found1.includes(id2), "a company name with a comma ('ACME, S.A.') finds its duplicate");
      assertTrue(found1.includes(id3), "matching ONE criterion is enough (same email, different company) -- OR, not AND");
      assertTrue(!found1.includes(id4), "the injection-payload lead is not returned as a duplicate of ACME");

      const dupFrom4 = await callCapturedLeads(accessToken, `/${id4}/find-duplicates`);
      const found4 = (dupFrom4.payload?.duplicates?.leads || []).map((lead) => lead.id);
      assertTrue(dupFrom4.status === 200, `find-duplicates with an injection payload still responds 200 (got ${dupFrom4.status})`);
      assertTrue(found4.length === 0, `an injected PostgREST filter does not return unrelated leads (got ${found4.length})`);
    }

    // --- 3. Borrar un usuario con historial de auditoria ---------------------
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(state.userId);
    assertTrue(!deleteUserError, `deleting a user with audit history works (FK actor_id ON DELETE SET NULL) (error: ${deleteUserError?.message})`);
    if (!deleteUserError) {
      state.userDeleted = true;
      const rowsAfterDelete = await auditRowsFor(quoteNumber);
      assertTrue(rowsAfterDelete.length === 3, "audit rows survive the user deletion");
      assertTrue(rowsAfterDelete.every((row) => row.actor_id === null), "actor_id is set to null after the user is deleted");
      assertTrue(rowsAfterDelete.every((row) => row.actor_name === fullName), "actor_name still says who made each change");
    }
  } finally {
    const orgId = state.organizationId;
    if (orgId) {
      await cleanupStep("captured_leads", () => adminClient.from("captured_leads").delete().eq("organization_id", orgId));
      await cleanupStep("quotes", () => adminClient.from("quotes").delete().eq("organization_id", orgId));
      await cleanupStep("quote_calculation_profiles", () => adminClient.from("quote_calculation_profiles").delete().eq("organization_id", orgId));
    }
    if (state.userId && !state.userDeleted) {
      await cleanupStep("profiles", () => adminClient.from("profiles").delete().eq("id", state.userId));
      await cleanupStep("auth user", () => adminClient.auth.admin.deleteUser(state.userId));
    }
    if (orgId) {
      // Despues de todo lo auditado: borrar filas auditadas genera mas filas de auditoria.
      await cleanupStep("audit_log", () => adminClient.from("audit_log").delete().eq("organization_id", orgId));
      await cleanupStep("organizations", () => adminClient.from("organizations").delete().eq("id", orgId));
    }
  }

  if (cleanupFailures > 0) {
    console.error(`\n${cleanupFailures} cleanup step(s) failed -- quedaron datos de prueba en staging (ver CLEANUP FAIL arriba).`);
  }
  if (failures > 0) {
    console.error(`\n${failures} smoke check(s) failed.`);
    process.exit(1);
  }
  if (cleanupFailures > 0) process.exit(1);
  console.log("\nAll staging smoke checks passed.");
}

main().catch((error) => {
  console.error("Smoke test crashed:", error?.message || error);
  process.exit(1);
});
