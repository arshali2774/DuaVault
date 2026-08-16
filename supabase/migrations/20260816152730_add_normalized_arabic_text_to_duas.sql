-- Add normalized_arabic_text to duas: the precomputed, normalization-rule
-- applied form of arabic_text used for duplicate-dua detection and the
-- (future) duplicate-review page's grouping query. Nullable at the DB
-- level — the app is responsible for computing and setting it (see
-- src/lib/arabic-normalize.ts), the same app-boundary-owns-correctness
-- convention already used throughout this schema (no DB triggers). As of
-- this migration, only POST /api/duas does so (the add-dua flow); the
-- edit (PUT) and import routes pick this up in later tickets.
--
-- DEPLOY ORDER: existing rows are NOT backfilled by this migration, to
-- keep the normalization rules implemented in exactly one place
-- (TypeScript) rather than duplicated in SQL. Run
-- `npm run backfill:normalized-arabic-text` (see that script's header for
-- required env vars) immediately after applying this migration to any
-- environment with existing duas rows — until that runs, pre-existing
-- duas have normalized_arabic_text = null and won't participate in
-- duplicate detection.
--
-- Rollback: supabase/rollbacks/20260816152730_add_normalized_arabic_text_to_duas.down.sql

alter table duas add column normalized_arabic_text text;

create index duas_owner_normalized_arabic_text_idx
  on duas (owner_id, normalized_arabic_text);
