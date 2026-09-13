-- ============================================================================
--  So Whopped FFL — Advanced stats expansion (migration 002)
-- ----------------------------------------------------------------------------
--  ADD THIS on top of an existing install (you already ran schema.sql).
--  Safe to re-run: everything is guarded with IF NOT EXISTS / drop-and-create.
--
--  Unlocks: optimal lineups & alternate standings, coaching efficiency,
--  head-to-head, rivalries, luck index, power rankings, playoff odds,
--  draft history & grades, auto record book, awards, manager profiles.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Per-season settings used by the analytics engine
-- ----------------------------------------------------------------------------
alter table seasons add column if not exists regular_season_weeks int default 14;
alter table seasons add column if not exists playoff_teams        int default 6;
-- Roster/lineup slots for computing OPTIMAL lineups. JSON array of slots:
--   [{"slot":"QB","eligible":["QB"],"count":1}, ...]
-- Leave NULL to use the app's sensible default (half-PPR standard).
alter table seasons add column if not exists roster_slots jsonb;

-- ----------------------------------------------------------------------------
--  matchups — one row per head-to-head game (regular season + playoffs)
-- ----------------------------------------------------------------------------
create table if not exists matchups (
  id           uuid primary key default gen_random_uuid(),
  season_id    uuid not null references seasons(id) on delete cascade,
  week         int not null,
  is_playoff   boolean not null default false,
  round        text,                    -- optional label: "Quarterfinal", "Championship"
  home_team_id uuid not null references teams(id) on delete cascade,
  away_team_id uuid not null references teams(id) on delete cascade,
  home_score   numeric(7,2),            -- NULL = not played yet (used by playoff odds)
  away_score   numeric(7,2),
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  player_scores — a player's weekly line for a team (starters AND bench)
--  This is what powers optimal lineups, coaching efficiency, player records.
-- ----------------------------------------------------------------------------
create table if not exists player_scores (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references seasons(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  week        int not null,
  is_playoff  boolean not null default false,
  player_name text not null,
  position    text,                     -- QB, RB, WR, TE, K, DEF
  nfl_team    text,
  lineup_slot text,                     -- QB/RB/WR/TE/FLEX/K/DEF = started; BENCH/IR = not
  points      numeric(7,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  draft_picks — every draft pick, for draft history & retroactive grades
-- ----------------------------------------------------------------------------
create table if not exists draft_picks (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references seasons(id) on delete cascade,
  round       int,
  pick        int,                      -- pick within the round
  overall     int,                      -- overall pick number
  team_id     uuid references teams(id) on delete set null,
  player_name text not null,
  position    text,
  nfl_team    text,
  is_keeper   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes -------------------------------------------------------------------
create index if not exists matchups_season_idx      on matchups (season_id, week);
create index if not exists player_scores_team_idx    on player_scores (team_id, week);
create index if not exists player_scores_season_idx  on player_scores (season_id, week);
create index if not exists draft_picks_season_idx    on draft_picks (season_id, overall);

-- ----------------------------------------------------------------------------
--  Row Level Security: public read, authenticated (admin) write
-- ----------------------------------------------------------------------------
alter table matchups      enable row level security;
alter table player_scores enable row level security;
alter table draft_picks   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['matchups','player_scores','draft_picks']
  loop
    execute format('drop policy if exists "public read %1$s" on %1$I;', t);
    execute format('drop policy if exists "auth write %1$s"  on %1$I;', t);
    execute format('create policy "public read %1$s" on %1$I for select using (true);', t);
    execute format('create policy "auth write %1$s" on %1$I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
--  Small sample data so the new pages render immediately (safe to delete).
--  Adds Week 1 of the 2024 season: 3 matchups + full player lines for one
--  featured matchup (so optimal-lineup differs from actual), plus a few picks.
-- ============================================================================
do $$
declare
  s2024 uuid;
  t_dyn uuid; t_leg uuid; t_com uuid; t_wiz uuid; t_con uuid; t_reb uuid;
begin
  select id into s2024 from seasons where year = 2024;
  if s2024 is null then return; end if;

  -- set standard slots + season shape on 2024 if unset
  update seasons
     set roster_slots = coalesce(roster_slots, '[
        {"slot":"QB","eligible":["QB"],"count":1},
        {"slot":"RB","eligible":["RB"],"count":2},
        {"slot":"WR","eligible":["WR"],"count":2},
        {"slot":"TE","eligible":["TE"],"count":1},
        {"slot":"FLEX","eligible":["RB","WR","TE"],"count":1},
        {"slot":"K","eligible":["K"],"count":1},
        {"slot":"DEF","eligible":["DEF"],"count":1}
      ]'::jsonb),
      regular_season_weeks = coalesce(regular_season_weeks, 14),
      playoff_teams = coalesce(playoff_teams, 6)
   where id = s2024;

  select t.id into t_dyn from teams t join managers m on m.id=t.manager_id where t.season_id=s2024 and m.slug='the-dynasty';
  select t.id into t_leg from teams t join managers m on m.id=t.manager_id where t.season_id=s2024 and m.slug='draft-legend';
  select t.id into t_com from teams t join managers m on m.id=t.manager_id where t.season_id=s2024 and m.slug='commissioner';
  select t.id into t_wiz from teams t join managers m on m.id=t.manager_id where t.season_id=s2024 and m.slug='wizard';
  select t.id into t_con from teams t join managers m on m.id=t.manager_id where t.season_id=s2024 and m.slug='consistent';
  select t.id into t_reb from teams t join managers m on m.id=t.manager_id where t.season_id=s2024 and m.slug='rebuilder';

  -- only seed once
  if exists (select 1 from matchups where season_id=s2024 and week=1) then return; end if;

  insert into matchups (season_id, week, home_team_id, away_team_id, home_score, away_score) values
    (s2024, 1, t_dyn, t_leg, 132.5, 118.9),
    (s2024, 1, t_com, t_wiz, 121.0, 140.2),
    (s2024, 1, t_con, t_reb, 99.8, 105.4);

  -- Featured matchup player lines: The Dynasty vs Draft Legend (week 1)
  -- Note a bench player outscoring a starter to demonstrate optimal lineups.
  insert into player_scores (season_id, team_id, week, player_name, position, nfl_team, lineup_slot, points) values
    (s2024, t_dyn, 1, 'Star Quarterback','QB','DAL','QB',24.3),
    (s2024, t_dyn, 1, 'Workhorse Back','RB','SF','RB',18.7),
    (s2024, t_dyn, 1, 'Committee Back','RB','DET','RB',9.2),
    (s2024, t_dyn, 1, 'Alpha Receiver','WR','MIN','WR',21.4),
    (s2024, t_dyn, 1, 'Slot Machine','WR','MIA','WR',11.1),
    (s2024, t_dyn, 1, 'Red Zone Threat','TE','KC','TE',14.0),
    (s2024, t_dyn, 1, 'Flex Winner','WR','HOU','FLEX',16.6),
    (s2024, t_dyn, 1, 'Automatic Leg','K','BAL','K',9.0),
    (s2024, t_dyn, 1, 'Ballhawks','DEF','NYJ','DEF',8.2),
    (s2024, t_dyn, 1, 'Benched Stud','RB','GB','BENCH',22.9),   -- should have started!
    (s2024, t_dyn, 1, 'Deep Bench WR','WR','LAR','BENCH',4.1),
    -- Draft Legend
    (s2024, t_leg, 1, 'Gunslinger QB','QB','BUF','QB',26.8),
    (s2024, t_leg, 1, 'Bell Cow','RB','BAL','RB',20.1),
    (s2024, t_leg, 1, 'Rookie Sensation','RB','LV','RB',7.7),
    (s2024, t_leg, 1, 'Route Technician','WR','CIN','WR',15.9),
    (s2024, t_leg, 1, 'Big Play WR','WR','PHI','WR',12.3),
    (s2024, t_leg, 1, 'Move TE','TE','DET','TE',8.4),
    (s2024, t_leg, 1, 'Flex Dart','RB','ATL','FLEX',6.8),
    (s2024, t_leg, 1, 'Steady Leg','K','SF','K',7.0),
    (s2024, t_leg, 1, 'Blitz Bunch','DEF','CLE','DEF',6.9),
    (s2024, t_leg, 1, 'Bench Breakout','WR','TB','BENCH',19.4),  -- should have started!
    (s2024, t_leg, 1, 'Handcuff RB','RB','NO','BENCH',3.2);

  -- a couple of draft picks (2024)
  insert into draft_picks (season_id, round, pick, overall, team_id, player_name, position, nfl_team) values
    (s2024, 1, 1, 1, t_reb, 'Workhorse Back','RB','SF'),
    (s2024, 1, 2, 2, t_com, 'Alpha Receiver','WR','MIN'),
    (s2024, 1, 3, 3, t_dyn, 'Star Quarterback','QB','DAL');
end $$;
