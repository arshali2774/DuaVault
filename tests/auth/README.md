# Auth API route smoke suite

Smoke-level regression suite confirming the app's auth routes actually wire
up Supabase Auth correctly (see [issue #19](https://github.com/arshali2774/DuaVault/issues/19),
part of the multi-user auth migration, [issue #11](https://github.com/arshali2774/DuaVault/issues/11)).
Not re-testing Supabase's own SDK internals (PKCE mechanics, JWT refresh) —
just that `src/app/api/auth/*/route.ts` call the right Supabase methods and
map their results to the right HTTP responses and cookies.

Covers all six acceptance criteria from #19:

- Signup creates an account and sends a verification email
- Login rejects a wrong password
- Login is blocked when the account isn't verified yet
- Logout actually clears the session (checked against a protected route,
  not just the `{success: true}` response body)
- A password-reset request sends a reset email
- A valid reset token allows setting a new password (and an invalid one is
  rejected)

## Why this drives real HTTP, not imported route handlers

Every route in `src/app/api/auth/` calls `@/lib/supabase-server`, which
calls `cookies()` from `next/headers` — that only resolves inside a real
Next.js request (its request-scoped `AsyncLocalStorage`), not when the
exported `POST` function is imported and invoked directly in a test
runner. So `tests/auth/global-setup.ts` spawns a real `next dev` server
pointed at the local Supabase instance, and every test drives it over
`fetch`, carrying cookies forward the way a browser would.

Follows the same live-instance convention as `tests/rls` (see
`tests/rls/README.md`) rather than mocking Supabase — the acceptance
criteria are about what actually happens ("creates an account", "clears
the session", "a valid token"), which a mocked client can't demonstrate.

## Running

Requires Docker (for the local Supabase CLI stack) and port 3000 free.

```bash
npx supabase start   # first time: pulls images, then boots the local stack
npm run test:auth
```

If a local instance is already running from a previous session,
`npm run test:auth` alone is enough — like the RLS suite, it reads
connection info from `npx supabase status` at global-setup time.

`vitest.auth.config.ts` is a separate config from the root
`vitest.config.ts` (used by `test:rls`) specifically so its global setup —
which spawns a dev server — never runs for suites that don't need one.

## Notes

- The dev server it spawns always runs on `127.0.0.1:3000`, matching
  `site_url` and the `/reset-password` entry in `additional_redirect_urls`
  in `supabase/config.toml` — Supabase Auth silently falls back to
  `site_url` for email links if the redirect target isn't in that
  allow-list, which would make the reset-password test fail in a way
  that's confusing to debug. It always overrides
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` with the local
  instance's values, regardless of what `.env`/`.env.local` point at, so
  the suite can never accidentally sign up real users or send real email
  against the hosted project.
- `supabase/config.toml`'s `auth.rate_limit.email_sent` is raised to 20
  (from the CLI's default of 2) — this suite sends a signup confirmation
  and a password-reset email in the same run, which the default leaves no
  headroom for. `auth.email.enable_confirmations` is turned on (the CLI
  default is off) so "login blocked until verified" is something the local
  instance actually enforces. Both need `supabase stop` + `supabase start`
  to take effect, not just `supabase db reset`.
- Email content is read from Mailpit, the local CLI's mail catcher
  (`http://127.0.0.1:54324`), via its REST API — search by recipient, then
  fetch the full message body and regex out the Supabase verify link.
  Fetching that link directly (not through the app) is how the suite
  simulates a user clicking the link in their inbox; for password reset,
  the redirect it issues carries the `?code=` the app's own
  `/api/auth/reset-password` route exchanges for a session.
- Unlike the RLS suite's fixtures (real rows cleaned up via
  `owner_id`/cascade), leftover unconfirmed signup accounts are deleted
  explicitly in `afterEach`/`finally` blocks rather than relying on
  cascade, since they have no owned rows to cascade from.
- Running this suite touches `tsconfig.json` (reformatted, with a
  `.next/dev/dev/types/**/*.ts` entry appended) — that's `next dev` itself
  doing this on every dev-server start, same as `npm run dev` would, not
  anything this suite does deliberately. `git checkout -- tsconfig.json`
  after running if you want a clean diff.
