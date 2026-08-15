import type { SupabaseClient } from "@supabase/supabase-js";
import { dbToApp, type DbDua, type Dua } from "@/lib/supabase";
import { fetchDuaTagsForOne } from "@/lib/dua-tags";

// The one query for "fetch a single Dua, with its Tags" — every caller
// (Dua detail page, edit page) wants both, every time.
export async function fetchDuaWithTags(
  supabase: SupabaseClient,
  id: string
): Promise<Dua | null> {
  const { data, error } = await supabase
    .from("duas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const tags = await fetchDuaTagsForOne(supabase, id);
  return { ...dbToApp(data as DbDua), tags };
}
