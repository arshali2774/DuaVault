import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json(
        { error: "Missing reset code or password" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // exchangeCodeForSession consumes the PKCE code verifier cookie set when
    // resetPasswordForEmail was called from this same browser, so an
    // invalid/expired/already-used reset link fails here with a clear error.
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
