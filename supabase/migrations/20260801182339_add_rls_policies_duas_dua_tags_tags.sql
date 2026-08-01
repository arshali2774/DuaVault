-- Enable Row Level Security ownership enforcement on duas, its dua_tags
-- join table, and tags. This is the RLS half of #16 (per-route client
-- rewiring is the other half, already shipped).
--
-- duas: every authenticated user only ever sees/edits/deletes rows they own.
-- dua_tags: scoped via the *parent dua's* owner — there is no tag-level
--   owner, so ownership is resolved through a join back to duas on every
--   check.
-- tags: stays a shared, global vocabulary — readable/writable by any
--   authenticated user, unscoped by owner.
--
-- Only the operations the app actually performs get a policy (tags has no
-- update/delete path in the app; dua_tags has no update path). Anything
-- without a matching policy is denied by RLS's default-deny behavior.
--
-- Precondition: every duas row already has a non-null owner_id (backfilled
-- by 20260801175137_add_owner_id_to_duas.sql) and every duas/* route reads
-- through a per-request client so auth.uid() resolves (shipped separately).
--
-- Rollback: supabase/rollbacks/20260801182339_add_rls_policies_duas_dua_tags_tags.down.sql

alter table duas enable row level security;

create policy "duas_select_own" on duas
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "duas_insert_own" on duas
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "duas_update_own" on duas
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "duas_delete_own" on duas
  for delete
  to authenticated
  using (owner_id = auth.uid());

alter table dua_tags enable row level security;

create policy "dua_tags_select_via_dua_owner" on dua_tags
  for select
  to authenticated
  using (
    exists (
      select 1 from duas
      where duas.id = dua_tags.dua_id
        and duas.owner_id = auth.uid()
    )
  );

create policy "dua_tags_insert_via_dua_owner" on dua_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1 from duas
      where duas.id = dua_tags.dua_id
        and duas.owner_id = auth.uid()
    )
  );

create policy "dua_tags_delete_via_dua_owner" on dua_tags
  for delete
  to authenticated
  using (
    exists (
      select 1 from duas
      where duas.id = dua_tags.dua_id
        and duas.owner_id = auth.uid()
    )
  );

alter table tags enable row level security;

create policy "tags_select_all_authenticated" on tags
  for select
  to authenticated
  using (true);

create policy "tags_insert_all_authenticated" on tags
  for insert
  to authenticated
  with check (true);
