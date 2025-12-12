import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface ImportDua {
  title: string;
  arabicText: string;
  translation: string;
  transliteration?: string | null;
  description?: string | null;
  source?: string | null;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  nextReviewDate?: string | null;
}

interface ImportData {
  version?: string;
  duas: ImportDua[];
}

// POST - Import duas from JSON
export async function POST(request: NextRequest) {
  try {
    const body: ImportData = await request.json();

    if (!body.duas || !Array.isArray(body.duas)) {
      return NextResponse.json(
        { message: "Invalid import format. Expected { duas: [...] }" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const dua of body.duas) {
      try {
        // Validate required fields
        if (!dua.title || !dua.arabicText || !dua.translation) {
          results.skipped++;
          results.errors.push(`Skipped dua: missing required fields`);
          continue;
        }

        // Check for duplicate by title and Arabic text
        const { data: existing } = await supabase
          .from("duas")
          .select("id")
          .eq("title", dua.title)
          .eq("arabic_text", dua.arabicText)
          .single();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create new dua
        const { error } = await supabase.from("duas").insert([
          {
            title: dua.title,
            arabic_text: dua.arabicText,
            translation: dua.translation,
            transliteration: dua.transliteration || null,
            description: dua.description || null,
            source: dua.source || null,
            ease_factor: dua.easeFactor || 2.5,
            interval: dua.interval || 0,
            repetitions: dua.repetitions || 0,
            next_review_date: dua.nextReviewDate || null,
          },
        ]);

        if (error) throw error;

        results.imported++;
      } catch (error) {
        results.errors.push(`Failed to import "${dua.title}": ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Failed to import duas:", error);
    return NextResponse.json(
      {
        message: "Failed to import duas. Make sure the JSON format is correct.",
      },
      { status: 500 }
    );
  }
}
