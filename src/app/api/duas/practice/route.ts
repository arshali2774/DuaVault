import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToApp } from "@/lib/supabase";
import {
  calculateNextReview,
  simpleQualityToNumber,
  type SimpleQuality,
} from "@/lib/spaced-repetition";

// GET - Get duas due for practice
export async function GET() {
  try {
    const now = new Date().toISOString();

    // Get duas that are due for review (next_review_date <= now or null)
    const { data, error } = await supabase
      .from("duas")
      .select("*")
      .or(`next_review_date.is.null,next_review_date.lte.${now}`)
      .order("next_review_date", { ascending: true, nullsFirst: true });

    if (error) throw error;

    const duas = data?.map(dbToApp) || [];

    return NextResponse.json(duas);
  } catch (error) {
    console.error("Failed to fetch practice duas:", error);
    return NextResponse.json(
      { message: "Failed to fetch practice duas" },
      { status: 500 }
    );
  }
}

// POST - Record practice result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duaId, quality } = body as {
      duaId: string;
      quality: SimpleQuality;
    };

    if (!duaId || !quality) {
      return NextResponse.json(
        { message: "duaId and quality are required" },
        { status: 400 }
      );
    }

    // Get current dua data
    const { data: dua, error: fetchError } = await supabase
      .from("duas")
      .select("*")
      .eq("id", duaId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ message: "Dua not found" }, { status: 404 });
      }
      throw fetchError;
    }

    // Calculate next review using SM-2 algorithm
    const numericQuality = simpleQualityToNumber(quality);
    const newData = calculateNextReview(
      {
        easeFactor: dua.ease_factor,
        interval: dua.interval,
        repetitions: dua.repetitions,
        nextReviewDate: dua.next_review_date
          ? new Date(dua.next_review_date)
          : null,
      },
      numericQuality
    );

    // Update dua with new spaced repetition data
    const { data: updatedDua, error: updateError } = await supabase
      .from("duas")
      .update({
        ease_factor: newData.easeFactor,
        interval: newData.interval,
        repetitions: newData.repetitions,
        next_review_date: newData.nextReviewDate?.toISOString() || null,
      })
      .eq("id", duaId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      dua: dbToApp(updatedDua),
      nextReview: newData.nextReviewDate,
      interval: newData.interval,
    });
  } catch (error) {
    console.error("Failed to record practice:", error);
    return NextResponse.json(
      { message: "Failed to record practice" },
      { status: 500 }
    );
  }
}
