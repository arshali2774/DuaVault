import { parseLocalSupabaseEnv } from "../support/parse-local-supabase-env";

export default function setup() {
  parseLocalSupabaseEnv("MW_TEST_", ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]);
}
