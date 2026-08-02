# RLS ownership boundary suite

Regression suite proving the ownership boundary on `duas`/`dua_tags`/`tags`
holds under Row Level Security — the actual security boundary from the
multi-user auth migration (see [issue #11](https://github.com/arshali2774/DuaVault/issues/11)
and the RLS migration at `supabase/migrations/20260801182339_add_rls_policies_duas_dua_tags_tags.sql`).

Uses Vitest + the Supabase JS client (both anon-key clients signed in as
real test users, and the service-role client for setup/ground-truth
verification) against a **local Supabase CLI instance** — not the hosted
project, and not pgTAP. This is the first test suite in the repo; it
establishes the pattern for future backend tests.

Not wired into CI. Run manually whenever RLS policies or the
duas/tags/dua_tags schema changes.

## Running

Requires Docker.

```bash
npx supabase start   # first time: pulls images, then boots the local stack
npm run test:rls
```

If you've already got a local instance running from a previous session,
`npm run test:rls` alone is enough — it reads connection info from
`npx supabase status` at test-setup time, so there's nothing to configure
by hand.

To reset the local database to a clean state (re-applies every migration
under `supabase/migrations/`, including the baseline schema — see below):

```bash
npx supabase db reset
```

When done:

```bash
npx supabase stop
```

## Why there's a "baseline schema" migration

`duas`, `tags`, and `dua_tags` were originally created directly against the
hosted Supabase project (dashboard/SQL editor), before this repo tracked
migrations — there was never a `create table` migration for them upstream.
`supabase/migrations/20260801000000_baseline_schema.sql` reconstructs that
schema from application code (`src/lib/supabase.ts`'s `DbDua`/`DbTag`
shapes and the columns every API route reads/writes) so a fresh local
instance has something for the later `owner_id` and RLS migrations to apply
on top of. It's guarded (`create table if not exists`, and a dev-user seed
that only fires when `auth.users` is empty) to be inert if anyone ever
links this project and pushes migrations to the real hosted database — it
should never run there.

## Notes

- `supabase/config.toml` has `[analytics] enabled = false`. The local
  analytics/logging container (`vector`) was unstable in this environment
  (crash-looping on a Docker networking error) and isn't needed for this
  suite or for local app development — only for viewing logs in Studio.
- Every negative assertion (cross-account SELECT/UPDATE/DELETE) checks both
  that the request came back empty/no-op *and*, via the service-role
  client, that the target row was actually untouched. RLS filters
  SELECT/UPDATE/DELETE silently (`data: []`, `error: null`) rather than
  raising — only INSERT (and UPDATE that tries to reassign `owner_id`) trips
  `WITH CHECK` and raises `42501`.
- `dua_tags` has no UPDATE policy at all (the app has no update path for
  it), so UPDATE is default-deny for every caller, not just cross-account —
  the suite exercises this with the owning user to prove that, rather than
  a cross-account attempt that wouldn't distinguish the two.
- `tags`' RLS policies only cover SELECT and INSERT — no UPDATE/DELETE
  policy exists (the app has no such path either), so "globally
  readable/writable" is tested as select+insert.
