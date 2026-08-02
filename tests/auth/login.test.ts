import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  apiPost,
  CookieJar,
  createConfirmedUser,
  deleteUser,
  extractVerifyLink,
  followVerifyLink,
  getUserIdFromSessionCookie,
  SIGNUP_TEST_PASSWORD,
  uniqueEmail,
  UNCONFIRMED_LOGIN_ERROR,
  waitForMailTo,
  type TestUser,
} from "./helpers";

describe("POST /api/auth/login", () => {
  let confirmedUser: TestUser;

  beforeAll(async () => {
    confirmedUser = await createConfirmedUser("login");
  });

  afterAll(async () => {
    await deleteUser(confirmedUser.id);
  });

  it("logs in with correct credentials", async () => {
    const res = await apiPost("/api/auth/login", {
      email: confirmedUser.email,
      password: confirmedUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("rejects a wrong password", async () => {
    const res = await apiPost("/api/auth/login", {
      email: confirmedUser.email,
      password: "not-the-right-password",
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid login credentials" });
  });

  it("blocks login when the account isn't verified yet", async () => {
    const email = uniqueEmail("login-unverified");
    await apiPost("/api/auth/signup", { email, password: SIGNUP_TEST_PASSWORD });

    try {
      const res = await apiPost("/api/auth/login", { email, password: SIGNUP_TEST_PASSWORD });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: UNCONFIRMED_LOGIN_ERROR });
    } finally {
      // Verify + log in just to recover the user id for cleanup —
      // listUsers() isn't usable here, see getUserIdFromSessionCookie's
      // doc comment. Cleanup errors are logged, not thrown: this runs
      // whether the assertions above passed or failed, and a throw here
      // would replace — and hide — a genuine assertion failure.
      try {
        const mailText = await waitForMailTo(email, { subjectContains: "Confirm" });
        await followVerifyLink(extractVerifyLink(mailText));
        const jar = new CookieJar();
        await apiPost("/api/auth/login", { email, password: SIGNUP_TEST_PASSWORD }, jar);
        await deleteUser(getUserIdFromSessionCookie(jar));
      } catch (cleanupError) {
        console.error(`Cleanup failed for ${email}:`, cleanupError);
      }
    }
  });
});
