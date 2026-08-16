import { NextRequest, NextResponse } from "next/server";
import { dbToApp, appToDb } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { fetchDuaTagsForOne } from "@/lib/dua-tags";
import { normalizeArabicText } from "@/lib/arabic-normalize";
import { findDuplicateMatch } from "@/lib/duplicate-detection";

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
      confirmDuplicate,
    } = body;

    if (!title || !arabicText || !translation) {
      return NextResponse.json(
        { message: "Title, Arabic text, and translation are required" },
        { status: 400 }
      );
    }

    const normalizedArabicText = normalizeArabicText(arabicText);

    if (!confirmDuplicate) {
      const match = await findDuplicateMatch(supabase, normalizedArabicText, id);
      if (match) {
        return NextResponse.json({ possibleDuplicate: match }, { status: 409 });
      }
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
        normalized_arabic_text: normalizedArabicText,
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

    const tags = await fetchDuaTagsForOne(supabase, id);

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
