import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { parseLocalSupabaseEnv } from "../support/parse-local-supabase-env";

// This port is not arbitrary: it must match `site_url` and the
// `/reset-password` entry in `additional_redirect_urls` in
// supabase/config.toml, or Supabase Auth silently falls back to site_url
// for the confirmation/reset email links instead of erroring.
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Dev server at ${url} did not become ready within ${timeoutMs}ms`);
}

function killTree(pid: number) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    process.kill(-pid, "SIGTERM");
  }
}

// Pulls connection info for the locally-running Supabase CLI instance
// (`supabase start`) exactly like tests/rls/global-setup.ts, then spawns a
// real `next dev` server pointed at that instance so the suite can drive
// the actual API routes (and their next/headers-backed cookie handling)
// over HTTP instead of importing route handlers out of context.
export default async function setup() {
  parseLocalSupabaseEnv("AUTH_TEST_", ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "MAILPIT_URL"]);

  process.env.AUTH_TEST_BASE_URL = BASE_URL;

  const devServer: ChildProcess = spawn(
    "npx",
    ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"],
    {
      shell: true,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        // Override whatever hosted-project values live in .env/.env.local —
        // this suite must only ever talk to the local Supabase instance.
        NEXT_PUBLIC_SUPABASE_URL: process.env.AUTH_TEST_API_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.AUTH_TEST_ANON_KEY,
        NEXT_PUBLIC_SITE_URL: BASE_URL,
      },
    }
  );

  try {
    await waitForServer(BASE_URL);
  } catch (err) {
    if (devServer.pid) killTree(devServer.pid);
    throw err;
  }

  return () => {
    if (devServer.pid) killTree(devServer.pid);
  };
}
