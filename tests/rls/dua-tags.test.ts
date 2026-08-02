import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  getServiceClient,
  seedDua,
  seedDuaTag,
  seedTag,
  type SeededDua,
  type TestUser,
} from "./helpers";

// dua_tags has no owner column of its own — ownership is resolved by
// joining back to the parent dua on every policy check (see the RLS
// migration's comment). These tests exercise that join, not a direct
// owner_id column.
describe("RLS: dua_tags ownership boundary (via parent dua)", () => {
  let userA: TestUser;
  let userB: TestUser;
  let duaOwnedByA: SeededDua;
  let tag: { id: string; name: string };

  beforeAll(async () => {
    userA = await createTestUser("dua-tags-a");
    userB = await createTestUser("dua-tags-b");
    tag = await seedTag(`rls-test-tag-${crypto.randomUUID()}`);
  });

  afterAll(async () => {
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  beforeEach(async () => {
    duaOwnedByA = await seedDua(userA.id, { title: "A's tagged dua" });
    await seedDuaTag(duaOwnedByA.id, tag.id);
  });

  it("lets A read the dua_tags link for their own dua", async () => {
    const { data, error } = await userA.client
      .from("dua_tags")
      .select("*")
      .eq("dua_id", duaOwnedByA.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("rejects cross-account SELECT: B cannot see the dua_tags link for A's dua", async () => {
    const { data, error } = await userB.client
      .from("dua_tags")
      .select("*")
      .eq("dua_id", duaOwnedByA.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("rejects cross-account INSERT: B cannot attach a tag to A's dua", async () => {
    const otherTag = await seedTag(`rls-test-tag-${crypto.randomUUID()}`);

    const { error } = await userB.client
      .from("dua_tags")
      .insert({ dua_id: duaOwnedByA.id, tag_id: otherTag.id });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");

    const admin = getServiceClient();
    const { data: truth } = await admin
      .from("dua_tags")
      .select("*")
      .eq("dua_id", duaOwnedByA.id)
      .eq("tag_id", otherTag.id);
    expect(truth).toEqual([]);
  });

  it("rejects UPDATE from anyone, including the owner: dua_tags has no update policy", async () => {
    // Not cross-account specifically — the RLS migration defines no UPDATE
    // policy for dua_tags at all (the app has no update path), so this is
    // default-deny for every caller. Exercising it with the owning user
    // (A) proves that's really the case, not just that B is scoped out.
    const otherTag = await seedTag(`rls-test-tag-${crypto.randomUUID()}`);

    const { data, error } = await userA.client
      .from("dua_tags")
      .update({ tag_id: otherTag.id })
      .eq("dua_id", duaOwnedByA.id)
      .eq("tag_id", tag.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const admin = getServiceClient();
    const { data: truth } = await admin
      .from("dua_tags")
      .select("*")
      .eq("dua_id", duaOwnedByA.id)
      .eq("tag_id", tag.id);
    expect(truth).toHaveLength(1);
  });

  it("rejects cross-account DELETE: B's delete of A's dua_tags link is a no-op", async () => {
    const { data, error } = await userB.client
      .from("dua_tags")
      .delete()
      .eq("dua_id", duaOwnedByA.id)
      .eq("tag_id", tag.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const admin = getServiceClient();
    const { data: truth } = await admin
      .from("dua_tags")
      .select("*")
      .eq("dua_id", duaOwnedByA.id)
      .eq("tag_id", tag.id);
    expect(truth).toHaveLength(1);
  });
});
