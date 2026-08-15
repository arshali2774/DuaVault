import type { SupabaseClient } from "@supabase/supabase-js";
import { dbTagToApp, type DbTag, type Tag } from "@/lib/supabase";

// The one query for "which Tags does this Dua have" — every caller (list,
// single-dua GET/PUT, detail page, edit page) goes through this.
export async function fetchDuaTags(
  supabase: SupabaseClient,
  duaIds: string[]
): Promise<Record<string, Tag[]>> {
  if (duaIds.length === 0) return {};

  const { data: duaTags, error } = await supabase
    .from("dua_tags")
    .select("dua_id, tags(*)")
    .in("dua_id", duaIds);

  if (error) {
    console.error("Failed to fetch tags:", error);
    return {};
  }

  const tagsByDuaId: Record<string, Tag[]> = {};
  for (const dt of duaTags || []) {
    if (!dt.tags) continue;
    (tagsByDuaId[dt.dua_id] ??= []).push(dbTagToApp(dt.tags as unknown as DbTag));
  }
  return tagsByDuaId;
}

export async function fetchDuaTagsForOne(
  supabase: SupabaseClient,
  duaId: string
): Promise<Tag[]> {
  const tagsByDuaId = await fetchDuaTags(supabase, [duaId]);
  return tagsByDuaId[duaId] ?? [];
}

// Tags are stored lowercase (see src/app/api/tags/route.ts) — capitalize
// the first letter for display.
export function formatTagName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
