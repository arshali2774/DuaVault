import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  apiPost,
  createConfirmedUser,
  deleteUser,
  getServiceClient,
  loginAsTestUser,
  type CookieJar,
  type TestUser,
} from "./helpers";

interface DuaPayload {
  title: string;
  arabicText: string;
  translation: string;
  transliteration?: string;
  confirmDuplicate?: boolean;
}

interface PossibleDuplicateBody {
  possibleDuplicate: {
    id: string;
    title: string;
    arabicText: string;
    translation: string;
  };
}

function createDua(jar: CookieJar, payload: DuaPayload) {
  return apiPost<PossibleDuplicateBody & { id: string }>("/api/duas", payload, jar);
}

describe("POST /api/duas duplicate detection", () => {
  let owner: TestUser;
  let jar: CookieJar;

  beforeAll(async () => {
    owner = await createConfirmedUser("add");
    jar = await loginAsTestUser(owner);
  });

  afterAll(async () => {
    await deleteUser(owner.id);
  });

  it("creates a dua when no matching dua exists", async () => {
    const res = await createDua(jar, {
      title: "Dua for Anxiety",
      arabicText: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ",
      translation: "O Allah, I seek refuge in You from anxiety.",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it("returns 409 with the matched dua when Arabic text exactly matches an existing dua", async () => {
    const arabicText = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";
    const first = await createDua(jar, {
      title: "Basmala",
      arabicText,
      translation: "In the name of Allah, the Most Gracious, the Most Merciful.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: "A totally different title",
      arabicText,
      translation: "A totally different translation.",
    });

    expect(second.status).toBe(409);
    expect(second.body.possibleDuplicate.id).toBe(first.body.id);
    expect(second.body.possibleDuplicate.title).toBe("Basmala");
  });

  it("still flags a duplicate when the only difference is diacritics", async () => {
    const first = await createDua(jar, {
      title: "Diacritics variant A",
      arabicText: "رَبِّ اشْرَحْ لِي صَدْرِي",
      translation: "My Lord, expand for me my breast.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: "Diacritics variant B",
      arabicText: "رب اشرح لي صدري", // same letters, no diacritics
      translation: "My Lord, expand for me my breast (different wording).",
    });

    expect(second.status).toBe(409);
    expect(second.body.possibleDuplicate.id).toBe(first.body.id);
  });

  it("still flags a duplicate across alef/teh-marbuta/alef-maksura letter variants", async () => {
    const first = await createDua(jar, {
      title: "Letter variant A",
      arabicText: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ", // hamza-above alef, teh marbuta
      translation: "I seek refuge in the perfect words of Allah.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: "Letter variant B",
      arabicText: "اعوذ بكلمات الله التامه", // bare alef, heh instead of teh marbuta
      translation: "Different wording, same dua.",
    });

    expect(second.status).toBe(409);
    expect(second.body.possibleDuplicate.id).toBe(first.body.id);
  });

  it("does not flag a duplicate when the Arabic text genuinely differs, even with the same title/translation", async () => {
    const sharedTitle = "Shared title on purpose";
    const first = await createDua(jar, {
      title: sharedTitle,
      arabicText: "سُبْحَانَ اللَّهِ",
      translation: "Glory be to Allah.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: sharedTitle,
      arabicText: "الْحَمْدُ لِلَّهِ",
      translation: "Glory be to Allah.",
    });

    expect(second.status).toBe(201);
  });

  it("inserts anyway when confirmDuplicate is true, despite a match", async () => {
    const arabicText = "اللَّهُمَّ بَارِكْ لَنَا";
    const first = await createDua(jar, {
      title: "Blessing A",
      arabicText,
      translation: "O Allah, bless us.",
    });
    expect(first.status).toBe(201);

    const second = await createDua(jar, {
      title: "Blessing B (intentional duplicate)",
      arabicText,
      translation: "O Allah, bless us (again, on purpose).",
      confirmDuplicate: true,
    });

    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it("stores normalized_arabic_text on the inserted row", async () => {
    const res = await createDua(jar, {
      title: "Normalization storage check",
      arabicText: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً",
      translation: "Our Lord, give us good in this world.",
    });
    expect(res.status).toBe(201);

    const admin = getServiceClient();
    const { data, error } = await admin
      .from("duas")
      .select("normalized_arabic_text")
      .eq("id", res.body.id)
      .single();

    expect(error).toBeNull();
    expect(data?.normalized_arabic_text).toBe("ربنا اتنا في الدنيا حسنه");
  });

  it("does not trigger a duplicate warning across different accounts", async () => {
    const arabicText = "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ";
    const first = await createDua(jar, {
      title: "Owner A's dua",
      arabicText,
      translation: "Allah is sufficient for us, and He is the best disposer of affairs.",
    });
    expect(first.status).toBe(201);

    const otherOwner = await createConfirmedUser("add-other");
    try {
      const otherJar = await loginAsTestUser(otherOwner);
      const res = await createDua(otherJar, {
        title: "Owner B's dua, same Arabic text",
        arabicText,
        translation: "Allah is sufficient for us, and He is the best disposer of affairs.",
      });
      expect(res.status).toBe(201);
    } finally {
      await deleteUser(otherOwner.id);
    }
  });
});
