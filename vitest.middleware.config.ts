import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts (RLS) and vitest.auth.config.ts (auth API
// routes) so each suite's global setup only does what that suite needs —
// this one just resolves local Supabase env vars, no dev server spawn.
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/middleware/global-setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
