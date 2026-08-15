import { NextRequest, NextResponse } from "next/server";

export async function parseJsonBody<T>(
  request: NextRequest
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    return { data: (await request.json()) as T };
  } catch {
    return { error: NextResponse.json({ error: "Invalid request" }, { status: 400 }) };
  }
}

export function buildSiteUrl(path: string, request: NextRequest): string {
  // Derive from a fixed site-origin env var rather than request.url: the
  // incoming Host header isn't guaranteed to match an entry in Supabase's
  // redirect allow-list (e.g. Next's dev proxy rewrites it to localhost
  // regardless of the host actually requested), which would silently
  // bounce the email link to the wrong path.
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return new URL(path, siteOrigin).toString();
}
