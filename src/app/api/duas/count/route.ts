import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET - Fetch total count of duas
export async function GET() {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("duas")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error("Failed to fetch duas count:", error);
    return NextResponse.json(
      { message: "Failed to fetch count" },
      { status: 500 }
    );
  }
}
