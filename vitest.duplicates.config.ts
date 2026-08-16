import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts (RLS suite) and vitest.auth.config.ts for
// the same reason vitest.auth.config.ts is separate from the RLS one: this
// suite's global setup spawns its own real `next dev` server (on port 3100
// so it never collides with tests/auth's 3000).
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/duplicates/global-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // All test files share one spawned dev server (see global-setup.ts);
    // running files in parallel workers races requests against it. Same
    // reasoning as tests/auth/vitest config.
    fileParallelism: false,
  },
});
