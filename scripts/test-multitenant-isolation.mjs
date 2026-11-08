import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL, VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Este test crea y borra organizaciones, usuarios y datos: nunca contra
// produccion (ref de supabase/config.toml y .env.production). Ojo que
// VITE_SUPABASE_URL de un .env.production local apunta justamente ahi.
const PRODUCTION_REF = "bewqfxodhhanbxbqngsf";
if (url.includes(PRODUCTION_REF)) {
  console.error("ABORTADO: la URL de Supabase apunta al proyecto de PRODUCCION. Este test es solo para staging/dev.");
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

// Registra cada org/usuario en `track` apenas se crea (no al final): si algo
// falla a mitad de camino, el cleanup igual sabe que borrar.
async function createTestOrgAndAdmin(label, track) {
  const stamp = Date.now();
  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .insert({ name: `Test Org ${label} ${stamp}` })
    .select("id, name")
    .single();
  if (organizationError) throw organizationError;
  track.organizationIds.push(organization.id);

  const email = `test-${label.toLowerCase()}-${stamp}@isolation.test`;
  const password = `Test${stamp}pass!`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test Admin ${label}` },
  });
  if (createError) throw createError;
  track.userIds.push(created.user.id);

  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert({ id: created.user.id, full_name: `Test Admin ${label}`, role: "admin", status: "active", organization_id: organization.id }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: session, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { organization, userId: created.user.id, userClient, session };
}

// Antes el cleanup ignoraba los errores: si un borrado fallaba (por ejemplo
// por una FK), los datos de prueba quedaban en la base sin que nadie se
// enterara. Cada paso ahora informa su falla y el script termina con exit 1.
async function cleanupStep(label, run) {
  try {
    const result = await run();
    if (result?.error) throw result.error;
  } catch (error) {
    cleanupFailures += 1;
    console.error(`CLEANUP FAIL: ${label} (${error?.message || error})`);
  }
}

async function cleanup(ids) {
  const orgIds = ids.organizationIds;
  if (orgIds.length) {
    await cleanupStep("labor_rate_catalog", () => adminClient.from("labor_rate_catalog").delete().in("organization_id", orgIds));
    await cleanupStep("quote_calculation_profiles", () => adminClient.from("quote_calculation_profiles").delete().in("organization_id", orgIds));
    await cleanupStep("companies", () => adminClient.from("companies").delete().in("organization_id", orgIds));
  }
  if (ids.globalMaterialId) {
    await cleanupStep("material_price_catalog (fila global de prueba)", () => adminClient.from("material_price_catalog").delete().eq("id", ids.globalMaterialId));
    // La fila global no tiene organization_id: si el trigger de auditoria
    // (log_table_audit) esta activo, su rastro en audit_log se limpia por record_key.
    await cleanupStep("audit_log de la fila global de prueba", () => adminClient.from("audit_log").delete().eq("record_key", ids.globalMaterialId));
  }
  if (ids.userIds.length) {
    await cleanupStep("profiles", () => adminClient.from("profiles").delete().in("id", ids.userIds));
    for (const userId of ids.userIds) {
      await cleanupStep(`auth user ${userId}`, () => adminClient.auth.admin.deleteUser(userId));
    }
  }
  if (orgIds.length) {
    // audit_log.organization_id referencia organizations sin ON DELETE: con el
    // trigger de auditoria activo, cada insert/delete de arriba deja filas que
    // bloquean el borrado de la organizacion. Va despues de todo lo auditado,
    // porque borrar filas auditadas genera MAS filas de auditoria.
    await cleanupStep("audit_log de las orgs de prueba", () => adminClient.from("audit_log").delete().in("organization_id", orgIds));
    await cleanupStep("organizations", () => adminClient.from("organizations").delete().in("id", orgIds));
  }
}

async function main() {
  const track = { organizationIds: [], userIds: [] };
  let globalMaterialId = null;

  try {
    const orgA = await createTestOrgAndAdmin("A", track);
    const orgB = await createTestOrgAndAdmin("B", track);

    const { data: companyA, error: companyAError } = await orgA.userClient
      .from("companies")
      .insert({ name: `Cliente Org A ${Date.now()}` })
      .select("id, organization_id")
      .single();
    assertTrue(!companyAError, `org A admin can create a company (error: ${companyAError?.message})`);
    assertTrue(companyA?.organization_id === orgA.organization.id, "created company is auto-stamped with org A's organization_id");

    const { data: companyB, error: companyBError } = await orgB.userClient
      .from("companies")
      .insert({ name: `Cliente Org B ${Date.now()}` })
      .select("id, organization_id")
      .single();
    assertTrue(!companyBError, `org B admin can create a company (error: ${companyBError?.message})`);

    const { data: crossReadAttempt, error: crossReadError } = await orgB.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue(!crossReadError, `org B querying org A's company id does not error (error: ${crossReadError?.message})`);
    assertTrue((crossReadAttempt || []).length === 0, "org B cannot read org A's company (RLS filters it out)");

    const { data: ownReadAttempt, error: ownReadError } = await orgA.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue(!ownReadError && (ownReadAttempt || []).length === 1, "org A can read its own company");

    // Cross-org WRITE denial: org B must not be able to update or delete
    // org A's company. A denied RLS write returns zero affected rows (not
    // necessarily an error), so assert the row count and that org A's data
    // is unchanged, not just the absence of an error.
    const { data: crossUpdateAttempt, error: crossUpdateError } = await orgB.userClient
      .from("companies")
      .update({ name: "Hijacked by org B" })
      .eq("id", companyA?.id ?? null)
      .select("id");
    assertTrue(!crossUpdateError, `org B updating org A's company does not error (error: ${crossUpdateError?.message})`);
    assertTrue((crossUpdateAttempt || []).length === 0, "org B cannot update org A's company (0 rows affected)");

    const { data: verifyUnchanged } = await orgA.userClient
      .from("companies")
      .select("name")
      .eq("id", companyA?.id ?? null)
      .single();
    assertTrue(!verifyUnchanged?.name?.includes("Hijacked"), "org A's company name was not modified by org B's blocked update");

    const { data: crossDeleteAttempt, error: crossDeleteError } = await orgB.userClient
      .from("companies")
      .delete()
      .eq("id", companyA?.id ?? null)
      .select("id");
    assertTrue(!crossDeleteError, `org B deleting org A's company does not error (error: ${crossDeleteError?.message})`);
    assertTrue((crossDeleteAttempt || []).length === 0, "org B cannot delete org A's company (0 rows affected)");

    const { data: verifyStillExists } = await orgA.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue((verifyStillExists || []).length === 1, "org A's company still exists after org B's blocked delete");

    // --- labor_rate_catalog: mismo patron de aislamiento que companies,
    // pero sobre la tabla que alimenta la pantalla Precios y condiciones.
    const { data: laborRateA, error: laborRateAError } = await orgA.userClient
      .from("labor_rate_catalog")
      .insert({ id: `test-rate-a-${Date.now()}`, trade: "Soldador de prueba", base_hour: 1000, quote_hour: 2000 })
      .select("id, organization_id")
      .single();
    assertTrue(!laborRateAError, `org A admin can create a labor rate (error: ${laborRateAError?.message})`);
    assertTrue(laborRateA?.organization_id === orgA.organization.id, "created labor rate is auto-stamped with org A's organization_id");

    const { data: crossReadLaborRate, error: crossReadLaborRateError } = await orgB.userClient
      .from("labor_rate_catalog")
      .select("id")
      .eq("id", laborRateA?.id ?? null);
    assertTrue(!crossReadLaborRateError, `org B querying org A's labor rate does not error (error: ${crossReadLaborRateError?.message})`);
    assertTrue((crossReadLaborRate || []).length === 0, "org B cannot read org A's labor rate (RLS filters it out)");

    const { data: crossUpdateLaborRate, error: crossUpdateLaborRateError } = await orgB.userClient
      .from("labor_rate_catalog")
      .update({ quote_hour: 1 })
      .eq("id", laborRateA?.id ?? null)
      .select("id");
    assertTrue(!crossUpdateLaborRateError && (crossUpdateLaborRate || []).length === 0, "org B cannot update org A's labor rate (0 rows affected)");

    // --- quote_calculation_profiles: el trigger seed_default_quote_calculation_profile
    // (20261108100100) ya deberia haber sembrado una fila al crear cada
    // organizacion -- se confirma que existe y que la otra org no la ve.
    const { data: ownProfileA, error: ownProfileAError } = await orgA.userClient
      .from("quote_calculation_profiles")
      .select("id, organization_id")
      .eq("organization_id", orgA.organization.id);
    assertTrue(!ownProfileAError && (ownProfileA || []).length >= 1, `org A has a seeded quote_calculation_profiles row (error: ${ownProfileAError?.message ?? "none found"})`);

    const { data: crossReadProfile, error: crossReadProfileError } = await orgB.userClient
      .from("quote_calculation_profiles")
      .select("id")
      .eq("organization_id", orgA.organization.id);
    assertTrue(!crossReadProfileError, `org B querying org A's quote_calculation_profiles does not error (error: ${crossReadProfileError?.message})`);
    assertTrue((crossReadProfile || []).length === 0, "org B cannot read org A's quote_calculation_profiles (RLS filters it out)");

    // --- material_price_catalog: guardia de regresion. Este catalogo es
    // GLOBAL a proposito (docs/superpowers/specs/2026-08-01-multiempresa-design.md,
    // "Shared vs per-tenant data") -- NO debe quedar escopeado por
    // organizacion. Si alguien le agrega organization_id/RLS por org sin
    // mirar ese diseño, este check lo detecta: ambas orgs tienen que poder
    // leer la misma fila global.
    globalMaterialId = `test-material-global-${Date.now()}`;
    const { error: globalMaterialInsertError } = await adminClient
      .from("material_price_catalog")
      .insert({ id: globalMaterialId, source: "Test", category: "Test", name: "Material de prueba", base_price: 100 });
    assertTrue(!globalMaterialInsertError, `service role can seed a global material_price_catalog row (error: ${globalMaterialInsertError?.message})`);

    const { data: materialFromOrgA } = await orgA.userClient.from("material_price_catalog").select("id").eq("id", globalMaterialId);
    assertTrue((materialFromOrgA || []).length === 1, "org A can read the global material_price_catalog row (shared on purpose, not tenant-scoped)");

    const { data: materialFromOrgB, error: materialFromOrgBError } = await orgB.userClient.from("material_price_catalog").select("id").eq("id", globalMaterialId);
    assertTrue(!materialFromOrgBError && (materialFromOrgB || []).length === 1, "org B can read the same global material_price_catalog row (shared on purpose, not tenant-scoped)");

    // --- enabled_modules: mismo patron de guardia que is_super_admin -- la
    // propia sesion del admin de org A no puede auto-habilitarse modulos
    // que Bizon no le vendio (ejercita guard_organization_privileges).
    const { data: selfEnableAttempt, error: selfEnableError } = await orgA.userClient
      .from("organizations")
      .update({ enabled_modules: ["usuarios", "reportes", "finanzas"] })
      .eq("id", orgA.organization.id)
      .select("id");
    assertTrue(
      !!selfEnableError || (selfEnableAttempt || []).length === 0,
      `org A admin cannot self-enable modules via its own session (error: ${selfEnableError?.message ?? "none, but 0 rows affected"})`
    );
    const { data: verifyModulesUnchanged } = await adminClient
      .from("organizations")
      .select("enabled_modules")
      .eq("id", orgA.organization.id)
      .single();
    assertTrue(verifyModulesUnchanged?.enabled_modules == null, "org A's enabled_modules is still unset after the blocked self-enable attempt");

    // La guardia es columna-especifica: un cambio legitimo a un campo no
    // privilegiado de la misma fila (fiscal_condition, igual que
    // name/primary_color ya cubiertos por organizations_update_own_admin)
    // tiene que seguir funcionando.
    const { data: legitimateSelfUpdate, error: legitimateSelfUpdateError } = await orgA.userClient
      .from("organizations")
      .update({ fiscal_condition: "Responsable Inscripto" })
      .eq("id", orgA.organization.id)
      .select("id, fiscal_condition");
    assertTrue(
      !legitimateSelfUpdateError && legitimateSelfUpdate?.[0]?.fiscal_condition === "Responsable Inscripto",
      `org A admin can still update its own non-privileged org fields (error: ${legitimateSelfUpdateError?.message ?? "none"})`
    );

    // Legitimate enable (service role, bypasses the trigger's auth.uid()
    // check) -- confirma que un super-admin SI puede setear enabled_modules.
    const { error: legitimateEnableError } = await adminClient
      .from("organizations")
      .update({ enabled_modules: ["dashboard", "clientes"] })
      .eq("id", orgA.organization.id);
    assertTrue(!legitimateEnableError, `service role can set org A's enabled_modules (error: ${legitimateEnableError?.message})`);

    // Privilege escalation: org A's own (non-super-admin) session must not be
    // able to promote itself by writing is_super_admin via its own client —
    // this exercises the guard_profile_privileges trigger directly.
    const { data: selfEscalateAttempt, error: selfEscalateError } = await orgA.userClient
      .from("profiles")
      .update({ is_super_admin: true })
      .eq("id", orgA.userId)
      .select("id");
    assertTrue(
      !!selfEscalateError || (selfEscalateAttempt || []).length === 0,
      `org A admin cannot self-promote to super_admin via its own session (error: ${selfEscalateError?.message ?? "none, but 0 rows affected"})`
    );
    const { data: verifyNotEscalated } = await adminClient
      .from("profiles")
      .select("is_super_admin")
      .eq("id", orgA.userId)
      .single();
    assertTrue(verifyNotEscalated?.is_super_admin !== true, "org A admin's is_super_admin is still false after the blocked self-escalation attempt");

    // Legitimate promotion (service role, bypasses the trigger's auth.uid()
    // check) followed by a REAL cross-org read using org B's company — the
    // previous version of this check re-read org A's own company, which
    // would have passed even if the super-admin bypass were broken.
    const { error: superAdminPromoteError } = await adminClient
      .from("profiles")
      .update({ is_super_admin: true })
      .eq("id", orgA.userId);
    assertTrue(!superAdminPromoteError, `promoting org A's user to super_admin via service role (error: ${superAdminPromoteError?.message})`);

    await orgA.userClient.auth.refreshSession();
    const { data: superAdminCrossOrgRead, error: superAdminCrossOrgError } = await orgA.userClient
      .from("companies")
      .select("id")
      .eq("id", companyB?.id ?? null);
    assertTrue(
      !superAdminCrossOrgError && (superAdminCrossOrgRead || []).length === 1,
      "promoted super-admin can read org B's company (real cross-org access, not just its own org)"
    );
  } finally {
    await cleanup({ ...track, globalMaterialId });
  }

  if (cleanupFailures > 0) {
    console.error(`\n${cleanupFailures} cleanup step(s) failed -- quedaron datos de prueba en la base (ver CLEANUP FAIL arriba).`);
  }
  if (failures > 0) {
    console.error(`\n${failures} isolation check(s) failed.`);
    process.exit(1);
  }
  if (cleanupFailures > 0) process.exit(1);
  console.log("\nAll multi-tenant isolation checks passed.");
}

main().catch((error) => {
  console.error("Isolation test crashed:", error);
  process.exit(1);
});
