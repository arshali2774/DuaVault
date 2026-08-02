import type { Session } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { middleware } from "../../src/middleware";
import { buildRequest, createConfirmedUser, deleteUser, signIn, type TestUser } from "./helpers";

// middleware() reads NEXT_PUBLIC_SUPABASE_URL/ANON_KEY at call time (see
// src/middleware.ts), so setting these before each call is enough — no
// need to set them before this file is imported.
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.MW_TEST_API_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.MW_TEST_ANON_KEY;
});

describe("middleware session gate", () => {
  const password = "middleware-test-password-123";
  let user: TestUser;
  let session: Session;

  beforeAll(async () => {
    user = await createConfirmedUser("gate", password);
    session = await signIn(user.email, password);
  });

  afterAll(async () => {
    await deleteUser(user.id);
  });

  it("redirects an unauthenticated request to /login", async () => {
    const res = await middleware(buildRequest("/"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?redirect=%2F");
  });

  it("lets an authenticated request pass through", async () => {
    const res = await middleware(buildRequest("/", session));

    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("treats an expired/invalid session as unauthenticated", async () => {
    // A separate user, deleted server-side right after signing in: the
    // cookie is a genuine, untampered session, but by the time middleware
    // sees it neither the access token nor the refresh token resolve to
    // anyone. This — not merely corrupting the access token's signature —
    // is what actually stands in for "expired": `supabase.auth.getUser()`
    // transparently refreshes a session whose access token has expired but
    // whose refresh token is still live (see middleware.ts:67-68's comment
    // on keeping a rolling session alive), so a token that's only
    // signature-invalid but has a working refresh token would incorrectly
    // pass this test. Deleting the user invalidates both, so it fails
    // regardless of which of the two `getUser()` internally attempts.
    const revokedUser = await createConfirmedUser("gate-revoked", password);
    const revokedSession = await signIn(revokedUser.email, password);
    await deleteUser(revokedUser.id);

    const res = await middleware(buildRequest("/", revokedSession));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?redirect=%2F");
  });

  it("preserves the original path in the redirect's ?redirect= param", async () => {
    const res = await middleware(buildRequest("/practice"));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fpractice"
    );
  });

  it("does not redirect requests to public routes even when unauthenticated", async () => {
    const res = await middleware(buildRequest("/login"));

    expect(res.headers.get("location")).toBeNull();
  });
});
