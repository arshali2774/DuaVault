-- Down-migration for supabase/migrations/20260801182339_add_rls_policies_duas_dua_tags_tags.sql
-- Not auto-applied by the Supabase CLI (lives outside supabase/migrations/) —
-- run manually against the DB (e.g. via the SQL Editor) to roll back.

drop policy if exists "duas_select_own" on duas;
drop policy if exists "duas_insert_own" on duas;
drop policy if exists "duas_update_own" on duas;
drop policy if exists "duas_delete_own" on duas;
alter table duas disable row level security;

drop policy if exists "dua_tags_select_via_dua_owner" on dua_tags;
drop policy if exists "dua_tags_insert_via_dua_owner" on dua_tags;
drop policy if exists "dua_tags_delete_via_dua_owner" on dua_tags;
alter table dua_tags disable row level security;

drop policy if exists "tags_select_all_authenticated" on tags;
drop policy if exists "tags_insert_all_authenticated" on tags;
alter table tags disable row level security;
