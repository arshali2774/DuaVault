import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, getServiceClient, seedDua, type TestUser } from "./helpers";

describe("RLS: owner_id auto-fill and spoof-resistance", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await createTestUser("owner-id-a");
    userB = await createTestUser("owner-id-b");
  });

  afterAll(async () => {
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it("auto-fills owner_id from auth.uid() when the client omits it", async () => {
    const { data, error } = await userA.client
      .from("duas")
      .insert({
        title: "No owner_id supplied",
        arabic_text: "arabic",
        translation: "translation",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.owner_id).toBe(userA.id);
  });

  it("rejects a spoofed owner_id on INSERT: A cannot create a dua owned by B", async () => {
    const { data, error } = await userA.client
      .from("duas")
      .insert({
        title: "Spoofed owner on insert",
        arabic_text: "arabic",
        translation: "translation",
        owner_id: userB.id,
      })
      .select();

    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
    expect(data).toBeNull();

    const admin = getServiceClient();
    const { data: truth } = await admin
      .from("duas")
      .select("*")
      .eq("title", "Spoofed owner on insert");
    expect(truth).toEqual([]);
  });

  it("rejects reassigning owner_id on UPDATE: A cannot hand their own dua to B", async () => {
    const dua = await seedDua(userA.id, { title: "A's dua, attempted handoff" });

    const { data, error } = await userA.client
      .from("duas")
      .update({ owner_id: userB.id })
      .eq("id", dua.id)
      .select();

    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
    expect(data).toBeNull();

    const admin = getServiceClient();
    const { data: truth } = await admin
      .from("duas")
      .select("owner_id")
      .eq("id", dua.id)
      .single();
    expect(truth!.owner_id).toBe(userA.id);
  });
});
