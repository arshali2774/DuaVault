import { NextResponse } from "next/server";
import { dbToApp } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";

// GET - Export all duas as JSON
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("duas")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const duas = data?.map(dbToApp) || [];

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      duas: duas.map(({ id, createdAt, updatedAt, ...dua }) => ({
        ...dua,
        _originalId: id,
      })),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Failed to export duas:", error);
    return NextResponse.json(
      { message: "Failed to export duas" },
      { status: 500 }
    );
  }
}
