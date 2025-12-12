import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const correctPin = process.env.APP_PIN || "1234";

    if (pin === correctPin) {
      // Create a session token (valid for 7 days)
      const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const token = btoa(JSON.stringify({ authenticated: true, expires }));

      const response = NextResponse.json({ success: true });

      // Set HTTP-only cookie
      response.cookies.set("duavault-auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid PIN" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
