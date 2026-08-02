import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  getServiceClient,
  seedDua,
  type SeededDua,
  type TestUser,
} from "./helpers";

describe("RLS: duas ownership boundary", () => {
  let userA: TestUser;
  let userB: TestUser;
  let duaOwnedByA: SeededDua;

  beforeAll(async () => {
    userA = await createTestUser("duas-a");
    userB = await createTestUser("duas-b");
  });

  afterAll(async () => {
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  // Re-seeded before every test so update/delete attempts in earlier tests
  // (which should no-op, but we're testing that they no-op) never affect
  // a later test's fixture.
  beforeEach(async () => {
    duaOwnedByA = await seedDua(userA.id, { title: "A's original title" });
  });

  it("lets A read their own dua (sanity check the setup itself works)", async () => {
    const { data, error } = await userA.client
      .from("duas")
      .select("*")
      .eq("id", duaOwnedByA.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(duaOwnedByA.id);
  });

  it("rejects cross-account SELECT: B cannot read A's dua", async () => {
    const { data, error } = await userB.client
      .from("duas")
      .select("*")
      .eq("id", duaOwnedByA.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("rejects cross-account UPDATE: B's write to A's dua is a no-op", async () => {
    const { data, error } = await userB.client
      .from("duas")
      .update({ title: "hijacked by B" })
      .eq("id", duaOwnedByA.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const admin = getServiceClient();
    const { data: truth } = await admin
      .from("duas")
      .select("title")
      .eq("id", duaOwnedByA.id)
      .single();
    expect(truth!.title).toBe("A's original title");
  });

  it("rejects cross-account DELETE: B's delete of A's dua is a no-op", async () => {
    const { data, error } = await userB.client
      .from("duas")
      .delete()
      .eq("id", duaOwnedByA.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const admin = getServiceClient();
    const { data: truth, error: truthError } = await admin
      .from("duas")
      .select("id")
      .eq("id", duaOwnedByA.id)
      .single();
    expect(truthError).toBeNull();
    expect(truth!.id).toBe(duaOwnedByA.id);
  });
});
