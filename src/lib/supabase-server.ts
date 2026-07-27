import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Builds a fresh Supabase client for the current request, backed by this
// request's cookies. Every route that needs `auth.uid()` to resolve
// correctly (for RLS) must call this instead of importing the shared
// module-level client from `@/lib/supabase`.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — safe to ignore since
            // middleware (once it manages Supabase sessions) refreshes cookies.
          }
        },
      },
    }
  );
}
