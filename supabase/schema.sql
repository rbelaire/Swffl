-- ============================================================================
--  So Whopped FFL — Supabase schema
-- ----------------------------------------------------------------------------
--  Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--  It is safe to re-run: it drops and recreates the league tables.
--
--  Security model
--  --------------
--  * Everyone (anonymous visitors) can READ every table below.
--  * Only signed-in users can INSERT / UPDATE / DELETE.
--  * Signed-in users = your admins. Create their accounts yourself in
--    Authentication -> Users, and turn OFF public sign-ups
--    (Authentication -> Providers -> Email -> "Allow new users to sign up").
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Clean slate ---------------------------------------------------------------
drop table if exists player_scores  cascade;
drop table if exists matchups       cascade;
drop table if exists draft_picks    cascade;
drop table if exists roster_players cascade;
drop table if exists records        cascade;
drop table if exists teams          cascade;
drop table if exists seasons        cascade;
drop table if exists managers       cascade;
drop table if exists site_content   cascade;

-- ----------------------------------------------------------------------------
--  managers — the league members (owners)
-- ----------------------------------------------------------------------------
create table managers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  joined_year int,
  active      boolean not null default true,
  bio         text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  seasons — one row per year of the league
-- ----------------------------------------------------------------------------
create table seasons (
  id                    uuid primary key default gen_random_uuid(),
  year                  int not null unique,
  champion_id           uuid references managers(id) on delete set null,
  runner_up_id          uuid references managers(id) on delete set null,
  regular_season_id     uuid references managers(id) on delete set null, -- best regular-season record
  last_place_id         uuid references managers(id) on delete set null, -- the "sacko"
  notes                 text,
  regular_season_weeks  int default 14,
  playoff_teams         int default 6,
  roster_slots          jsonb,            -- lineup slots for optimal-lineup math (see migration 002)
  created_at            timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  teams — a manager's team for a given season (record + points)
-- ----------------------------------------------------------------------------
create table teams (
  id                  uuid primary key default gen_random_uuid(),
  season_id           uuid not null references seasons(id) on delete cascade,
  manager_id          uuid not null references managers(id) on delete cascade,
  team_name           text,
  wins                int not null default 0,
  losses              int not null default 0,
  ties                int not null default 0,
  points_for          numeric(7,2) not null default 0,
  points_against      numeric(7,2) not null default 0,
  regular_season_rank int,
  playoff_finish      int,           -- 1 = champion, 2 = runner-up, ...
  created_at          timestamptz not null default now(),
  unique (season_id, manager_id)
);

-- ----------------------------------------------------------------------------
--  roster_players — players on a team for a season
-- ----------------------------------------------------------------------------
create table roster_players (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  player_name text not null,
  position    text,                  -- QB, RB, WR, TE, K, DEF, ...
  nfl_team    text,
  slot        text,                  -- STARTER / BENCH / IR (free text)
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  records — hall-of-fame style notable records
-- ----------------------------------------------------------------------------
create table records (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,         -- e.g. "Most points in a game"
  holder      text,                  -- manager / team name
  value       text,                  -- e.g. "187.4"
  season_year int,
  description text,
  category    text default 'General',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  site_content — editable text blocks (About, Rules, Payouts, ...)
-- ----------------------------------------------------------------------------
create table site_content (
  key         text primary key,      -- e.g. "about", "rules", "payouts"
  title       text not null,
  body        text,                  -- markdown-ish plain text
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

-- Helpful indexes -----------------------------------------------------------
create index on teams (season_id);
create index on teams (manager_id);
create index on roster_players (team_id);

-- keep site_content.updated_at fresh ---------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger site_content_touch
  before update on site_content
  for each row execute function touch_updated_at();

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table managers       enable row level security;
alter table seasons        enable row level security;
alter table teams          enable row level security;
alter table roster_players enable row level security;
alter table records        enable row level security;
alter table site_content   enable row level security;

-- Public read + authenticated write, for every table.
do $$
declare t text;
begin
  foreach t in array array['managers','seasons','teams','roster_players','records','site_content']
  loop
    execute format('create policy "public read %1$s" on %1$I for select using (true);', t);
    execute format('create policy "auth write %1$s" on %1$I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
--  Sample data — safe to edit or delete once you add the real thing.
-- ============================================================================
insert into managers (name, slug, joined_year, active, bio) values
  ('Commissioner',      'commissioner', 2012, true,  'Founding member and league commissioner.'),
  ('The Dynasty',       'the-dynasty',  2012, true,  'Back-to-back-to-back. Allegedly.'),
  ('Waiver Wire Wizard','wizard',       2013, true,  'Never met a Tuesday pickup they didn''t love.'),
  ('Draft Day Legend',  'draft-legend', 2012, true,  'Wins the draft every year. The season is another matter.'),
  ('The Rebuilder',     'rebuilder',    2015, true,  '"We''re building for next year." — every year.'),
  ('Mr. Consistent',    'consistent',   2012, false, 'Retired after a legendary run. Emeritus.');

insert into seasons (year, notes,
    champion_id, runner_up_id, regular_season_id, last_place_id)
values
  (2024, 'A season for the ages — decided in the final week.',
    (select id from managers where slug='the-dynasty'),
    (select id from managers where slug='draft-legend'),
    (select id from managers where slug='the-dynasty'),
    (select id from managers where slug='rebuilder')),
  (2023, 'The Wizard''s waiver magic finally paid off.',
    (select id from managers where slug='wizard'),
    (select id from managers where slug='the-dynasty'),
    (select id from managers where slug='commissioner'),
    (select id from managers where slug='draft-legend'));

-- 2024 teams
insert into teams (season_id, manager_id, team_name, wins, losses, ties,
    points_for, points_against, regular_season_rank, playoff_finish)
select s.id, m.id, t.team_name, t.w, t.l, 0, t.pf, t.pa, t.rank, t.finish
from (values
  ('the-dynasty', 'Reigning & Defending', 11, 3, 1789.4, 1502.1, 1, 1),
  ('draft-legend','Auto-Draft Disasters',  9, 5, 1701.2, 1610.7, 3, 2),
  ('commissioner','The House Always Wins',  9, 5, 1688.0, 1599.9, 2, 3),
  ('wizard',      'Wire to Wire',           7, 7, 1622.5, 1655.3, 4, 4),
  ('consistent',  'Old Reliable',           6, 8, 1540.8, 1670.2, 5, 5),
  ('rebuilder',   'Tanks for Nothing',      3,11, 1402.6, 1704.8, 6, 6)
) as t(slug, team_name, w, l, pf, pa, rank, finish)
join managers m on m.slug = t.slug
join seasons  s on s.year = 2024;

-- 2023 teams
insert into teams (season_id, manager_id, team_name, wins, losses, ties,
    points_for, points_against, regular_season_rank, playoff_finish)
select s.id, m.id, t.team_name, t.w, t.l, 0, t.pf, t.pa, t.rank, t.finish
from (values
  ('wizard',      'Wire to Wire',          10, 4, 1712.9, 1520.4, 3, 1),
  ('the-dynasty', 'Reigning & Defending',  11, 3, 1755.1, 1498.0, 1, 2),
  ('commissioner','The House Always Wins', 10, 4, 1699.3, 1544.7, 2, 3),
  ('consistent',  'Old Reliable',           7, 7, 1601.0, 1622.5, 4, 4),
  ('rebuilder',   'Tanks for Nothing',      5, 9, 1490.2, 1655.9, 5, 5),
  ('draft-legend','Auto-Draft Disasters',   3,11, 1450.6, 1712.9, 6, 6)
) as t(slug, team_name, w, l, pf, pa, rank, finish)
join managers m on m.slug = t.slug
join seasons  s on s.year = 2023;

-- a few sample rosters for the 2024 champion
insert into roster_players (team_id, player_name, position, nfl_team, slot, sort_order)
select t.id, r.player_name, r.pos, r.nfl, r.slot, r.ord
from (values
  ('QB',  'Star Quarterback', 'DAL', 'STARTER', 1),
  ('RB',  'Workhorse Back',   'SF',  'STARTER', 2),
  ('RB',  'Committee Back',   'DET', 'STARTER', 3),
  ('WR',  'Alpha Receiver',   'MIN', 'STARTER', 4),
  ('WR',  'Slot Machine',     'MIA', 'STARTER', 5),
  ('TE',  'Red Zone Threat',  'KC',  'STARTER', 6),
  ('K',   'Automatic Leg',    'BAL', 'STARTER', 7),
  ('DEF', 'Ballhawks',        'NYJ', 'STARTER', 8)
) as r(pos, player_name, nfl, slot, ord)
join teams t on t.team_name = 'Reigning & Defending'
  and t.season_id = (select id from seasons where year = 2024);

insert into records (title, holder, value, season_year, description, category, sort_order) values
  ('Most points in a season', 'The Dynasty', '1789.4', 2024, 'A regular-season scoring record that still stands.', 'Scoring', 1),
  ('Most points in a game',   'Commissioner','187.4',  2022, 'The single-week high-water mark.', 'Scoring', 2),
  ('Longest win streak',      'The Dynasty', '11 games',2024, 'Nearly a perfect regular season.', 'Streaks', 3),
  ('Most championships',      'The Dynasty', '3 titles',null, 'The most decorated franchise in league history.', 'Titles', 4);

insert into site_content (key, title, body, sort_order) values
  ('about', 'About the League',
   'So Whopped FFL has been running strong for 14 seasons. What started as a group of friends talking trash has become a bona fide dynasty league — complete with rivalries, dramatic finishes, and a trophy that means everything.

Half a league''s worth of managers have come and gone, but the competition (and the group chat) never stops.', 1),
  ('rules', 'League Rules',
   '• 12-team, half-PPR scoring.
• Snake draft, order set by reverse standings with a lottery for the bottom three.
• Standard roster: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DEF, 6 BENCH.
• Trade deadline: Week 10. All trades subject to commissioner review.
• Waivers run Wednesday morning on a FAAB budget of $100.', 2),
  ('payouts', 'Payouts & Dues',
   '• Buy-in: set each preseason by a league vote.
• 1st place: 60% of the pot + the trophy for a year.
• 2nd place: 25%.
• Regular-season points leader: 15%.
• Last place: brings the trophy engraving money and picks the following year''s punishment.', 3);

-- ============================================================================
--  ADVANCED STATS (folded in from migrations/002_advanced_stats.sql)
-- ============================================================================
