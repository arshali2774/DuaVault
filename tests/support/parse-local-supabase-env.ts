import { execFileSync } from "node:child_process";

// Pulls connection info for the locally-running Supabase CLI instance
// (`supabase start`) via `supabase status -o env`, and exposes it to the
// calling suite as `process.env[`${prefix}${KEY}`]` (e.g. `RLS_TEST_API_URL`)
// rather than hardcoding local keys/ports. Fails fast with a clear message
// if the local stack isn't up or a required key didn't come back.
//
// Shared by tests/rls, tests/auth, and tests/middleware's global-setup.ts —
// each suite still keeps its own global-setup file (and its own env
// prefix) so it stays independently runnable/removable; only this
// identical parsing step is shared.
export function parseLocalSupabaseEnv(prefix: string, requiredKeys: string[]): void {
  let output: string;
  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf-8",
      shell: true,
    });
  } catch {
    throw new Error(
      "Local Supabase instance is not running. Start it with `npx supabase start` before running this suite."
    );
  }

  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (!match) continue;
    const [, key, value] = match;
    process.env[`${prefix}${key}`] = value;
  }

  const missing = requiredKeys.filter((key) => !process.env[`${prefix}${key}`]);
  if (missing.length > 0) {
    throw new Error(
      `Could not parse ${missing.join("/")} from \`supabase status -o env\`. Is the local Supabase instance up to date? Try \`npx supabase stop\` then \`npx supabase start\`.`
    );
  }
}
