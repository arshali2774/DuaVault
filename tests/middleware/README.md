# Middleware session-gate suite

Regression suite covering `src/middleware.ts`'s session check (see
[issue #18](https://github.com/arshali2774/DuaVault/issues/18), part of the
multi-user auth migration, [issue #11](https://github.com/arshali2774/DuaVault/issues/11)),
so a future refactor of the gate logic can't silently start letting
unauthenticated requests through.

Covers the three acceptance criteria from #18:

- An unauthenticated request to a protected route redirects to `/login`
- An authenticated request passes through
- An expired/invalid session is treated as unauthenticated (redirects, does
  not pass through)

Plus two smaller checks: the redirect's `?redirect=` param carries the
original path, and public routes (e.g. `/login` itself) never redirect.

## Why this suite is lighter than tests/auth

Unlike the routes under `src/app/api/auth/`, `middleware.ts` never touches
`next/headers` — it reads and writes cookies straight off the `NextRequest`
object it's handed (see `src/middleware.ts`'s `cookies.getAll()`/`setAll()`
implementation). That means `middleware()` can be imported and called
directly as a plain async function, with a hand-built `NextRequest`, no
running dev server required — unlike `tests/auth`, which has to spawn one
because its routes' `cookies()` calls need a real Next.js request context.

A valid session is supplied by encoding a real `Session` object (from
signing in a confirmed test user against the local Supabase instance) into
a `sb-<ref>-auth-token` cookie value the same way `@supabase/ssr` does:
`"base64-" + base64url(JSON.stringify(session))` — see the doc comments on
`encodeSessionCookie`/`sessionCookieName` in `helpers.ts` for the exact
source in `@supabase/ssr`/`@supabase/supabase-js` this mirrors.

The "expired/invalid" case deletes the user server-side right after
signing them in, rather than corrupting the access token. An earlier draft
of this test just flipped a few characters in the access token's
signature — that only proves tamper-resistance, not expiry: `getUser()`
transparently refreshes a session whose access token has expired but whose
refresh token is still live (that's intentional — see `middleware.ts`'s
own comment on keeping a rolling session alive), so a signature-only
tamper with a working refresh token would have silently passed a test
meant to catch the opposite. Deleting the user invalidates both tokens, so
the test fails regardless of which path `getUser()` takes internally — see
the doc comment on that test in `middleware.test.ts` for the full
reasoning.

## Running

Requires Docker (for the local Supabase CLI stack, to sign in a real test
user against).

```bash
npx supabase start   # first time: pulls images, then boots the local stack
npm run test:middleware
```

If a local instance is already running, `npm run test:middleware` alone is
enough — like the other suites, it reads connection info from
`npx supabase status` at global-setup time.

## Notes

- `vitest.middleware.config.ts` is separate from the RLS and auth suites'
  configs so this one's global setup — which only resolves env vars, no
  dev server — stays minimal. The `supabase status -o env` parsing itself
  is shared (`tests/support/parse-local-supabase-env.ts`, also used by
  `tests/rls` and `tests/auth`) now that a third near-identical copy would
  have made it three; each suite still keeps its own `global-setup.ts`
  calling it with its own env-var prefix, so a suite stays independently
  runnable/removable. The rest of `helpers.ts` (`getServiceClient`,
  `createConfirmedUser`, `deleteUser`) is a smaller, still-duplicated
  near-copy of the equivalent code in the other two suites — left alone
  since each has small per-suite differences not worth abstracting over.
- No dev server means no `tsconfig.json` churn from `next dev` — unlike
  running `tests/auth` (see that suite's README).
