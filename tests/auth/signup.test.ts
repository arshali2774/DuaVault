import { afterEach, describe, expect, it } from "vitest";
import {
  apiPost,
  CookieJar,
  deleteUser,
  extractVerifyLink,
  followVerifyLink,
  getUserIdFromSessionCookie,
  SIGNUP_TEST_PASSWORD,
  uniqueEmail,
  UNCONFIRMED_LOGIN_ERROR,
  waitForMailTo,
} from "./helpers";

describe("POST /api/auth/signup", () => {
  let createdUserId: string | undefined;

  afterEach(async () => {
    if (createdUserId) await deleteUser(createdUserId);
    createdUserId = undefined;
  });

  it("creates an account and triggers a verification email", async () => {
    const email = uniqueEmail("signup");

    const signup = await apiPost("/api/auth/signup", { email, password: SIGNUP_TEST_PASSWORD });
    expect(signup.status).toBe(200);
    expect(signup.body).toEqual({ success: true });

    // A generic "invalid credentials" here would mean no account exists;
    // "email not confirmed" specifically proves signup created one.
    const loginBeforeVerify = await apiPost("/api/auth/login", {
      email,
      password: SIGNUP_TEST_PASSWORD,
    });
    expect(loginBeforeVerify.status).toBe(401);
    expect(loginBeforeVerify.body).toEqual({ error: UNCONFIRMED_LOGIN_ERROR });

    const mailText = await waitForMailTo(email, { subjectContains: "Confirm" });
    const verifyLink = extractVerifyLink(mailText);
    expect(verifyLink).toContain("type=signup");

    await followVerifyLink(verifyLink);

    const jar = new CookieJar();
    const loginAfterVerify = await apiPost(
      "/api/auth/login",
      { email, password: SIGNUP_TEST_PASSWORD },
      jar
    );
    expect(loginAfterVerify.status).toBe(200);

    createdUserId = getUserIdFromSessionCookie(jar);
  });

  it("rejects a request missing email or password", async () => {
    const res = await apiPost("/api/auth/signup", { email: uniqueEmail("signup-missing-pw") });
    expect(res.status).toBe(400);
  });
});
