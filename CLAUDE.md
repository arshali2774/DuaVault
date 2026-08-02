# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DuaVault — a personal, PIN-gated single-user web app for storing and memorizing duas (Islamic prayers), with fuzzy search and SM-2 spaced-repetition practice. Built with Next.js (App Router), TypeScript, Tailwind CSS v4, and Supabase Postgres.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # next build
npm run start    # start production server
npm run lint      # eslint
npm run test:rls  # RLS ownership boundary suite (requires local Supabase CLI instance via Docker)
npm run test:auth # auth API route smoke suite (same requirement; also spawns a `next dev` on :3000)
```

There is no test suite for application code. There are two backend regression suites: the RLS ownership boundary tests (`tests/rls/README.md`) and the auth API route smoke suite (`tests/auth/README.md`). Neither is wired into CI.

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

### Auth: single shared PIN, not per-user accounts (migrating — see below)

There's no user model — the whole app is gated behind one PIN (`APP_PIN` env var) shared by whoever has it.
- `src/middleware.ts` checks for a `duavault-auth` cookie on every route except `/unlock` and `/api/auth/verify`, redirecting to `/unlock?redirect=<path>` if missing/invalid.
- `POST /api/auth/verify` (`src/app/api/auth/verify/route.ts`) checks the submitted PIN against `APP_PIN` and sets an httpOnly cookie containing a base64 JSON blob (`{authenticated, expires}`) valid 7 days. This is a lightweight gate, not real session security — don't treat the cookie as cryptographically signed.
- `POST /api/auth/logout` clears the cookie.

**In progress:** the PIN gate is being replaced with real multi-user accounts via Supabase Auth (open signup). Decisions are being made and tracked as a Wayfinder map at [GitHub issue #1](https://github.com/arshali2774/DuaVault/issues/1) — check it (and `docs/adr/`) for the current state before assuming the description above still holds. This note should be replaced with the real Auth architecture once the migration lands.

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
