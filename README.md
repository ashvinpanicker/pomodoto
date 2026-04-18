# 🍅 PomoDoto

> Focus hard. Earn games. Stay consistent.

A mobile-first Pomodoro timer gamified for ADHD brains. Complete focus sessions, earn Dota game time, level up, and build streaks. Fully vibecoded with Claude Sonnet 4.6

---

## Features

- **Pomodoro Timer** — Adjustable sessions (15–60 min) with Start/Pause/Resume/Cancel
- **Session Labels** — Work, Gym, Thinking, Learning, Deep Work, Creative + custom labels
- **Reward System** — 2 Pomodoros = 1 Dota game earned
- **XP & Leveling** — 50 XP per Pomodoro, 500 XP to level up
- **Daily Streaks** — Streak tracking with bonus XP
- **Achievements** — 12 unlockable badges (First Blood, On Fire, Week Warrior...)
- **Analytics** — 7-day activity chart, category breakdown donut, recent sessions
- **Dark Mode** — Default dark, mobile-first design
- **Confetti & Sounds** — Celebration animations on completion
- **PWA** — Installable as a mobile app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | TailwindCSS |
| Auth + DB | Supabase (Google OAuth + Postgres) |
| Charts | Recharts |
| Animations | Framer Motion + canvas-confetti |
| Icons | Lucide React |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd pomo-dota
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Enable **Google OAuth** in Authentication → Providers → Google
   - Add your Google Client ID and Secret
   - Set callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
npx vercel
```

Set the same environment variables in Vercel dashboard.

After deploying:
1. Update Supabase → Authentication → URL Configuration:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`
2. Update Google OAuth redirect URI to `https://your-project.supabase.co/auth/v1/callback`

---

## Database Schema

```
profiles          — user stats (XP, level, streak, pomodoros, dota games)
sessions          — individual pomodoro records (label, duration, completed, xp)
achievements      — unlocked achievement keys per user
```

---

## Gamification Design

| Action | Reward |
|---|---|
| Complete Pomodoro | +50 XP |
| Active streak bonus | +10 XP |
| 2 Pomodoros | 1 Dota game unlocked |
| First Pomodoro | Achievement: First Blood (+100 XP) |
| 5 in a day | Achievement: On Fire (+200 XP) |
| 3-day streak | Achievement: Consistent (+200 XP) |
| 7-day streak | Achievement: Week Warrior (+500 XP) |

---

## Architecture

```
app/
  page.tsx              → Landing / Google Sign-In
  dashboard/page.tsx    → Timer + XP bar
  analytics/page.tsx    → Charts + Stats
  rewards/page.tsx      → Dota wallet + Achievements
  profile/page.tsx      → User profile
  auth/callback/        → OAuth callback handler

components/
  timer/                → PomodoroTimer, LabelSelector
  gamification/         → XPBar, StreakBadge, RewardWallet, AchievementCard
  analytics/            → StatsCards, ActivityChart, CategoryDonut, RecentSessions
  layout/               → AppShell, Sidebar, BottomNav
  ui/                   → Button, Card, Progress

hooks/
  useTimer.ts           → Timer state + localStorage persistence
  useGameState.ts       → XP, sessions, achievements, Supabase sync
  useUser.ts            → Auth state

lib/
  gamification.ts       → Achievement definitions, streak calc, level titles
  supabase/             → Client + server Supabase instances
  utils.ts              → Formatting, audio, helpers
```
