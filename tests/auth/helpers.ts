import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One service-role client for admin operations (creating/deleting test
// users). Created lazily so global-setup has already populated
// process.env by the time it's used — mirrors tests/rls/helpers.ts.
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.AUTH_TEST_API_URL!,
    process.env.AUTH_TEST_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function uniqueEmail(label: string): string {
  return `auth-test-${label}-${crypto.randomUUID()}@example.com`;
}

// Shared across signup.test.ts and login.test.ts so a copy change in
// login/route.ts (or to the fixture password) only needs updating here.
export const UNCONFIRMED_LOGIN_ERROR = "Please verify your email before signing in.";
export const SIGNUP_TEST_PASSWORD = "signup-password-123";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

// Creates a user via the admin API with email_confirm: true, bypassing the
// confirmation-email flow entirely — for tests that need a *verified*
// account as a starting fixture (e.g. "login rejects wrong password")
// rather than exercising verification itself.
export async function createConfirmedUser(
  label: string,
  password = "correct-horse-battery-staple"
): Promise<TestUser> {
  const admin = getServiceClient();
  const email = uniqueEmail(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create confirmed test user ${email}: ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

export async function deleteUser(userId: string): Promise<void> {
  const admin = getServiceClient();
  await admin.auth.admin.deleteUser(userId);
}

// Minimal cookie jar for carrying Set-Cookie forward across requests, the
// same way a browser would — needed both for session cookies (login ->
// protected route -> logout) and the PKCE code-verifier cookie
// (forgot-password -> reset-password must reuse the same jar).
export class CookieJar {
  private cookies = new Map<string, string>();

  capture(res: Response): void {
    for (const cookie of res.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      // Max-Age=0 is how logout clears a cookie; drop it from the jar so
      // a subsequent request doesn't resend an already-revoked cookie.
      if (/max-age=0/i.test(cookie)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  get(namePattern: RegExp): string | undefined {
    for (const [name, value] of this.cookies) {
      if (namePattern.test(name)) return value;
    }
    return undefined;
  }

  entries(): [string, string][] {
    return Array.from(this.cookies.entries());
  }
}

// Pulls the logged-in user's id out of the `sb-*-auth-token` session
// cookie the SSR client sets on login, rather than calling
// `admin.listUsers()` — the local Supabase CLI's GoTrue image in this
// environment 500s on that endpoint ("converting NULL to string is
// unsupported") as soon as any user has a null confirmation_token, which
// includes every admin-created or previously-confirmed test user. Reading
// the id straight out of the session avoids that endpoint entirely.
//
// The SSR client splits this cookie into `sb-*-auth-token.0`, `.1`, ...
// once the JWT is long enough to exceed a single cookie's size budget, so
// this reassembles chunks in order before falling back to the unchunked
// name.
export function getUserIdFromSessionCookie(jar: CookieJar): string {
  const chunkPattern = /^(sb-.*-auth-token)\.(\d+)$/;
  const chunks = jar
    .entries()
    .map(([name, value]) => ({ name, value, match: name.match(chunkPattern) }))
    .filter((entry) => entry.match)
    .sort((a, b) => Number(a.match![2]) - Number(b.match![2]));

  const raw = chunks.length > 0
    ? chunks.map((c) => c.value).join("")
    : jar.get(/^sb-.*-auth-token$/);

  if (!raw) {
    throw new Error("No sb-*-auth-token cookie in jar — was the login call made with this jar?");
  }
  const base64 = raw.startsWith("base64-") ? raw.slice("base64-".length) : raw;
  const session = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
  const id = session?.user?.id;
  if (!id) {
    throw new Error(`Session cookie did not contain user.id: ${JSON.stringify(session)}`);
  }
  return id as string;
}

export interface JsonResponse<T = unknown> {
  status: number;
  body: T;
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  jar?: CookieJar
): Promise<JsonResponse<T>> {
  const res = await fetch(`${process.env.AUTH_TEST_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jar?.header() ? { Cookie: jar.header() } : {}),
    },
    body: JSON.stringify(body),
  });
  jar?.capture(res);
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : undefined) as T };
}

// Fetches a path without following redirects, so callers can assert on the
// 307/308 + Location that middleware issues for an unauthenticated request
// rather than whatever page that redirect eventually resolves to.
export async function apiGetNoRedirect(path: string, jar?: CookieJar): Promise<Response> {
  const res = await fetch(`${process.env.AUTH_TEST_BASE_URL}${path}`, {
    headers: jar?.header() ? { Cookie: jar.header() } : undefined,
    redirect: "manual",
  });
  jar?.capture(res);
  return res;
}

interface MailpitMessageSummary {
  ID: string;
  Subject: string;
}

interface MailpitSearchResult {
  messages: MailpitMessageSummary[];
}

interface MailpitMessage {
  Text: string;
  HTML: string;
}

// Polls Mailpit (the local Supabase CLI's mail catcher) for a message to
// the given address, optionally filtered by subject substring — signup and
// password-reset both email the same address in some tests, so subject is
// how they're told apart.
export async function waitForMailTo(
  email: string,
  options: { subjectContains?: string; timeoutMs?: number } = {}
): Promise<string> {
  const deadline = Date.now() + (options.timeoutMs ?? 10000);
  const mailpitUrl = process.env.AUTH_TEST_MAILPIT_URL!;

  while (Date.now() < deadline) {
    const search: MailpitSearchResult = await fetch(
      `${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
    ).then((r) => r.json());

    const match = options.subjectContains
      ? search.messages?.find((m) => m.Subject.includes(options.subjectContains!))
      : search.messages?.[0];

    if (match) {
      const full: MailpitMessage = await fetch(
        `${mailpitUrl}/api/v1/message/${match.ID}`
      ).then((r) => r.json());
      // Falls back to the HTML body (de-entitied) if a future template
      // change ever ships HTML-only — otherwise extractVerifyLink would
      // fail with a misleading "no link found" on an unrelated template
      // change rather than the actual regression.
      return full.Text || full.HTML.replace(/&amp;/g, "&");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`No email arrived for ${email} within ${options.timeoutMs ?? 10000}ms`);
}

export function extractVerifyLink(emailText: string): string {
  const match = emailText.match(/http:\/\/127\.0\.0\.1:\d+\/auth\/v1\/verify\?\S+/);
  if (!match) {
    throw new Error(`Could not find a Supabase verify link in email:\n${emailText}`);
  }
  return match[0];
}

// Follows a Supabase Auth verify link (type=signup or type=recovery). This
// hits Supabase's Auth API directly, not our app, and is how the suite
// simulates a user clicking the link in their inbox. Returns the `?code=`
// param Supabase redirects back to our site with, when present (the
// recovery flow needs it; the signup flow doesn't).
export async function followVerifyLink(verifyLink: string): Promise<string | null> {
  const res = await fetch(verifyLink, { redirect: "manual" });
  const location = res.headers.get("location");
  if (!location) {
    throw new Error(`Verify link did not redirect (status ${res.status}): ${verifyLink}`);
  }
  return new URL(location).searchParams.get("code");
}
