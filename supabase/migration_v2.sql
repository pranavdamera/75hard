-- ============================================================
-- 75 Hard Tracker v2 — Privacy, Friend Visibility, Goal Weight
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- Run in: Supabase → SQL Editor → New query
-- ============================================================

-- ── 1. Privacy + preference columns on profiles ───────────────────────────

alter table public.profiles
  add column if not exists friends_can_view_photos        boolean default true  not null,
  add column if not exists friends_can_view_workout_notes boolean default false not null,
  add column if not exists friends_can_view_meals         boolean default false not null,
  add column if not exists protein_preference             text    default 'standard' not null,
  add column if not exists goal_weight_lbs                numeric;

-- ── 2. Add updated_at to challenge_tasks ─────────────────────────────────

alter table public.challenge_tasks
  add column if not exists updated_at timestamptz default now();

-- ── 3. RLS — friends can read challenge_tasks (for friend profile page) ──

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'challenge_tasks' and policyname = 'challenge_tasks: friend select'
  ) then
    create policy "challenge_tasks: friend select"
      on public.challenge_tasks for select
      using (
        exists (
          select 1 from public.friend_links fl
          where fl.user_id = auth.uid()
            and fl.friend_user_id = challenge_tasks.user_id
        )
      );
  end if;
end $$;

-- ── Done ──────────────────────────────────────────────────────────────────
