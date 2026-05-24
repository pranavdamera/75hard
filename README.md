# 75 Hard Tracker

A mobile-first accountability tracker for the 75 Hard mental toughness challenge. Track daily tasks, upload progress photos, log meals and workouts, and stay accountable with friends — all in a dark, athletic-themed PWA.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres + Row Level Security |
| Storage | Supabase Storage (progress photos) |
| Deployment | Vercel |

## Features

- **Auth** — Sign up / sign in with email and password
- **Onboarding** — Multi-step setup: name, start date, challenge style (strict or custom), task selection, goal and body stats
- **Customizable tasks** — Choose which of 7 tasks to track; progress count reflects your selection (e.g. 5/5 if you have 5 tasks enabled)
- **Daily checklist** — Expandable rows for Indoor/Outdoor Workout (minutes + notes) and Diet (breakfast/lunch/dinner/snacks)
- **Progress bar** — Dynamic X/N based on enabled tasks, with motivational microcopy
- **Notes** — Log general thoughts for each day
- **Progress photos** — Upload and preview directly in the app
- **Calendar grid** — 75-day visual grid with complete/partial/missed statuses
- **Day detail drawer** — Tap any past day in the calendar to see a full summary (tasks, workout notes, meal logs, photo)
- **Progress photo gallery** — Grid view of all progress photos on the calendar page
- **Streak tracker** — Current win streak based on your enabled tasks
- **Friends** — Add accountability partners by email, see their daily progress
- **Nutrition page** — BMR/TDEE calculator using Mifflin-St Jeor; outputs calorie target and protein/carb/fat macros; saved to your profile for dashboard display
- **Settings** — Profile, start date, reset challenge, friend notifications
- **PWA-ready** — Manifest + mobile meta tags for Add to Home Screen

---

## Local Development

### 1. Clone and install

```bash
git clone <your-repo>
cd 75hard
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query**
3. **For a brand new project:** paste `supabase/schema.sql` and run it
4. **For an existing project:** paste `supabase/migration.sql` and run it (safe to re-run)
5. Go to **Storage → New bucket** (or find existing), name it `progress-photos`
6. **Set the bucket to Public** (Storage → progress-photos → Make public) — the app uses public URLs for photo display

### 3. Configure environment variables

In Supabase → **Project Settings → API**, copy your Project URL and anon key.

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Configure Auth

In Supabase → **Authentication → Settings**:
- Set **Site URL** to `http://localhost:3000`
- Optionally disable **Confirm email** for easier local testing

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com) → New Project
3. Add env vars in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
5. Update Supabase Auth → **Site URL** and **Redirect URLs** to your Vercel domain

---

## Database Schema

### Core tables

| Table | Purpose |
|---|---|
| `profiles` | User profile, onboarding state, body stats |
| `daily_logs` | Per-day task completion, workout notes, meal logs, photo URL |
| `challenge_tasks` | Per-user enabled task list with sort order |
| `nutrition_goals` | Saved calorie/macro targets |
| `friend_links` | Accountability partner connections |

### Running a migration on an existing database

If you already have the original schema, run `supabase/migration.sql` in the SQL editor. It:
- Adds new columns to `profiles` and `daily_logs` if they don't exist
- Marks existing users as `onboarding_completed = true` (so they skip the flow)
- Creates `challenge_tasks` and `nutrition_goals` tables with RLS
- Backfills 7 default challenge tasks for every existing user
- Maps `workout_1_done → indoor_workout_done` for historical data

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx               # Landing page
│   ├── login/page.tsx         # Auth (login + signup tabs)
│   ├── onboarding/page.tsx    # 4-step new user setup
│   ├── dashboard/page.tsx     # Daily checklist + photo + notes
│   ├── calendar/page.tsx      # 75-day grid + day detail drawer + photo gallery
│   ├── friends/page.tsx       # Add/view accountability partners
│   ├── nutrition/page.tsx     # BMR/TDEE calculator + macro targets
│   └── settings/page.tsx      # Profile, start date, reset
├── components/
│   ├── Nav.tsx                # Bottom navigation (5 items)
│   ├── DailyChecklist.tsx     # Task rows: expandable workout/diet, simple toggles
│   ├── CalendarGrid.tsx       # 75-day color-coded grid
│   ├── FriendCard.tsx         # Friend progress card
│   ├── PhotoUpload.tsx        # Camera / file upload
│   ├── ProgressBar.tsx        # Dynamic X/N progress bar
│   └── DayStatus.tsx          # Day X / 75 header
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   └── server.ts          # Server Supabase client (SSR)
│   └── utils.ts               # Date, challenge, streak, nutrition calc helpers
└── types/
    └── database.ts            # Supabase types + task metadata constants
supabase/
├── schema.sql                 # Full schema for new projects
└── migration.sql              # Safe incremental migration for existing projects
middleware.ts                  # Auth route protection
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Deployment / Test Checklist

### Supabase
- [ ] Run `supabase/migration.sql` (or `schema.sql` for new project)
- [ ] `progress-photos` bucket exists and is set to **Public**
- [ ] Auth email confirmation configured
- [ ] Auth site URL and redirect URLs set correctly

### New user flow
- [ ] Sign up redirects to `/onboarding`
- [ ] Onboarding completes and redirects to `/dashboard`
- [ ] Dashboard shows only selected tasks
- [ ] Progress count is `N/N` based on selected task count

### Dashboard
- [ ] Indoor Workout + Outdoor Workout rows shown (not Workout 1/2)
- [ ] Expand workout row → minutes + notes inputs → Save works
- [ ] Diet row → "log meals" → 4 meal fields → Save Meals works
- [ ] Progress photo upload / display works
- [ ] Nutrition goal card shows if goals are saved

### Calendar
- [ ] Tap past day → bottom sheet opens with task/meal/photo detail
- [ ] "View/Edit in Dashboard" button navigates correctly
- [ ] Progress photo gallery shows all uploaded photos

### Nutrition
- [ ] Form calculates with valid inputs
- [ ] Save As My Goals persists and shows on dashboard card
- [ ] Pre-fills stats from profile on return visit

### Existing users (post-migration)
- [ ] Existing users skip onboarding (onboarding_completed = true)
- [ ] All 7 challenge tasks are present in `challenge_tasks` table
- [ ] Historical workout_1_done data backfilled to indoor_workout_done
