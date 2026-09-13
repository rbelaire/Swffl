# So Whopped FFL

The official website for the **So Whopped FFL** — a 14-year (and counting)
fantasy football dynasty league. Stats, rosters, records, full league history,
and a password-protected admin area for easy updates.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and
**Supabase** (Postgres + Auth).

- Clean navy & white design, black-on-white / white-on-navy.
- Modern, self-hosted web fonts (Inter + Space Grotesk) that load everywhere.
- Fully responsive, works great on phones.
- All content is editable from the admin dashboard — no code required.

---

## What's on the site

| Page | What it shows |
| --- | --- |
| **Home** | Reigning champion, key stats, all-time leaders, records, About/Rules |
| **Standings** | Final records & finishes, one season at a time |
| **Stats** | All-time career leaderboard (computed automatically) |
| **Rosters** | Every team's roster, by season |
| **History** | Champions timeline + editable info blocks |
| **Managers** | Per-manager career profile pages (titles, rivals, season-by-season) |
| **Admin** | Login + full create/edit/delete + bulk importer |

### Analytics (the fun stuff)

| Page | What it shows |
| --- | --- |
| **Optimal Lineups** | Alternate "best-ball" standings + coaching efficiency (points left on the bench) |
| **Power Rankings** | Auto-computed weekly rankings with movement arrows |
| **Playoff Odds** | Monte-Carlo simulation of the rest of the season (playoff & title %) |
| **Luck Index** | All-play record vs. actual record — skill vs. schedule |
| **Head-to-Head** | All-time grid of every manager vs. every other, plus rivalries |
| **Draft Room** | Every pick, graded in hindsight against points scored |
| **Record Book** | Auto-detected records (highest week, blowouts, etc.) + manual records |
| **Awards** | Per-season superlatives (champion, best manager, MVP, the Sacko) |

These light up automatically once you load the data below — until then each page
shows a friendly empty state.

### NFL Prediction Pool

| Page | What it does |
| --- | --- |
| **Predict** | Members-vs-field NFL pick'em with a live leaderboard |
| **Weekly Picks** | Pick the winner of every NFL game; locks at kickoff |
| **Futures** | Call all 8 division winners, both conference champs, and the Super Bowl |
| **Leaderboard** | 1 point per correct pick, ranked |

Members sign in with their own account and can only edit **their own** picks;
admins keep full control of everything else.

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the dashboard, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run** it. This creates
   all tables, security policies, and some sample data.

> **Already ran an older `schema.sql`?** Instead of re-running it (which resets
> data), run the migrations you're missing, in order:
> [`002_advanced_stats.sql`](supabase/migrations/002_advanced_stats.sql) (analytics
> tables) and [`003_prediction_game.sql`](supabase/migrations/003_prediction_game.sql)
> (member accounts + the NFL prediction pool).

### 3. Add your environment variables

Copy the example file and fill in your project's values (found in
**Project Settings → API**):

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Accounts & roles

There are two kinds of account, both Supabase Auth users:

- **Members** — anyone who signs up at `/login`. They can submit their own NFL
  predictions and nothing else.
- **Admins** — members with `is_admin = true`. They can edit all league data
  and run the prediction pool.

Setup:

