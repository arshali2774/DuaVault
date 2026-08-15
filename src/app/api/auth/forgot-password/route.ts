import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { buildSiteUrl, parseJsonBody } from "@/lib/auth-request";

export async function POST(request: NextRequest) {
  const result = await parseJsonBody<{ email: string }>(request);
  if ("error" in result) {
    return result.error;
  }
  const { email } = result.data;

  try {
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const redirectTo = buildSiteUrl("/reset-password", request);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
