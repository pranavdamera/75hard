-- ============================================================
-- 75 Hard Tracker v2 — Safe Migration
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- ── 1. Update profiles ─────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists onboarding_completed boolean  default false not null,
  add column if not exists challenge_style      text     default 'strict' not null,
  add column if not exists goal_type            text,
  add column if not exists age                  int,
  add column if not exists sex                  text,
  add column if not exists height_inches        int,
  add column if not exists current_weight_lbs   numeric,
  add column if not exists goal_weight_lbs      numeric,
  add column if not exists activity_level       text;

-- Mark existing users as onboarding complete so they aren't forced through the flow
update public.profiles
  set onboarding_completed = true
  where onboarding_completed = false;

-- ── 2. Update daily_logs ───────────────────────────────────────────────────

alter table public.daily_logs
  add column if not exists indoor_workout_done     boolean default false,
  add column if not exists indoor_workout_notes    text,
  add column if not exists indoor_workout_minutes  int,
  add column if not exists outdoor_workout_notes   text,
  add column if not exists outdoor_workout_minutes int,
  add column if not exists breakfast               text,
  add column if not exists lunch                   text,
  add column if not exists dinner                  text,
  add column if not exists snacks                  text;

-- Backfill: map workout_1_done → indoor_workout_done for rows that have it
update public.daily_logs
  set indoor_workout_done = workout_1_done
  where indoor_workout_done = false
    and workout_1_done = true;

-- ── 3. Create challenge_tasks ─────────────────────────────────────────────

create table if not exists public.challenge_tasks (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  task_key   text        not null,
  task_label text        not null,
  enabled    boolean     default true not null,
  sort_order int         default 0 not null,
  created_at timestamptz default now() not null,
  unique(user_id, task_key)
);

-- ── 4. Create nutrition_goals ─────────────────────────────────────────────

create table if not exists public.nutrition_goals (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references public.profiles(id) on delete cascade,
  goal_type            text,
  target_calories      int,
  protein_g            int,
  carbs_g              int,
  fat_g                int,
  maintenance_calories int,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null,
  unique(user_id)
);

-- ── 5. Enable RLS ─────────────────────────────────────────────────────────

alter table public.challenge_tasks enable row level security;
alter table public.nutrition_goals  enable row level security;

-- ── 6. RLS — challenge_tasks ───────────────────────────────────────────────

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'challenge_tasks' and policyname = 'challenge_tasks: own all'
  ) then
    create policy "challenge_tasks: own all"
      on public.challenge_tasks for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ── 7. RLS — nutrition_goals ───────────────────────────────────────────────

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'nutrition_goals' and policyname = 'nutrition_goals: own all'
  ) then
    create policy "nutrition_goals: own all"
      on public.nutrition_goals for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ── 8. Trigger — nutrition_goals updated_at ────────────────────────────────

create or replace trigger nutrition_goals_updated_at
  before update on public.nutrition_goals
  for each row execute procedure public.handle_updated_at();

-- ── 9. Backfill challenge_tasks for all existing users ─────────────────────

insert into public.challenge_tasks (user_id, task_key, task_label, enabled, sort_order)
select
  p.id,
  t.task_key,
  t.task_label,
  true,
  t.sort_order
from public.profiles p
cross join (
  values
    ('indoor_workout',  'Indoor Workout',  0),
    ('outdoor_workout', 'Outdoor Workout', 1),
    ('diet',            'Follow Diet',     2),
    ('water',           'Drink 1 Gallon',  3),
    ('reading',         'Read 10 Pages',   4),
    ('progress_photo',  'Progress Photo',  5),
    ('no_alcohol',      'No Alcohol',      6)
) as t(task_key, task_label, sort_order)
on conflict (user_id, task_key) do nothing;

-- ── Done ──────────────────────────────────────────────────────────────────
-- Storage note: progress-photos bucket should be set to PUBLIC so that
-- getPublicUrl() works correctly for photo display across the app.
-- In Supabase dashboard: Storage → progress-photos → Make public.
