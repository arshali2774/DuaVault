import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  apiPost,
  createConfirmedUser,
  deleteUser,
  extractVerifyLink,
  followVerifyLink,
  waitForMailTo,
  CookieJar,
  type TestUser,
} from "./helpers";

describe("Password reset flow", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createConfirmedUser("reset");
  });

  afterAll(async () => {
    await deleteUser(user.id);
  });

  it("request triggers a reset email, and a valid token allows setting a new password", async () => {
    // The PKCE code-verifier cookie forgot-password sets must be replayed
    // on reset-password for exchangeCodeForSession to succeed — same jar
    // across both calls, mirroring what a real browser would do.
    const jar = new CookieJar();

    const forgot = await apiPost("/api/auth/forgot-password", { email: user.email }, jar);
    expect(forgot.status).toBe(200);
    expect(forgot.body).toEqual({ success: true });

    const mailText = await waitForMailTo(user.email, { subjectContains: "Reset" });
    const verifyLink = extractVerifyLink(mailText);
    expect(verifyLink).toContain("type=recovery");

    const code = await followVerifyLink(verifyLink);
    expect(code).toBeTruthy();

    const newPassword = "new-password-456";
    const reset = await apiPost("/api/auth/reset-password", { code, password: newPassword }, jar);
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ success: true });

    const loginWithNewPassword = await apiPost("/api/auth/login", {
      email: user.email,
      password: newPassword,
    });
    expect(loginWithNewPassword.status).toBe(200);

    const loginWithOldPassword = await apiPost("/api/auth/login", {
      email: user.email,
      password: user.password,
    });
    expect(loginWithOldPassword.status).toBe(401);
  });

  it("rejects an invalid/expired reset code", async () => {
    const jar = new CookieJar();
    const res = await apiPost(
      "/api/auth/reset-password",
      { code: "not-a-real-code", password: "irrelevant-password" },
      jar
    );
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "This reset link is invalid or has expired. Please request a new one.",
    });
  });
});
