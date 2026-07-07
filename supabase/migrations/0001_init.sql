-- RoamRoom — initial schema for shared, multi-user trips.
-- Paste this whole file into the Supabase SQL editor (Database → SQL Editor)
-- and run it once. It is safe to re-run: everything uses IF NOT EXISTS / OR REPLACE.
--
-- Model mirrors the local types in src/data/*. Sharing is driven entirely by
-- trip_members: a user can see/edit a trip and all of its child rows iff they
-- have a membership row for it. RLS enforces this on every table.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, so co-travelers can see each other's name
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can read profiles (names/avatars aren't sensitive) but only
-- edit their own.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  destination text not null default '',
  start_date date,
  end_date date,
  status text not null default 'Planning',       -- Planning | Live | Done
  cover_key text not null default 'default',
  invite_code text not null unique,
  vibes text[] not null default '{}',
  budget_comfort text not null default 'Mixed',
  origin text not null default 'blank',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trip_members — the sharing table (who can access which trip)
-- ---------------------------------------------------------------------------
create table if not exists public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'Traveler',          -- Owner | Planner | Traveler
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- Membership check as SECURITY DEFINER so policies can call it without causing
-- RLS recursion on trip_members itself.
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Child tables
-- ---------------------------------------------------------------------------
create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day int not null default 1,
  time text,
  title text not null default '',
  location text not null default '',
  kind text not null default 'activity',          -- flight | stay | food | activity | transport | free
  status text not null default 'planned',         -- idea | planned | booked | done
  notes text,
  lat double precision,
  lng double precision,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists itinerary_items_trip_idx on public.itinerary_items (trip_id);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null default '',
  area text not null default '',
  day int,
  time text,
  kind text not null default 'activity',
  status text not null default 'idea',            -- idea | planned | booked | visited
  note text,
  lat double precision not null,
  lng double precision not null,
  source text not null default 'saved',           -- itinerary | saved
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists places_trip_idx on public.places (trip_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null default '',
  amount numeric not null default 0,
  currency text not null default 'USD',           -- USD | JPY | ...
  category text not null default 'other',         -- lodging | food | transport | activity | shopping | other
  paid_by uuid references auth.users (id) on delete set null,
  split_user_ids uuid[] not null default '{}',
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_trip_idx on public.expenses (trip_id);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists checklist_items_trip_idx on public.checklist_items (trip_id);

-- Group voting on places (Phase 4). One vote per user per place.
create table if not exists public.place_votes (
  place_id uuid not null references public.places (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);
create index if not exists place_votes_trip_idx on public.place_votes (trip_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.places enable row level security;
alter table public.expenses enable row level security;
alter table public.checklist_items enable row level security;
alter table public.place_votes enable row level security;

-- trips: members read/update; only the owner creates or deletes.
drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select to authenticated using (is_trip_member(id));

drop policy if exists "trips_insert" on public.trips;
create policy "trips_insert" on public.trips
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "trips_update" on public.trips;
create policy "trips_update" on public.trips
  for update to authenticated using (is_trip_member(id)) with check (is_trip_member(id));

drop policy if exists "trips_delete" on public.trips;
create policy "trips_delete" on public.trips
  for delete to authenticated using (owner_id = auth.uid());

-- trip_members: members see the roster; a user can add/remove themselves,
-- and the trip owner can manage anyone.
drop policy if exists "members_select" on public.trip_members;
create policy "members_select" on public.trip_members
  for select to authenticated using (is_trip_member(trip_id));

drop policy if exists "members_insert" on public.trip_members;
create policy "members_insert" on public.trip_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

drop policy if exists "members_delete" on public.trip_members;
create policy "members_delete" on public.trip_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

-- Child tables: full access for any member of the parent trip.
do $$
declare tbl text;
begin
  foreach tbl in array array['itinerary_items','places','expenses','checklist_items','place_votes']
  loop
    execute format('drop policy if exists "%s_all" on public.%I;', tbl, tbl);
    execute format(
      'create policy "%s_all" on public.%I for all to authenticated using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));',
      tbl, tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- join_trip_by_code — lets a user join a shared trip from its invite code.
-- SECURITY DEFINER so the lookup bypasses the members-only SELECT policy on
-- trips (otherwise you couldn't find a trip you're not yet a member of).
-- ---------------------------------------------------------------------------
create or replace function public.join_trip_by_code(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select id into v_trip_id from public.trips where invite_code = upper(trim(p_code));
  if v_trip_id is null then
    return null;
  end if;
  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'Traveler')
  on conflict (trip_id, user_id) do nothing;
  return v_trip_id;
end;
$$;

-- The trip owner should always be a member. Add the owner automatically.
create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'Owner')
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.add_owner_as_member();

-- ---------------------------------------------------------------------------
-- Realtime — broadcast row changes so edits appear live for everyone.
-- ---------------------------------------------------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array['trips','trip_members','itinerary_items','places','expenses','checklist_items','place_votes']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    exception when duplicate_object then
      null; -- already in the publication
    end;
  end loop;
end $$;
