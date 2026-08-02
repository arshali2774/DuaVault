import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, seedTag, type TestUser } from "./helpers";

// tags is a deliberately shared, global vocabulary — the RLS migration
// only defines select/insert policies for it (no per-owner scoping, and no
// update/delete policy at all since the app has no such path). See that
// migration's header comment.
describe("RLS: tags stay global and unscoped", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await createTestUser("tags-a");
    userB = await createTestUser("tags-b");
  });

  afterAll(async () => {
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it("lets B read a tag created by A (no owner scoping)", async () => {
    const tag = await seedTag(`rls-test-tag-${crypto.randomUUID()}`);

    const { data, error } = await userB.client.from("tags").select("*").eq("id", tag.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe(tag.name);
  });

  it("lets any authenticated user insert a new tag", async () => {
    const name = `rls-test-tag-${crypto.randomUUID()}`;

    const { data, error } = await userB.client
      .from("tags")
      .insert({ name })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.name).toBe(name);
  });

  it("lets A read a tag B just created (global vocabulary, not per-creator)", async () => {
    const name = `rls-test-tag-${crypto.randomUUID()}`;
    const { data: created } = await userB.client.from("tags").insert({ name }).select().single();

    const { data, error } = await userA.client.from("tags").select("*").eq("id", created!.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
