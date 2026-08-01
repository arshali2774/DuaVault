-- Down-migration for supabase/migrations/20260801175137_add_owner_id_to_duas.sql
-- Not auto-applied by the Supabase CLI (lives outside supabase/migrations/) —
-- run manually against the DB (e.g. via the SQL Editor) to roll back.

alter table duas drop column owner_id;
