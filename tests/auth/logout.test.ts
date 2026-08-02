import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  apiGetNoRedirect,
  apiPost,
  createConfirmedUser,
  deleteUser,
  CookieJar,
  type TestUser,
} from "./helpers";

describe("POST /api/auth/logout", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createConfirmedUser("logout");
  });

  afterAll(async () => {
    await deleteUser(user.id);
  });

  it("actually clears the session, not just returning success", async () => {
    const jar = new CookieJar();

    const login = await apiPost("/api/auth/login", {
      email: user.email,
      password: user.password,
    }, jar);
    expect(login.status).toBe(200);

    const beforeLogout = await apiGetNoRedirect("/api/duas", jar);
    expect(beforeLogout.status).toBe(200);

    const logout = await apiPost("/api/auth/logout", {}, jar);
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ success: true });

    const afterLogout = await apiGetNoRedirect("/api/duas", jar);
    expect(afterLogout.status).toBe(307);
    expect(afterLogout.headers.get("location")).toContain("/login");
  });
});
