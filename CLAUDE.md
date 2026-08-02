# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DuaVault — a multi-user web app for storing and memorizing duas (Islamic prayers), with fuzzy search and SM-2 spaced-repetition practice. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, and Supabase Postgres/Auth.

## Commands

```bash
npm run dev            # start dev server (localhost:3000)
npm run build          # next build
npm run start          # start production server
npm run lint            # eslint
npm run test:rls         # RLS ownership boundary suite (requires local Supabase CLI instance via Docker)
npm run test:auth        # auth API route smoke suite (same requirement; also spawns a `next dev` on :3000)
npm run test:middleware  # middleware session-gate suite (same requirement; no dev server needed)
```

There is no test suite for application code. There are three backend regression suites: the RLS ownership boundary tests (`tests/rls/README.md`), the auth API route smoke suite (`tests/auth/README.md`), and the middleware session-gate suite (`tests/middleware/README.md`). None are wired into CI.

`supabase/config.toml`'s `auth.email.enable_confirmations` is `true` (not the local CLI's default of `false`) so the local instance mirrors the hosted project and the auth smoke suite can actually exercise "login blocked until verified" — this also means a local `npm run dev` signup no longer logs you in immediately; you'll need to confirm via the local Mailpit inbox (`http://127.0.0.1:54324`) first, same as the hosted app.

## Architecture

### Data access: Supabase client only

All API routes read/write the database through the **Supabase JS client** (`src/lib/supabase.ts`), calling `supabase.from("duas")`, `.from("tags")`, `.from("dua_tags")` directly. There is no ORM — Prisma was scaffolded early but never actually used to manage the schema (no migrations were ever created) and was removed once the schema drifted from reality; see `docs/adr/0001-remove-prisma-standardize-on-supabase-client.md`. If you need the actual schema, look at `src/lib/supabase.ts`'s `DbDua`/`DbTag` interfaces and how routes query `dua_tags` as a join table.

When adding a new route or data operation, follow the existing Supabase pattern.

### snake_case (DB) <-> camelCase (app) boundary

The DB uses snake_case columns (`arabic_text`, `next_review_date`, etc.). `src/lib/supabase.ts` defines the conversion boundary:
- `DbDua`/`DbTag` — raw snake_case shapes from Supabase
- `Dua`/`Tag` — camelCase shapes used everywhere in app code (components, client state)
- `dbToApp` / `appToDb` / `dbTagToApp` — conversion functions used in every API route

Always convert at the API route boundary; never leak snake_case fields into client components.

### Auth: per-user accounts via Supabase Auth

Every person who signs up owns their own independent set of duas — there is no shared PIN gate. Email/password only (no magic link, no OAuth); email verification is required before first sign-in; account recovery goes through Supabase's password-reset flow.

- `src/middleware.ts` is built around `@supabase/ssr`'s `getUser()` recipe: it refreshes the rolling session on every request, then redirects to `/login?redirect=<path>` if unauthenticated, for every route except the public auth surface (`/login`, `/signup`, `/forgot-password`, `/reset-password`, and their `/api/auth/*` counterparts).
- Every API route that needs `auth.uid()` to resolve (for RLS) builds its own per-request Supabase server client via `createClient()` in `src/lib/supabase-server.ts` — never the shared module-level client from `src/lib/supabase.ts`, which can't carry per-request cookies.
- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, and `POST /api/auth/reset-password` (under `src/app/api/auth/`) wrap the corresponding Supabase Auth SDK calls; the matching `/login`, `/signup`, `/forgot-password`, `/reset-password` pages are the client-facing forms.
- Ownership: `duas.owner_id` (`uuid`, references `auth.users`, `ON DELETE CASCADE`) auto-fills via a DB-level default of `auth.uid()` — never sent by or trusted from the client. Row Level Security is the authoritative enforcement mechanism, not app-level filtering. `tags` stays a global, unscoped table shared by all users; `dua_tags` is scoped via RLS keyed off the parent dua's owner.

Full architecture history and decisions live in the closed Wayfinder map at [GitHub issue #1](https://github.com/arshali2774/DuaVault/issues/1) and its spec, [issue #11](https://github.com/arshali2774/DuaVault/issues/11).

### Spaced repetition (SM-2)

`src/lib/spaced-repetition.ts` implements the SM-2 algorithm (`calculateNextReview`), storing `easeFactor`, `interval`, `repetitions`, `nextReviewDate` directly on each `Dua` row (no separate review-log table). `GET /api/duas/practice` returns duas due now (`next_review_date` null or past); `POST /api/duas/practice` records a review result and recalculates the schedule. The UI maps four buttons (again/hard/good/easy) to SM-2 quality scores via `simpleQualityToNumber`.

### Search

Client-side fuzzy search via Fuse.js (`src/lib/search.ts`). `normalizeForSearch` folds diacritics and common Arabic-transliteration digraphs (`dh`->`z`, `kh`->`k`, etc.) so transliteration spelling variants still match. The library page (`src/app/page.tsx`) fetches a paginated list for normal browsing, but lazily fetches *all* duas (`GET /api/duas?all=true`) the first time a search query is typed, then searches client-side against that full set.

### Tags

Many-to-many via a `dua_tags` join table, queried directly through Supabase (`select("dua_id, tags(*)")`) rather than a Prisma relation. Tag names are normalized to lowercase on creation (`src/app/api/tags/route.ts`).

### Path alias

`@/*` maps to `src/*` (see `tsconfig.json`).

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI (repo: `arshali2774/DuaVault`); PRs are not a triage surface (solo project). See `docs/agents/issue-tracker.md`.

The GitHub MCP plugin's token is read-only — its write tools (`issue_write`, `sub_issue_write`, etc.) fail with 403/404 even on owned repos. Use the `gh` CLI for all issue/PR writes (create, update, sub-issue linking via `gh api repos/OWNER/REPO/issues/N/sub_issues`); MCP tools are fine for reads.

### Triage labels

Canonical label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) used as-is, no repo-specific remapping. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by `/domain-modeling` as terms/decisions get resolved). See `docs/agents/domain.md`.
