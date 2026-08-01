import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  console.error("Faltan VITE_SUPABASE_URL/SUPABASE_URL, VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

let failures = 0;

function assertTrue(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failures += 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function createTestOrgAndAdmin(label) {
  const stamp = Date.now();
  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .insert({ name: `Test Org ${label} ${stamp}` })
    .select("id, name")
    .single();
  if (organizationError) throw organizationError;

  const email = `test-${label.toLowerCase()}-${stamp}@isolation.test`;
  const password = `Test${stamp}pass!`;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test Admin ${label}` },
  });
  if (createError) throw createError;

  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert({ id: created.user.id, full_name: `Test Admin ${label}`, role: "admin", status: "active", organization_id: organization.id }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: session, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { organization, userId: created.user.id, userClient, session };
}

async function cleanup(ids) {
  await adminClient.from("companies").delete().in("organization_id", ids.organizationIds);
  await adminClient.from("profiles").delete().in("id", ids.userIds);
  for (const userId of ids.userIds) {
    await adminClient.auth.admin.deleteUser(userId);
  }
  await adminClient.from("organizations").delete().in("id", ids.organizationIds);
}

async function main() {
  const organizationIds = [];
  const userIds = [];

  try {
    const orgA = await createTestOrgAndAdmin("A");
    organizationIds.push(orgA.organization.id);
    userIds.push(orgA.userId);

    const orgB = await createTestOrgAndAdmin("B");
    organizationIds.push(orgB.organization.id);
    userIds.push(orgB.userId);

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
