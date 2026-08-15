import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { parseJsonBody } from "@/lib/auth-request";

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.code === "email_not_confirmed") {
        return NextResponse.json(
          { error: "Please verify your email before signing in." },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
