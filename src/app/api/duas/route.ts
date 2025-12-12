import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToApp, appToDb, dbTagToApp } from "@/lib/supabase";

const PAGE_SIZE = 20;

// Helper to fetch tags for duas
async function fetchTagsForDuas(duaIds: string[]) {
  if (duaIds.length === 0) return {};

  const { data: duaTags, error } = await supabase
    .from("dua_tags")
    .select("dua_id, tags(*)")
    .in("dua_id", duaIds);

  if (error) {
    console.error("Failed to fetch tags:", error);
    return {};
  }

  // Group tags by dua_id
  const tagsByDuaId: Record<string, any[]> = {};
  for (const dt of duaTags || []) {
    if (!tagsByDuaId[dt.dua_id]) {
      tagsByDuaId[dt.dua_id] = [];
    }
    if (dt.tags) {
      // dt.tags is the joined tag object
      tagsByDuaId[dt.dua_id].push(dbTagToApp(dt.tags as any));
    }
  }
  return tagsByDuaId;
}

// GET - Fetch duas with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE));
    const all = searchParams.get("all") === "true"; // For search - fetch all
    const tag = searchParams.get("tag"); // Filter by tag name

    // If all=true, fetch everything (for client-side search)
    if (all) {
      let query = supabase
        .from("duas")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Fetch tags for all duas
      const duaIds = data?.map((d) => d.id) || [];
      const tagsByDuaId = await fetchTagsForDuas(duaIds);

      const duas =
        data?.map((d) => ({
          ...dbToApp(d),
          tags: tagsByDuaId[d.id] || [],
        })) || [];

      // Filter by tag if specified
      const filteredDuas = tag
        ? duas.filter((d) => d.tags?.some((t: any) => t.name === tag))
        : duas;

      return NextResponse.json({
        duas: filteredDuas,
        nextOffset: null,
        hasMore: false,
      });
    }

    // Build query with pagination using offset
    const { data, error } = await supabase
      .from("duas")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1 + 1); // Fetch limit + 1 to check if there are more

    if (error) throw error;

    // Check if there are more items (we fetched limit + 1)
    const hasMore = data && data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data || [];
    const nextOffset = hasMore ? offset + limit : null;

    // Fetch tags for these duas
    const duaIds = items.map((d) => d.id);
    const tagsByDuaId = await fetchTagsForDuas(duaIds);

    // Convert snake_case to camelCase and add tags
    const duas = items.map((d) => ({
      ...dbToApp(d),
      tags: tagsByDuaId[d.id] || [],
    }));

    return NextResponse.json({
      duas,
      nextOffset,
      hasMore,
    });
  } catch (error) {
    console.error("Failed to fetch duas:", error);
    return NextResponse.json(
      { message: "Failed to fetch duas" },
      { status: 500 }
    );
  }
}

// POST - Create a new dua
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      arabicText,
      translation,
      transliteration,
      description,
      source,
      tagIds,
    } = body;

    if (!title || !arabicText || !translation) {
      return NextResponse.json(
        { message: "Title, Arabic text, and translation are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("duas")
      .insert([
        appToDb({
          title,
          arabicText,
          translation,
          transliteration,
          description,
          source,
        }),
      ])
      .select()
      .single();

    if (error) throw error;

    // Insert dua_tags if tagIds provided
    if (tagIds && tagIds.length > 0) {
      const duaTagRecords = tagIds.map((tagId: string) => ({
        dua_id: data.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("dua_tags")
        .insert(duaTagRecords);

      if (tagError) {
        console.error("Failed to insert dua_tags:", tagError);
      }
    }

    // Fetch the tags for this dua
    const tagsByDuaId = await fetchTagsForDuas([data.id]);

    return NextResponse.json(
      { ...dbToApp(data), tags: tagsByDuaId[data.id] || [] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create dua:", error);
    return NextResponse.json(
      { message: "Failed to create dua" },
      { status: 500 }
    );
  }
}
