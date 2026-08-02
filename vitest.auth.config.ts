import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts (used by the RLS suite) because this
// suite's global setup spawns a real `next dev` server rather than just
// resolving env vars — running both globalSetups on every invocation would
// start a dev server the RLS suite never needs.
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/auth/global-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Auth state (sessions, confirmation status) isn't file-scoped the way
    // RLS fixtures are; running suites in parallel workers risks two files
    // racing the shared local Supabase email rate limit.
    fileParallelism: false,
  },
});
