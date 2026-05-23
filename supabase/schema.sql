-- ============================================================
-- 75 Hard Tracker — Supabase Database Schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  start_date   date,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create table public.daily_logs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  log_date              date not null,
  workout_1_done        boolean default false not null,
  workout_2_done        boolean default false not null,
  outdoor_workout_done  boolean default false not null,
  diet_done             boolean default false not null,
  water_done            boolean default false not null,
  reading_done          boolean default false not null,
  progress_photo_done   boolean default false not null,
  no_alcohol_cheat_done boolean default false not null,
  notes                 text,
  photo_url             text,
  created_at            timestamptz default now() not null,
  updated_at            timestamptz default now() not null,
  unique(user_id, log_date)
);

create table public.friend_links (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  friend_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz default now() not null,
  unique(user_id, friend_user_id),
  check (user_id <> friend_user_id)
);

-- ── Triggers ─────────────────────────────────────────────────

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create or replace trigger daily_logs_updated_at
  before update on public.daily_logs
  for each row execute procedure public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.daily_logs  enable row level security;
alter table public.friend_links enable row level security;

-- profiles: own row
create policy "profiles: own select"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: own insert"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update using (auth.uid() = id);

-- profiles: friends can see each other
create policy "profiles: friend select"
  on public.profiles for select
  using (
    exists (
      select 1 from public.friend_links fl
      where
        (fl.user_id = auth.uid() and fl.friend_user_id = profiles.id)
        or
        (fl.friend_user_id = auth.uid() and fl.user_id = profiles.id)
    )
  );

-- daily_logs: own rows (full CRUD)
create policy "daily_logs: own all"
  on public.daily_logs for all
  using (auth.uid() = user_id);

-- daily_logs: friends can read
create policy "daily_logs: friend select"
  on public.daily_logs for select
  using (
    exists (
      select 1 from public.friend_links fl
      where
        (fl.user_id = auth.uid() and fl.friend_user_id = daily_logs.user_id)
        or
        (fl.friend_user_id = auth.uid() and fl.user_id = daily_logs.user_id)
    )
  );

-- friend_links: manage your own outgoing links
create policy "friend_links: own all"
  on public.friend_links for all
  using (auth.uid() = user_id);

-- friend_links: see links where you are the friend (for mutual lookup)
create policy "friend_links: as friend select"
  on public.friend_links for select
  using (auth.uid() = friend_user_id);

-- ── Storage ───────────────────────────────────────────────────
-- Create a bucket named "progress-photos" (private) in the Supabase dashboard.
-- Then run these storage policies:

-- Allow authenticated users to upload to their own folder
create policy "storage: own upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own files
create policy "storage: own read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow friends to read each other's photos
create policy "storage: friend read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.friend_links fl
      where
        fl.user_id = auth.uid()
        and fl.friend_user_id::text = (storage.foldername(name))[1]
    )
  );

-- Allow users to delete their own files
create policy "storage: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
