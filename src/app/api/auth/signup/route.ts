import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { buildSiteUrl, parseJsonBody } from "@/lib/auth-request";

export async function POST(request: NextRequest) {
  const result = await parseJsonBody<{ email: string; password: string }>(
    request
  );
  if ("error" in result) {
    return result.error;
  }
  const { email, password } = result.data;

  try {
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const emailRedirectTo = buildSiteUrl("/login", request);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
