import Fuse, { IFuseOptions } from "fuse.js";
import type { Dua } from "@/lib/supabase";

// Normalize text for phonetic search
// This handles common transliteration variations
export function normalizeForSearch(text: string): string {
  return (
    text
      .toLowerCase()
      // Common Arabic transliteration variations
      .replace(/[āàáâãä]/g, "a")
      .replace(/[īìíîĩï]/g, "i")
      .replace(/[ūùúûũü]/g, "u")
      .replace(/[ēèéêë]/g, "e")
      .replace(/[ōòóôõö]/g, "o")
      // Handle common letter combinations
      .replace(/dh/g, "z")
      .replace(/th/g, "s")
      .replace(/kh/g, "k")
      .replace(/gh/g, "g")
      .replace(/sh/g, "s")
      .replace(/ph/g, "f")
      // Remove special characters often used in transliteration
      .replace(/['`'ʿʾ]/g, "")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

export type DuaSearchItem = Dua & {
  normalizedTransliteration?: string;
  normalizedTranslation?: string;
};

// Create Fuse instance for searching duas
export function createDuaSearcher(duas: Dua[]) {
  // Add normalized fields for better phonetic matching
  const duasWithNormalized: DuaSearchItem[] = duas.map((dua) => ({
    ...dua,
    normalizedTransliteration: dua.transliteration
      ? normalizeForSearch(dua.transliteration)
      : undefined,
    normalizedTranslation: normalizeForSearch(dua.translation),
  }));

  const fuseOptions: IFuseOptions<DuaSearchItem> = {
    keys: [
      { name: "title", weight: 2 },
      { name: "arabicText", weight: 1.5 },
      { name: "translation", weight: 1.5 },
      { name: "transliteration", weight: 2 },
      { name: "normalizedTransliteration", weight: 2 },
      { name: "normalizedTranslation", weight: 1 },
      { name: "description", weight: 1 },
      { name: "source", weight: 0.5 },
    ],
    threshold: 0.4, // Lower = stricter matching
    distance: 100,
    ignoreLocation: true,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
  };

  return new Fuse(duasWithNormalized, fuseOptions);
}

// Query an already-built Fuse index for a non-empty query. Building the
// index (createDuaSearcher) is the expensive step — callers on a hot path
// (e.g. per-keystroke search) should memoize it separately and only call
// this per query. Callers are responsible for the empty-query case (return
// the unfiltered pool directly — there's nothing for Fuse to do there).
export function queryDuaSearcher(
  fuse: Fuse<DuaSearchItem>,
  query: string
): Dua[] {
  const normalizedQuery = normalizeForSearch(query);

  // Search with both original and normalized query
  const results = fuse.search(query);
  const normalizedResults = fuse.search(normalizedQuery);

  // Combine and deduplicate results
  const seenIds = new Set<string>();
  const combinedResults: Dua[] = [];

  [...results, ...normalizedResults].forEach((result) => {
    if (!seenIds.has(result.item.id)) {
      seenIds.add(result.item.id);
      // Return original dua without normalized fields
      const { normalizedTransliteration, normalizedTranslation, ...dua } =
        result.item;
      combinedResults.push(dua as Dua);
    }
  });

  return combinedResults;
}
