import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One service-role client for admin operations (creating/deleting test
// users, reading ground truth that bypasses RLS). Created lazily so
// global-setup has already populated process.env by the time it's used.
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.RLS_TEST_API_URL!,
    process.env.RLS_TEST_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

// Each test user gets its own client instance — never reused across users
// — so a session swap on a shared client can't leak one user's auth into
// another's assertions.
export async function createTestUser(label: string): Promise<TestUser> {
  const admin = getServiceClient();
  const email = `rls-test-${label}-${crypto.randomUUID()}@example.com`;
  const password = "test-password-not-real";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create test user ${email}: ${createError?.message}`);
  }

  const client = createClient(
    process.env.RLS_TEST_API_URL!,
    process.env.RLS_TEST_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in test user ${email}: ${signInError.message}`);
  }

  return { id: created.user.id, email, client };
}

// Deletes the auth user; `on delete cascade` on duas.owner_id takes care of
// their duas (and dua_tags via duas' own cascade).
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = getServiceClient();
  await admin.auth.admin.deleteUser(userId);
}

export interface SeedDuaOptions {
  title?: string;
}

export interface SeededDua {
  id: string;
  title: string;
  owner_id: string;
}

// Inserts a dua directly as the given owner via the service-role client
// (bypasses RLS), for setting up "the other user's row" fixtures without
// depending on the very insert path under test.
export async function seedDua(ownerId: string, options: SeedDuaOptions = {}): Promise<SeededDua> {
  const admin = getServiceClient();
  const { data, error } = await admin
    .from("duas")
    .insert({
      title: options.title ?? "Seeded dua",
      arabic_text: "arabic",
      translation: "translation",
      owner_id: ownerId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed dua for owner ${ownerId}: ${error?.message}`);
  }
  return data as SeededDua;
}

// Inserts a tag directly via the service-role client, bypassing RLS —
// tests for tags' own policies seed through this rather than through the
// insert path they're meant to be exercising.
export async function seedTag(name: string) {
  const admin = getServiceClient();
  const { data, error } = await admin
    .from("tags")
    .insert({ name })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to seed tag "${name}": ${error?.message}`);
  }
  return data as { id: string; name: string };
}

export async function seedDuaTag(duaId: string, tagId: string) {
  const admin = getServiceClient();
  const { error } = await admin.from("dua_tags").insert({ dua_id: duaId, tag_id: tagId });

  if (error) {
    throw new Error(`Failed to seed dua_tags link (${duaId}, ${tagId}): ${error.message}`);
  }
}
