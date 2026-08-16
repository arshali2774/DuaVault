import type { SupabaseClient } from "@supabase/supabase-js";

// Shape returned to the client when a possible duplicate is found — just
// enough to render the warning (title/text/translation) and link to the
// full entry. Never includes normalized_arabic_text or owner_id.
export interface PossibleDuplicateMatch {
  id: string;
  title: string;
  arabicText: string;
  translation: string;
}

// Looks up an existing dua owned by the caller (enforced by RLS on the
// per-request client, not by an explicit owner_id filter here) whose
// normalized_arabic_text matches. excludeId lets the edit flow skip
// matching a dua against itself. Returns null on no match.
export async function findDuplicateMatch(
  supabase: SupabaseClient,
  normalizedArabicText: string,
  excludeId?: string
): Promise<PossibleDuplicateMatch | null> {
  let query = supabase
    .from("duas")
    .select("id, title, arabic_text, translation")
    .eq("normalized_arabic_text", normalizedArabicText)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    arabicText: data.arabic_text,
    translation: data.translation,
  };
}