1. **Authentication → Providers → Email** — turn sign-ups **ON** so members can
   register (they'll appear under **Admin → Members**).
2. Create your own account at `/login`. When you run migration `003`, all
   existing auth users are auto-promoted to admin, so the first account(s) you
   make are admins. After that, promote anyone else from **Admin → Members**.
3. Prefer email confirmation on for a public site; off is fine for a small
   private league.

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Members sign in at
`/login`; admins manage the site at `/admin`.

---

## Editing your league data

Everything is managed from **/admin**:

1. **Managers** — add every league member first.
2. **Seasons** — one per year; pick the champion, runner-up, etc.
3. **Teams** — each manager's team for a season, with W/L/T and points.
4. **Rosters** — add players to any team.
5. **Records** — league records shown on the Records page.
6. **Site Content** — the About / Rules / Payouts text blocks.

> **All-time stats are automatic.** The Stats page and the "All-Time Leaders"
> table compute wins, championships, and win % from your season/team data —
> you never enter totals by hand.

### Loading lots of data (Bulk Import)

Entering 14 years by hand is brutal, so **Admin → Bulk Import** takes CSV (or a
JSON array) and matches seasons/teams for you by **year** and **manager
name/slug**. Add Managers, Seasons and Teams first, then paste one of these:

**Matchups** — one row per game (leave scores blank for future games):

```csv
year,week,home,away,home_score,away_score,is_playoff,round
2024,1,the-dynasty,draft-legend,132.5,118.9,false,
2024,15,the-dynasty,commissioner,,,true,Championship
```

**Player scores** — one row per player per week, **starters and bench** (this
powers optimal lineups, coaching efficiency, MVPs and draft grades):

```csv
year,manager,week,player,position,nfl_team,slot,points,is_playoff
2024,the-dynasty,1,Star Quarterback,QB,DAL,QB,24.3,false
2024,the-dynasty,1,Benched Stud,RB,GB,BENCH,22.9,false
```

`slot` is the position for starters (`QB/RB/WR/TE/FLEX/K/DEF`) or `BENCH`/`IR`.

**Draft picks:**

```csv
year,round,pick,overall,manager,player,position,nfl_team,is_keeper
2024,1,1,1,rebuilder,Workhorse Back,RB,SF,false
```

**NFL schedule** (for the prediction pool — use team abbreviations, leave
`kickoff`/`winner` blank until known):

```csv
year,week,kickoff,away,home,winner,is_final
2025,1,2025-09-07T17:00:00Z,DAL,PHI,,false
```

The importer previews everything and flags any rows it can't match before you
commit — nothing is written until you click **Import**.

### Running the prediction pool

1. **Admin → NFL Seasons** — create the season, mark it **current**, and set
   **Futures lock** (usually kickoff of Week 1) so futures freeze on time.
2. **Admin → NFL Games** — add the schedule (or bulk-import it). Each game's
   picks lock automatically at its kickoff time.
3. As games finish, set each game's **winner** + **Final** (or import them).
4. **Admin → Futures Results** — set division/conference/Super Bowl winners as
   they're decided.

The leaderboard scores everything automatically (1 pt per correct pick).

### Custom lineup rules (optional)

Optimal-lineup math assumes a standard half-PPR lineup. If a season used
different slots, edit that season in **Admin → Seasons** and set **Roster Slots**
(JSON), e.g. a superflex league:

```json
[
  {"slot":"QB","eligible":["QB"],"count":1},
  {"slot":"RB","eligible":["RB"],"count":2},
  {"slot":"WR","eligible":["WR"],"count":2},
  {"slot":"TE","eligible":["TE"],"count":1},
  {"slot":"FLEX","eligible":["RB","WR","TE"],"count":1},
  {"slot":"SUPERFLEX","eligible":["QB","RB","WR","TE"],"count":1},
  {"slot":"K","eligible":["K"],"count":1},
  {"slot":"DEF","eligible":["DEF"],"count":1}
]
```

---

## How security works

The database uses Postgres **Row Level Security**:

- **Anyone** can *read* league data (that's the public site).
- **Only admins** (`profiles.is_admin = true`) can *create, edit, or delete*
  league data.
- **Members** can only read/write **their own** prediction picks — enforced by
  RLS and by database triggers that also lock picks at kickoff.

The Supabase anon key is safe to expose in the browser — RLS is what protects
your data. Never commit a `service_role` key; this project doesn't use one.

---

## Deploying (Vercel — recommended)

1. Push this repo to GitHub.
2. Import it at [vercel.com](https://vercel.com) → **New Project**.
3. Add the two environment variables from `.env.local` in the Vercel project
   settings.
4. Deploy. In Supabase, add your Vercel URL under
   **Authentication → URL Configuration → Site URL / Redirect URLs**.

Any host that runs Next.js (Netlify, Render, a VPS, etc.) works too.

---

## Project structure

```
src/
  app/
    page.tsx              Home
    standings/            Standings
    stats/                All-time stats
    rosters/              Rosters
    records/              Records
    history/              History + info
    admin/                Auth-protected dashboard + CRUD
  components/             Nav, Footer, shared UI, admin table editor
  lib/
    data.ts               Data fetching + stat calculations
    types.ts              Shared types
    supabase/             Browser / server / middleware clients
supabase/
  schema.sql              Run this in Supabase to set everything up
public/                   Logo variants + icon
```

---

## Notes

- The site renders fine **before** Supabase is connected — you'll see sample
  content and a reminder to finish setup.
- Adding external stats APIs later is easy; the data layer in `src/lib/data.ts`
  is the single place to extend.

Built for the league, by the league. 🏆
