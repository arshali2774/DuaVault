-- Baseline schema for duas / tags / dua_tags.
--
-- These tables were created directly against the hosted Supabase project
-- (dashboard/SQL editor) before migration tracking started in this repo —
-- there was never a "create table" migration for them. This file
-- reconstructs that schema from application code (src/lib/supabase.ts's
-- DbDua/DbTag interfaces and the columns every API route actually reads
-- and writes) so a fresh `supabase start` + `supabase db reset` produces a
-- local database the later migrations (owner_id, RLS) can apply cleanly.
--
-- Guarded to be inert against the hosted project: `create table if not
-- exists` throughout, and the dev-user seed below only fires when
-- auth.users is empty (never true on the provisioned remote). This is a
-- local bootstrap, not a dump — do not treat it as authoritative if it
-- ever drifts from the real schema; the real schema is whatever's live in
-- Supabase.

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists duas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  arabic_text text not null,
  translation text not null,
  transliteration text,
  description text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ease_factor real not null default 2.5,
  interval integer not null default 0,
  repetitions integer not null default 0,
  next_review_date timestamptz
);

create table if not exists dua_tags (
  dua_id uuid not null references duas(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (dua_id, tag_id)
);

-- The local CLI's current default is to NOT auto-expose newly created
-- tables to the Data API roles (anon/authenticated/service_role) without
-- explicit grants. The hosted project's tables predate that default and
-- were exposed at creation time, so replicate that here for parity —
-- without this, RLS policies never even get evaluated because Postgres
-- denies the underlying table permission first.
grant usage on schema public to anon, authenticated, service_role;
grant all on duas, tags, dua_tags to anon, authenticated, service_role;

-- 20260801175137_add_owner_id_to_duas.sql looks up a specific email
-- (arshali.763z@gmail.com) to backfill owner_id onto — it raises an
-- exception if that row doesn't exist. On a fresh local instance there is
-- no such row, so seed one here with a throwaway password, matching that
-- exact email so the next migration's lookup succeeds. Guarded to only
-- fire when auth.users is empty, which is never the case on the hosted
-- project (where the real account already exists).
do $$
begin
  if (select count(*) from auth.users) = 0 then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'arshali.763z@gmail.com',
      crypt('local-dev-only', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}'
    );
  end if;
end $$;
