# 75 Hard Tracker

A mobile-first accountability tracker for the 75 Hard mental toughness challenge. Track daily tasks, upload progress photos, and stay accountable with a friend — all in a dark, athletic-themed PWA.

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
- **Daily checklist** — 8 tasks, one tap to toggle, auto-saved to Supabase
- **Progress bar** — See X/8 tasks completed at a glance
- **Notes** — Log your thoughts for each day
- **Progress photos** — Upload and preview directly in the app
- **Calendar grid** — 75-day visual grid with green/yellow/red day statuses
- **Streak tracker** — Current win streak shown on the calendar
- **Friends** — Add accountability partners by email, see their daily progress
- **Settings** — Set your start date, edit your name, reset the challenge
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
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Storage → New bucket**, name it `progress-photos`, set **Public** to **off**

### 3. Configure environment variables

In Supabase → **Project Settings → API**, copy your Project URL and anon key.

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Configure Auth (important!)

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

## Project Structure

```
src/
├── app/
│   ├── page.tsx             # Landing page
│   ├── login/page.tsx       # Auth (login + signup tabs)
│   ├── dashboard/page.tsx   # Daily checklist + photo + notes
│   ├── calendar/page.tsx    # 75-day grid + stats
│   ├── friends/page.tsx     # Add/view accountability partners
│   └── settings/page.tsx    # Profile, start date, reset
├── components/
│   ├── Nav.tsx              # Bottom navigation bar
│   ├── DailyChecklist.tsx   # 8 task cards
│   ├── CalendarGrid.tsx     # 75-day color-coded grid
│   ├── FriendCard.tsx       # Friend progress card
│   ├── PhotoUpload.tsx      # Camera / file upload
│   ├── ProgressBar.tsx      # X/8 progress bar
│   └── DayStatus.tsx        # Day X / 75 header
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts        # Server Supabase client (SSR)
│   └── utils.ts             # Date, challenge, streak helpers
└── types/
    └── database.ts          # Supabase types + task metadata
supabase/
└── schema.sql               # Tables, triggers, RLS, storage policies
middleware.ts                # Auth route protection
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Monday-Ready Checklist

### Supabase
- [ ] Project created
- [ ] `supabase/schema.sql` executed
- [ ] `progress-photos` bucket created (private)
- [ ] Auth email confirmation configured

### App
- [ ] `.env.local` filled in
- [ ] `npm run dev` runs without errors
- [ ] Sign up works and redirects to dashboard
- [ ] Daily checklist toggles and persists
- [ ] Start date set, Day X / 75 shown
- [ ] Photo upload works
- [ ] Calendar shows colored grid
- [ ] Friend add by email works

### Deployment
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Env vars set in Vercel
- [ ] Supabase Auth URLs updated for prod
- [ ] PWA installs on mobile (Add to Home Screen)

---

## Future Improvements

- Push notifications for daily reminders
- Streak celebration animations
- Progress photo gallery view
- Friend leaderboard
- Multiple concurrent challenges
