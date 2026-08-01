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

    const { error: superAdminPromoteError } = await adminClient
      .from("profiles")
      .update({ is_super_admin: true })
      .eq("id", orgA.userId);
    assertTrue(!superAdminPromoteError, `promoting org A's user to super_admin for the next check (error: ${superAdminPromoteError?.message})`);

    await orgA.userClient.auth.refreshSession();
    const { data: superAdminRead, error: superAdminReadError } = await orgA.userClient
      .from("companies")
      .select("id")
      .eq("id", companyA?.id ?? null);
    assertTrue(!superAdminReadError && (superAdminRead || []).length === 1, "super-admin can still read org A's company after promotion");
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
