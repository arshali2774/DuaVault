import { parseLocalSupabaseEnv } from "../support/parse-local-supabase-env";

// Pulls connection info for the locally-running Supabase CLI instance
// (`supabase start`) and exposes it to every test via process.env, rather
// than hardcoding local keys/ports in the suite. Fails fast with a clear
// message if the local stack isn't up.
export default function setup() {
  parseLocalSupabaseEnv("RLS_TEST_", ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]);
}
