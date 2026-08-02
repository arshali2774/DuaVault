import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Same fixed site-origin-over-request.url rationale as forgot-password/route.ts.
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const emailRedirectTo = new URL("/login", siteOrigin).toString();

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
