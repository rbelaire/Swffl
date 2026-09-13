-- ============================================================================
--  So Whopped FFL — Prediction game + member accounts (migration 003)
-- ----------------------------------------------------------------------------
--  Adds a members-vs-field NFL prediction game:
--    * Weekly game pick'em (1 pt per correct winner)
--    * Futures: division winners, conference winners, Super Bowl (1 pt each)
--  Plus real member accounts with roles (member vs. admin).
--
--  Safe to re-run. Run this AFTER schema.sql (and 002).
--
--  IMPORTANT change to your security model:
--    Before, ANY signed-in user could edit league data. Now only users flagged
--    is_admin = true can. Everyone else is a member who can only submit their
--    own predictions. Existing auth users are grandfathered in as admins below.
--    Turn Email sign-ups back ON (Authentication -> Providers -> Email) so
--    members can create accounts.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  profiles — one row per auth user (member or admin)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  manager_id   uuid references managers(id) on delete set null,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Admin check used by every write policy. SECURITY DEFINER so it can read
-- profiles without tripping over RLS.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Create a profile automatically whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change the is_admin flag (prevents self-promotion).
create or replace function public.protect_is_admin()
returns trigger language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'Only admins can change admin status';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_admin on profiles;
create trigger profiles_protect_admin
  before update on profiles
  for each row execute function public.protect_is_admin();

-- Grandfather existing auth users in as admins (usually just the commissioner),
-- so you don't lock yourself out. New sign-ups are members by default.
insert into profiles (id, is_admin)
select id, true from auth.users
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
--  Reference: NFL teams (with division + conference)
-- ----------------------------------------------------------------------------
create table if not exists nfl_teams (
  abbr       text primary key,
  name       text not null,
  conference text not null,   -- AFC / NFC
  division   text not null    -- e.g. "AFC East"
);

-- ----------------------------------------------------------------------------
--  Per-season config for the prediction game
-- ----------------------------------------------------------------------------
create table if not exists nfl_season (
  season_year     int primary key,
  is_current      boolean not null default false,
  futures_lock_at timestamptz,     -- futures picks lock at this time (e.g. kickoff of week 1)
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  NFL games (schedule + results). Picks lock at kickoff.
-- ----------------------------------------------------------------------------
create table if not exists nfl_games (
  id          uuid primary key default gen_random_uuid(),
  season_year int not null,
  week        int not null,
  kickoff     timestamptz,
  away_abbr   text not null references nfl_teams(abbr),
  home_abbr   text not null references nfl_teams(abbr),
  winner_abbr text references nfl_teams(abbr),  -- null until decided
  is_final    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists nfl_games_season_week on nfl_games (season_year, week);

-- ----------------------------------------------------------------------------
--  Member picks
-- ----------------------------------------------------------------------------
create table if not exists game_picks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  game_id    uuid not null references nfl_games(id) on delete cascade,
  pick_abbr  text not null references nfl_teams(abbr),
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);
create index if not exists game_picks_user on game_picks (user_id);

create table if not exists futures_picks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  season_year int not null,
  category    text not null,   -- 'division' | 'conference' | 'super_bowl'
  slot_key    text not null,   -- e.g. 'AFC East' | 'AFC' | 'SB'
  pick_abbr   text not null references nfl_teams(abbr),
  created_at  timestamptz not null default now(),
  unique (user_id, season_year, category, slot_key)
);
create index if not exists futures_picks_user on futures_picks (user_id);

