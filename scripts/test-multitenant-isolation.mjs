import { createClient } from "@supabase/supabase-js";

// Test de aislamiento multiempresa contra una base real (crea y borra sus
// propias organizaciones/usuarios). Requiere la service role key.
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/test-multitenant-isolation.mjs

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL, VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const stamp = Date.now();

let failures = 0;

function assertTrue(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function createOrg(label) {
  const { data, error } = await adminClient
    .from("organizations")
    .insert({ name: `Test Org ${label} ${stamp}` })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

// Crea un usuario de auth + perfil y devuelve un cliente logueado como el.
async function createUser(label, profile) {
  const email = `test-${label.toLowerCase()}-${stamp}@isolation.test`;
  const password = `Test${stamp}pass!`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${label}` },
  });
  if (createError) throw createError;

  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert({ id: created.user.id, full_name: `Test ${label}`, role: "admin", status: "active", ...profile }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { userId: created.user.id, userClient };
}

async function cleanup({ organizationIds, userIds }) {
  for (const table of ["quotes", "companies"]) {
    await adminClient.from(table).delete().in("organization_id", organizationIds);
  }
  await adminClient.from("profiles").delete().in("id", userIds);
  for (const userId of userIds) {
    await adminClient.auth.admin.deleteUser(userId);
  }
  await adminClient.from("organizations").delete().in("id", organizationIds);
}

async function main() {
  const organizationIds = [];
  const userIds = [];

  try {
    const orgA = await createOrg("A");
    const orgB = await createOrg("B");
    organizationIds.push(orgA.id, orgB.id);

    const adminA = await createUser("Admin-A", { organization_id: orgA.id });
    const adminB = await createUser("Admin-B", { organization_id: orgB.id });
    userIds.push(adminA.userId, adminB.userId);

    // --- Lectura/escritura entre organizaciones ---
    const { data: companyA, error: companyAError } = await adminA.userClient
      .from("companies")
      .insert({ name: `Cliente Org A ${stamp}` })
      .select("id, name, organization_id")
      .single();
    assertTrue(!companyAError, `org A admin can create a company (error: ${companyAError?.message})`);
    assertTrue(companyA?.organization_id === orgA.id, "created company is auto-stamped with org A's organization_id");

    const { data: companyB, error: companyBError } = await adminB.userClient
      .from("companies")
      .insert({ name: `Cliente Org B ${stamp}` })
      .select("id, organization_id")
      .single();
    assertTrue(!companyBError, `org B admin can create a company (error: ${companyBError?.message})`);

    const { data: crossReadAttempt, error: crossReadError } = await adminB.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue(!crossReadError, `org B querying org A's company id does not error (error: ${crossReadError?.message})`);
    assertTrue((crossReadAttempt || []).length === 0, "org B cannot read org A's company (RLS filters it out)");

    const { data: ownReadAttempt, error: ownReadError } = await adminA.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue(!ownReadError && (ownReadAttempt || []).length === 1, "org A can read its own company");

    // Un write denegado por RLS devuelve 0 filas, no necesariamente error.
    const { data: crossUpdateAttempt, error: crossUpdateError } = await adminB.userClient
      .from("companies")
      .update({ name: "Hijacked by org B" })
      .eq("id", companyA?.id ?? null)
      .select("id");
    assertTrue(!crossUpdateError, `org B updating org A's company does not error (error: ${crossUpdateError?.message})`);
    assertTrue((crossUpdateAttempt || []).length === 0, "org B cannot update org A's company (0 rows affected)");

    const { data: verifyUnchanged } = await adminA.userClient
      .from("companies")
      .select("name")
      .eq("id", companyA?.id ?? null)
      .single();
    assertTrue(!verifyUnchanged?.name?.includes("Hijacked"), "org A's company name was not modified by org B's blocked update");

    const { data: crossDeleteAttempt, error: crossDeleteError } = await adminB.userClient
      .from("companies")
      .delete()
      .eq("id", companyA?.id ?? null)
      .select("id");
    assertTrue(!crossDeleteError, `org B deleting org A's company does not error (error: ${crossDeleteError?.message})`);
    assertTrue((crossDeleteAttempt || []).length === 0, "org B cannot delete org A's company (0 rows affected)");

    const { data: verifyStillExists } = await adminA.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue((verifyStillExists || []).length === 1, "org A's company still exists after org B's blocked delete");

    // --- Numeracion por organizacion: el mismo numero debe poder existir en dos orgs ---
    const quoteNumber = `P-TEST-${stamp}`;
    const { error: quoteAError } = await adminA.userClient
      .from("quotes")
      .insert({ number: quoteNumber, client: companyA?.name, service: "Servicio A", status: "Enviado" });
    assertTrue(!quoteAError, `org A can create quote ${quoteNumber} (error: ${quoteAError?.message})`);

    const { error: quoteBError } = await adminB.userClient
      .from("quotes")
      .insert({ number: quoteNumber, client: "Cliente B", service: "Servicio B", status: "Enviado" });
    assertTrue(!quoteBError, `org B can reuse quote number ${quoteNumber} (per-org uniqueness; error: ${quoteBError?.message})`);

    // --- Rol cliente: solo presupuestos de su empresa y nunca borradores ---
    const { error: extraQuotesError } = await adminA.userClient.from("quotes").insert([
      { number: `P-OTRO-${stamp}`, client: "Otra Empresa", service: "x", status: "Enviado" },
      { number: `P-BORRADOR-${stamp}`, client: companyA?.name, service: "x", status: "Borrador" },
    ]);
    assertTrue(!extraQuotesError, `org A can create extra quotes for the cliente check (error: ${extraQuotesError?.message})`);

    const cliente = await createUser("Cliente-A", { role: "cliente", organization_id: orgA.id, company_name: companyA?.name });
    userIds.push(cliente.userId);

    const { data: clienteQuotes, error: clienteQuotesError } = await cliente.userClient.from("quotes").select("number, client, status");
    assertTrue(!clienteQuotesError, `cliente can query quotes (error: ${clienteQuotesError?.message})`);
    assertTrue(
      (clienteQuotes || []).length === 1 && clienteQuotes[0].number === quoteNumber,
      `cliente sees only its company's non-draft quotes (saw: ${(clienteQuotes || []).map((q) => `${q.number}/${q.status}`).join(", ") || "none"})`
    );

    const { data: clienteCompanies } = await cliente.userClient.from("companies").select("id");
    assertTrue((clienteCompanies || []).length === 0, "cliente cannot read the companies table");

    const { data: clienteWrite, error: clienteWriteError } = await cliente.userClient
      .from("quotes")
      .update({ status: "Aprobado" })
      .eq("number", quoteNumber)
      .select("number");
    assertTrue(!!clienteWriteError || (clienteWrite || []).length === 0, "cliente cannot modify quotes");

    // --- Super admin de plataforma sin organizacion: no inserta datos operativos ---
    const platform = await createUser("Platform", { organization_id: null, is_super_admin: true });
    userIds.push(platform.userId);

    const { error: orphanError } = await platform.userClient.from("companies").insert({ name: `Huerfana ${stamp}` });
    assertTrue(!!orphanError, "super admin without organization cannot insert operational rows (would be orphaned)");

    const { data: platformRead, error: platformReadError } = await platform.userClient.from("companies").select("id").in("id", [companyA?.id, companyB?.id]);
    assertTrue(!platformReadError && (platformRead || []).length === 2, "super admin can read companies of both organizations");

    // --- Empresa activa: el super admin elige org A y sus altas quedan en org A ---
    const { error: actingError } = await platform.userClient
      .from("profiles")
      .update({ acting_organization_id: orgA.id })
      .eq("id", platform.userId);
    assertTrue(!actingError, `super admin can set its acting organization (error: ${actingError?.message})`);

    const { data: actingCompany, error: actingInsertError } = await platform.userClient
      .from("companies")
      .insert({ name: `Cargada por plataforma ${stamp}` })
      .select("id, organization_id")
      .single();
    assertTrue(!actingInsertError, `super admin with acting org can insert (error: ${actingInsertError?.message})`);
    assertTrue(actingCompany?.organization_id === orgA.id, "super admin's insert is stamped with the acting organization");

    const { data: actingNumber, error: actingNumberError } = await platform.userClient.rpc("next_document_number", { counter_code: "quote" });
    assertTrue(!actingNumberError && typeof actingNumber === "string", `super admin with acting org can generate document numbers (error: ${actingNumberError?.message})`);

    // Un admin de empresa no puede tocar acting_organization_id.
    const { data: adminActing, error: adminActingError } = await adminA.userClient
      .from("profiles")
      .update({ acting_organization_id: orgB.id })
      .eq("id", adminA.userId)
      .select("id");
    assertTrue(!!adminActingError || (adminActing || []).length === 0, "org admin cannot set acting_organization_id");

    // --- Escalada de privilegios desde la propia sesion ---
    const { data: selfEscalateAttempt, error: selfEscalateError } = await adminA.userClient
      .from("profiles")
      .update({ is_super_admin: true })
      .eq("id", adminA.userId)
      .select("id");
    assertTrue(
      !!selfEscalateError || (selfEscalateAttempt || []).length === 0,
      `org A admin cannot self-promote to super_admin (error: ${selfEscalateError?.message ?? "none, but 0 rows affected"})`
    );
    const { data: verifyNotEscalated } = await adminClient
      .from("profiles")
      .select("is_super_admin")
      .eq("id", adminA.userId)
      .single();
    assertTrue(verifyNotEscalated?.is_super_admin !== true, "org A admin's is_super_admin is still false after the blocked self-escalation attempt");
  } finally {
    if (organizationIds.length || userIds.length) {
      await cleanup({ organizationIds, userIds });
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} isolation check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll multi-tenant isolation checks passed.");
}

main().catch((error) => {
  console.error("Isolation test crashed:", error);
  process.exit(1);
});
