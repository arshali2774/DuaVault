import { execFileSync } from "node:child_process";

// Pulls connection info for the locally-running Supabase CLI instance
// (`supabase start`) and exposes it to every test via process.env, rather
// than hardcoding local keys/ports in the suite. Fails fast with a clear
// message if the local stack isn't up.
export default function setup() {
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
    process.env[`RLS_TEST_${key}`] = value;
  }

  if (!process.env.RLS_TEST_API_URL || !process.env.RLS_TEST_ANON_KEY || !process.env.RLS_TEST_SERVICE_ROLE_KEY) {
    throw new Error(
      "Could not parse API_URL/ANON_KEY/SERVICE_ROLE_KEY from `supabase status -o env`. Is the local Supabase instance up to date? Try `npx supabase stop` then `npx supabase start`."
    );
  }
}
