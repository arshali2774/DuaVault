-- Add owner_id to duas: backfill all pre-existing rows to the developer's
-- account, then switch the default so future inserts auto-fill from the
-- authenticated caller. No RLS policies yet (next migration).
--
-- Rollback: supabase/rollbacks/20260801175137_add_owner_id_to_duas.down.sql
--
-- DEPLOY ORDER: all duas/* API routes still write through the anon-key
-- module-level client in src/lib/supabase.ts, not a per-request server
-- client carrying the caller's JWT. auth.uid() resolves to NULL under the
-- anon key, so once owner_id is NOT NULL, POST /api/duas will start
-- failing on insert until the routes are switched to a per-request client
-- (tracked in the next ticket, alongside RLS). Don't apply this migration
-- to a deployed environment before that lands.

do $$
declare
  dev_user_id uuid;
begin
  select id into dev_user_id
  from auth.users
  where email = 'arshali.763z@gmail.com';

  if dev_user_id is null then
    raise exception 'No auth.users row for arshali.763z@gmail.com — sign up first, then re-run this migration';
  end if;

  execute format(
    'alter table duas add column owner_id uuid not null default %L references auth.users(id) on delete cascade',
    dev_user_id
  );
end $$;

alter table duas alter column owner_id set default auth.uid();
