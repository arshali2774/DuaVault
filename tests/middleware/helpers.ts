import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.MW_TEST_API_URL!,
    process.env.MW_TEST_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function getAnonClient(): SupabaseClient {
  return createClient(
    process.env.MW_TEST_API_URL!,
    process.env.MW_TEST_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface TestUser {
  id: string;
  email: string;
}

export async function createConfirmedUser(label: string, password: string): Promise<TestUser> {
  const admin = getServiceClient();
  const email = `mw-test-${label}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create confirmed test user ${email}: ${error?.message}`);
  }
  return { id: data.user.id, email };
}

export async function deleteUser(userId: string): Promise<void> {
  const admin = getServiceClient();
  await admin.auth.admin.deleteUser(userId);
}

export async function signIn(email: string, password: string): Promise<Session> {
  const anon = getAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in ${email}: ${error?.message}`);
  }
  return data.session;
}

// `@supabase/ssr`'s default cookie name is `sb-<first-label-of-hostname>-auth-token`
// (see @supabase/supabase-js's `defaultStorageKey`) — derived here from
// MW_TEST_API_URL rather than hardcoded, so it stays correct if the local
// instance's URL ever changes.
function sessionCookieName(): string {
  const hostname = new URL(process.env.MW_TEST_API_URL!).hostname;
  return `sb-${hostname.split(".")[0]}-auth-token`;
}

// Encodes a Session the same way `@supabase/ssr`'s server client decodes
// it: `base64-` + base64url(JSON.stringify(session)) — see
// @supabase/ssr/dist/main/cookies.js's `decodeChunkedCookieValue`. This
// lets tests build a request cookie directly from a real session, without
// needing a running app server to have set it via a Set-Cookie response.
function encodeSessionCookie(session: unknown): string {
  return "base64-" + Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

// Builds a NextRequest for the given path, optionally carrying a session
// cookie — this is what's handed directly to `middleware()`. Middleware
// reads cookies off the request object itself (not `next/headers`), so
// calling the function directly like this needs no running dev server,
// unlike the auth API route suite (tests/auth) which does.
export function buildRequest(pathname: string, session?: Session): NextRequest {
  const headers: HeadersInit = {};
  if (session !== undefined) {
    headers.Cookie = `${sessionCookieName()}=${encodeSessionCookie(session)}`;
  }
  return new NextRequest(new URL(pathname, "http://localhost:3000"), { headers });
}
