---
status: accepted
---

# Remove Prisma; standardize on the Supabase client for all data access

Prisma was scaffolded early (client generated, `src/lib/prisma.ts`, `prisma/schema.prisma`) but was never actually used to manage the schema — no `prisma/migrations/` was ever created, `schema.prisma` was hand-authored once to mirror the DB at that moment, and every API route was written against the Supabase JS client instead. The schema then drifted (it's missing `Tag`/`dua_tags`, which exist in the real DB) with nothing to catch it, because nothing depended on it being correct.

We considered syncing the schema and either migrating routes to Prisma or keeping it as a documented escape hatch, but rejected both: a second, unused data-access path that can silently drift again isn't a safety net, it's a trap for a future reader who trusts it. For a solo MVP with one data-access pattern already working, one path is strictly better than two.

**Decision:** remove Prisma entirely — `prisma/`, `prisma.config.ts`, `src/lib/prisma.ts`, `src/generated/prisma`, the `prisma`/`@prisma/client`/`@prisma/adapter-pg`/`pg` dependencies, `DATABASE_URL`, and `prisma generate` from the build script. All data access goes through `src/lib/supabase.ts`, as it already does everywhere in practice. If a future need (typed queries, migrations-as-code) justifies an ORM again, reintroduce it deliberately with schema sync enforced from day one — not scaffolded ahead of need.