-- Actual futures outcomes (admin fills in as they're decided)
create table if not exists futures_results (
  season_year int not null,
  category    text not null,
  slot_key    text not null,
  winner_abbr text references nfl_teams(abbr),
  primary key (season_year, category, slot_key)
);

-- ----------------------------------------------------------------------------
--  Pick-lock triggers (admins bypass so they can make corrections)
-- ----------------------------------------------------------------------------
create or replace function public.enforce_game_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare g nfl_games;
begin
  if public.is_admin() then return new; end if;
  select * into g from nfl_games where id = new.game_id;
  if g.is_final or (g.kickoff is not null and now() >= g.kickoff) then
    raise exception 'Picks are locked for this game';
  end if;
  if new.user_id <> auth.uid() then
    raise exception 'You can only submit your own picks';
  end if;
  return new;
end;
$$;
drop trigger if exists game_picks_lock on game_picks;
create trigger game_picks_lock
  before insert or update on game_picks
  for each row execute function public.enforce_game_lock();

create or replace function public.enforce_futures_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare lock_at timestamptz;
begin
  if public.is_admin() then return new; end if;
  select futures_lock_at into lock_at from nfl_season where season_year = new.season_year;
  if lock_at is not null and now() >= lock_at then
    raise exception 'Futures picks are locked for this season';
  end if;
  if new.user_id <> auth.uid() then
    raise exception 'You can only submit your own picks';
  end if;
  return new;
end;
$$;
drop trigger if exists futures_picks_lock on futures_picks;
create trigger futures_picks_lock
  before insert or update on futures_picks
  for each row execute function public.enforce_futures_lock();

-- ============================================================================
--  Leaderboard — aggregated so raw picks stay private. Anyone can read it.
-- ============================================================================
create or replace function public.prediction_leaderboard(p_season int)
returns table (
  user_id uuid,
  display_name text,
  weekly_pts bigint,
  futures_pts bigint,
  total_pts bigint
)
language sql stable security definer set search_path = public as $$
  with weekly as (
    select gp.user_id, count(*) as pts
    from game_picks gp
    join nfl_games g on g.id = gp.game_id
    where g.season_year = p_season
      and g.winner_abbr is not null
      and gp.pick_abbr = g.winner_abbr
    group by gp.user_id
  ),
  fut as (
    select fp.user_id, count(*) as pts
    from futures_picks fp
    join futures_results fr
      on fr.season_year = fp.season_year
     and fr.category = fp.category
     and fr.slot_key = fp.slot_key
    where fp.season_year = p_season
      and fr.winner_abbr is not null
      and fp.pick_abbr = fr.winner_abbr
    group by fp.user_id
  ),
  parts as (
    select user_id from weekly
    union select user_id from fut
    union select fp.user_id from futures_picks fp where fp.season_year = p_season
    union select gp.user_id from game_picks gp
      join nfl_games g on g.id = gp.game_id where g.season_year = p_season
  )
  select p.user_id,
         coalesce(pr.display_name, 'Member') as display_name,
         coalesce(w.pts, 0) as weekly_pts,
         coalesce(f.pts, 0) as futures_pts,
         coalesce(w.pts, 0) + coalesce(f.pts, 0) as total_pts
  from parts p
  left join profiles pr on pr.id = p.user_id
  left join weekly w on w.user_id = p.user_id
  left join fut f on f.user_id = p.user_id
  order by total_pts desc, weekly_pts desc;
$$;
grant execute on function public.prediction_leaderboard(int) to anon, authenticated;

-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table profiles        enable row level security;
alter table nfl_teams       enable row level security;
alter table nfl_season      enable row level security;
alter table nfl_games       enable row level security;
alter table game_picks      enable row level security;
alter table futures_picks   enable row level security;
alter table futures_results enable row level security;

-- profiles: everyone can read (for display names); you can create/edit your own;
-- admins can edit anyone (to promote / link managers).
drop policy if exists "profiles read"   on profiles;
drop policy if exists "profiles insert" on profiles;
drop policy if exists "profiles update" on profiles;
create policy "profiles read"   on profiles for select using (true);
create policy "profiles insert" on profiles for insert with check (id = auth.uid());
create policy "profiles update" on profiles for update using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- public read + admin write reference tables
do $$
declare t text;
begin
  foreach t in array array['nfl_teams','nfl_season','nfl_games','futures_results']
  loop
    execute format('drop policy if exists "public read %1$s" on %1$I;', t);
    execute format('drop policy if exists "admin write %1$s" on %1$I;', t);
    execute format('create policy "public read %1$s" on %1$I for select using (true);', t);
    execute format('create policy "admin write %1$s" on %1$I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- picks: a member manages only their own; admins can view all
do $$
declare t text;
begin
  foreach t in array array['game_picks','futures_picks']
  loop
    execute format('drop policy if exists "own read %1$s" on %1$I;', t);
    execute format('drop policy if exists "own write %1$s" on %1$I;', t);
    execute format('create policy "own read %1$s" on %1$I for select using (user_id = auth.uid() or public.is_admin());', t);
    execute format('create policy "own write %1$s" on %1$I for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());', t);
  end loop;
end $$;

-- ============================================================================
--  Tighten league tables: only admins may write (was: any authenticated user)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['managers','seasons','teams','roster_players','records','site_content','matchups','player_scores','draft_picks']
  loop
    execute format('drop policy if exists "auth write %1$s" on %1$I;', t);
    execute format('drop policy if exists "admin write %1$s" on %1$I;', t);
    execute format('create policy "admin write %1$s" on %1$I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- ============================================================================
--  Seed the 32 NFL teams
-- ============================================================================
insert into nfl_teams (abbr, name, conference, division) values
  ('BUF','Buffalo Bills','AFC','AFC East'),
  ('MIA','Miami Dolphins','AFC','AFC East'),
  ('NE','New England Patriots','AFC','AFC East'),
  ('NYJ','New York Jets','AFC','AFC East'),
  ('BAL','Baltimore Ravens','AFC','AFC North'),
  ('CIN','Cincinnati Bengals','AFC','AFC North'),
  ('CLE','Cleveland Browns','AFC','AFC North'),
  ('PIT','Pittsburgh Steelers','AFC','AFC North'),
  ('HOU','Houston Texans','AFC','AFC South'),
  ('IND','Indianapolis Colts','AFC','AFC South'),
  ('JAX','Jacksonville Jaguars','AFC','AFC South'),
  ('TEN','Tennessee Titans','AFC','AFC South'),
  ('DEN','Denver Broncos','AFC','AFC West'),
  ('KC','Kansas City Chiefs','AFC','AFC West'),
  ('LV','Las Vegas Raiders','AFC','AFC West'),
  ('LAC','Los Angeles Chargers','AFC','AFC West'),
  ('DAL','Dallas Cowboys','NFC','NFC East'),
  ('NYG','New York Giants','NFC','NFC East'),
  ('PHI','Philadelphia Eagles','NFC','NFC East'),
  ('WAS','Washington Commanders','NFC','NFC East'),
  ('CHI','Chicago Bears','NFC','NFC North'),
  ('DET','Detroit Lions','NFC','NFC North'),
  ('GB','Green Bay Packers','NFC','NFC North'),
  ('MIN','Minnesota Vikings','NFC','NFC North'),
  ('ATL','Atlanta Falcons','NFC','NFC South'),
  ('CAR','Carolina Panthers','NFC','NFC South'),
  ('NO','New Orleans Saints','NFC','NFC South'),
  ('TB','Tampa Bay Buccaneers','NFC','NFC South'),
  ('ARI','Arizona Cardinals','NFC','NFC West'),
  ('LAR','Los Angeles Rams','NFC','NFC West'),
  ('SF','San Francisco 49ers','NFC','NFC West'),
  ('SEA','Seattle Seahawks','NFC','NFC West')
on conflict (abbr) do nothing;

-- A current season row so the game has somewhere to live (edit in admin).
insert into nfl_season (season_year, is_current) values (2025, true)
on conflict (season_year) do nothing;
