import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One service-role client for admin operations (creating/deleting test
// users). Created lazily so global-setup has already populated
// process.env by the time it's used — mirrors tests/auth/helpers.ts.
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.DUPLICATES_TEST_API_URL!,
    process.env.DUPLICATES_TEST_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function uniqueEmail(label: string): string {
  return `duplicates-test-${label}-${crypto.randomUUID()}@example.com`;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

// Creates a pre-confirmed user via the admin API, bypassing the
// confirmation-email flow — every test here needs an authenticated owner
// for /api/duas, not to exercise verification itself.
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

export class CookieJar {
  private cookies = new Map<string, string>();

  capture(res: Response): void {
    for (const cookie of res.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
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
}

export interface JsonResponse<T = unknown> {
  status: number;
  body: T;
}

async function apiSend<T = unknown>(
  method: "POST" | "PUT",
  path: string,
  body: unknown,
  jar?: CookieJar
): Promise<JsonResponse<T>> {
  const res = await fetch(`${process.env.DUPLICATES_TEST_BASE_URL}${path}`, {
    method,
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

export function apiPost<T = unknown>(
  path: string,
  body: unknown,
  jar?: CookieJar
): Promise<JsonResponse<T>> {
  return apiSend<T>("POST", path, body, jar);
}

export function apiPut<T = unknown>(
  path: string,
  body: unknown,
  jar?: CookieJar
): Promise<JsonResponse<T>> {
  return apiSend<T>("PUT", path, body, jar);
}

// Shared request/response shapes for /api/duas, used by both
// add-dua-duplicate.test.ts and edit-dua-duplicate.test.ts.
export interface DuaPayload {
  title: string;
  arabicText: string;
  translation: string;
  transliteration?: string;
  confirmDuplicate?: boolean;
}

export interface PossibleDuplicateBody {
  possibleDuplicate: {
    id: string;
    title: string;
    arabicText: string;
    translation: string;
  };
}

export function createDua(jar: CookieJar, payload: DuaPayload) {
  return apiPost<PossibleDuplicateBody & { id: string }>(
    "/api/duas",
    payload,
    jar
  );
}

export function editDua(jar: CookieJar, id: string, payload: DuaPayload) {
  return apiPut<PossibleDuplicateBody & { id: string }>(
    `/api/duas/${id}`,
    payload,
    jar
  );
}

// Logs a confirmed test user in via the app's own login route and returns
// a cookie jar carrying the resulting session — the same authenticated
// per-request client every /api/duas route relies on for RLS.
export async function loginAsTestUser(user: TestUser): Promise<CookieJar> {
  const jar = new CookieJar();
  const res = await apiPost("/api/auth/login", { email: user.email, password: user.password }, jar);
  if (res.status !== 200) {
    throw new Error(`Login failed for ${user.email}: ${JSON.stringify(res.body)}`);
  }
  return jar;
}
