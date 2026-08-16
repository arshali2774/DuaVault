import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { parseLocalSupabaseEnv } from "../support/parse-local-supabase-env";

const PORT = 3100;
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

// Same pattern as tests/auth/global-setup.ts: /api/duas* routes use
// createClient() from supabase-server.ts, which depends on next/headers'
// cookies() and only resolves inside a real Next.js request — so this
// suite drives the actual routes over HTTP against a spawned `next dev`
// server rather than importing route handlers out of context. Runs on its
// own port (3100) so it can run alongside tests/auth's server on 3000
// without colliding.
export default async function setup() {
  parseLocalSupabaseEnv("DUPLICATES_TEST_", ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]);

  process.env.DUPLICATES_TEST_BASE_URL = BASE_URL;

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
        NEXT_PUBLIC_SUPABASE_URL: process.env.DUPLICATES_TEST_API_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.DUPLICATES_TEST_ANON_KEY,
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
