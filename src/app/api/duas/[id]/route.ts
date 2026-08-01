import { NextRequest, NextResponse } from "next/server";
import { dbToApp, appToDb, dbTagToApp } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Helper to fetch tags for a dua
async function fetchTagsForDua(supabase: SupabaseClient, duaId: string) {
  const { data: duaTags, error } = await supabase
    .from("dua_tags")
    .select("tags(*)")
    .eq("dua_id", duaId);

  if (error) {
    console.error("Failed to fetch tags:", error);
    return [];
  }

  return duaTags?.map((dt) => dbTagToApp(dt.tags as any)).filter(Boolean) || [];
}

// GET - Fetch a single dua
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from("duas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ message: "Dua not found" }, { status: 404 });
      }
      throw error;
    }

    const tags = await fetchTagsForDua(supabase, id);

    return NextResponse.json({ ...dbToApp(data), tags });
  } catch (error) {
    console.error("Failed to fetch dua:", error);
    return NextResponse.json(
      { message: "Failed to fetch dua" },
      { status: 500 }
    );
  }
}

// PUT - Update a dua
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
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
      .update({
        ...appToDb({
          title,
          arabicText,
          translation,
          transliteration,
          description,
          source,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Update tags: delete existing and insert new ones
    if (tagIds !== undefined) {
      // Delete existing dua_tags
      await supabase.from("dua_tags").delete().eq("dua_id", id);

      // Insert new dua_tags
      if (tagIds.length > 0) {
        const duaTagRecords = tagIds.map((tagId: string) => ({
          dua_id: id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from("dua_tags")
          .insert(duaTagRecords);

        if (tagError) {
          console.error("Failed to update dua_tags:", tagError);
        }
      }
    }

    const tags = await fetchTagsForDua(supabase, id);

    return NextResponse.json({ ...dbToApp(data), tags });
  } catch (error) {
    console.error("Failed to update dua:", error);
    return NextResponse.json(
      { message: "Failed to update dua" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a dua
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Delete dua_tags first (foreign key constraint)
    await supabase.from("dua_tags").delete().eq("dua_id", id);

    const { error } = await supabase.from("duas").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete dua:", error);
    return NextResponse.json(
      { message: "Failed to delete dua" },
      { status: 500 }
    );
  }
}
