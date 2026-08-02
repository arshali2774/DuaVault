import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    // Derive from a fixed site-origin env var rather than request.url: the
    // incoming Host header isn't guaranteed to match an entry in Supabase's
    // redirect allow-list (e.g. Next's dev proxy rewrites it to localhost
    // regardless of the host actually requested), which would silently
    // bounce the email link to the site root instead of /reset-password.
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const redirectTo = new URL("/reset-password", siteOrigin).toString();

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
