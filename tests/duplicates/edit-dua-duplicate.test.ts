import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createConfirmedUser,
  createDua,
  deleteUser,
  editDua,
  getServiceClient,
  loginAsTestUser,
  type CookieJar,
  type TestUser,
} from "./helpers";

describe("PUT /api/duas/[id] duplicate detection", () => {
  let owner: TestUser;
  let jar: CookieJar;

  beforeAll(async () => {
    owner = await createConfirmedUser("edit");
    jar = await loginAsTestUser(owner);
  });

  afterAll(async () => {
    await deleteUser(owner.id);
  });

  it("returns 409 with the matched dua when editing into another dua's Arabic text", async () => {
    const first = await createDua(jar, {
      title: "Dua A",
      arabicText: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      translation: "Glory be to Allah and praise Him.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: "Dua B",
      arabicText: "لَا إِلَهَ إِلَّا اللَّهُ",
      translation: "There is no god but Allah.",
    });
    expect(second.status).toBe(201);

    const edit = await editDua(jar, second.body.id, {
      title: "Dua B (edited)",
      arabicText: "سبحان الله وبحمده", // now matches Dua A, no diacritics
      translation: "A different translation entirely.",
    });

    expect(edit.status).toBe(409);
    expect(edit.body.possibleDuplicate).toEqual({
      id: first.body.id,
      title: "Dua A",
      arabicText: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
      translation: "Glory be to Allah and praise Him.",
    });
  });

  it("saves anyway when confirmDuplicate is true, despite a match", async () => {
    const first = await createDua(jar, {
      title: "Dua C",
      arabicText: "اللَّهُ أَكْبَرُ",
      translation: "Allah is the greatest.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: "Dua D",
      arabicText: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      translation: "All praise is due to Allah, Lord of the worlds.",
    });
    expect(second.status).toBe(201);

    const editPayload = {
      title: "Dua D (intentional duplicate)",
      arabicText: "الله اكبر",
      translation: "Allah is the greatest (again, on purpose).",
    };

    // Prove this would 409 without the flag, so the override assertion
    // below is actually testing a bypass and not a no-op.
    const withoutConfirm = await editDua(jar, second.body.id, editPayload);
    expect(withoutConfirm.status).toBe(409);

    const edit = await editDua(jar, second.body.id, {
      ...editPayload,
      confirmDuplicate: true,
    });

    expect(edit.status).toBe(200);
    expect(edit.body.id).toBe(second.body.id);
  });

  it("never flags a dua as a duplicate of itself when its Arabic text is unchanged", async () => {
    const created = await createDua(jar, {
      title: "Dua E",
      arabicText: "رَبِّ زِدْنِي عِلْمًا",
      translation: "My Lord, increase me in knowledge.",
    });
    expect(created.status).toBe(201);

    const edit = await editDua(jar, created.body.id, {
      title: "Dua E (title changed only)",
      arabicText: "رَبِّ زِدْنِي عِلْمًا",
      translation: "My Lord, increase me in knowledge.",
    });

    expect(edit.status).toBe(200);
  });

  it("recomputes and stores normalized_arabic_text when arabic_text is updated", async () => {
    const created = await createDua(jar, {
      title: "Dua F",
      arabicText: "حَسْبِيَ اللَّهُ",
      translation: "Allah is sufficient for me.",
    });
    expect(created.status).toBe(201);

    const edit = await editDua(jar, created.body.id, {
      title: "Dua F (edited)",
      arabicText: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً",
      translation: "Our Lord, give us good in this world.",
    });
    expect(edit.status).toBe(200);

    const admin = getServiceClient();
    const { data, error } = await admin
      .from("duas")
      .select("normalized_arabic_text")
      .eq("id", created.body.id)
      .single();

    expect(error).toBeNull();
    expect(data?.normalized_arabic_text).toBe("ربنا اتنا في الدنيا حسنه");
  });
});
