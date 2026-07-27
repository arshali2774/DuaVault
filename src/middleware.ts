import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/unlock", "/api/auth/verify", "/signup", "/api/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and API routes that need auth will handle it themselves
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("duavault-auth");

  if (!authCookie?.value) {
    // Redirect to unlock page
    const unlockUrl = new URL("/unlock", request.url);
    unlockUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(unlockUrl);
  }

  // Verify the session token (simple check - the token should match our expected format)
  try {
    const tokenData = JSON.parse(atob(authCookie.value));
    const isValid =
      tokenData.authenticated === true && tokenData.expires > Date.now();

    if (!isValid) {
      const unlockUrl = new URL("/unlock", request.url);
      unlockUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(unlockUrl);
    }
  } catch {
    // Invalid token format
    const unlockUrl = new URL("/unlock", request.url);
    unlockUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(unlockUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
