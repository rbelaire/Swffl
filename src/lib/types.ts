export type Manager = {
  id: string;
  name: string;
  slug: string | null;
  joined_year: number | null;
  active: boolean;
  bio: string | null;
  created_at?: string;
};

export type RosterSlot = {
  slot: string;
  eligible: string[];
  count: number;
};

export type Season = {
  id: string;
  year: number;
  champion_id: string | null;
  runner_up_id: string | null;
  regular_season_id: string | null;
  last_place_id: string | null;
  notes: string | null;
  regular_season_weeks?: number | null;
  playoff_teams?: number | null;
  roster_slots?: RosterSlot[] | null;
  created_at?: string;
};

export type Matchup = {
  id: string;
  season_id: string;
  week: number;
  is_playoff: boolean;
  round: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  created_at?: string;
};

export type PlayerScore = {
  id: string;
  season_id: string;
  team_id: string;
  week: number;
  is_playoff: boolean;
  player_name: string;
  position: string | null;
  nfl_team: string | null;
  lineup_slot: string | null;
  points: number;
  created_at?: string;
};

export type DraftPick = {
  id: string;
  season_id: string;
  round: number | null;
  pick: number | null;
  overall: number | null;
  team_id: string | null;
  player_name: string;
  position: string | null;
  nfl_team: string | null;
  is_keeper: boolean;
  created_at?: string;
};

export type Team = {
  id: string;
  season_id: string;
  manager_id: string;
  team_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  regular_season_rank: number | null;
  playoff_finish: number | null;
  created_at?: string;
};

export type RosterPlayer = {
  id: string;
  team_id: string;
  player_name: string;
  position: string | null;
  nfl_team: string | null;
  slot: string | null;
  sort_order: number;
  created_at?: string;
};

export type LeagueRecord = {
  id: string;
  title: string;
  holder: string | null;
  value: string | null;
  season_year: number | null;
  description: string | null;
  category: string | null;
  sort_order: number;
  created_at?: string;
};

export type SiteContent = {
  key: string;
  title: string;
  body: string | null;
  sort_order: number;
  updated_at?: string;
};

// ---- Prediction game -------------------------------------------------------

export type Profile = {
  id: string;
  display_name: string | null;
  manager_id: string | null;
  is_admin: boolean;
  created_at?: string;
};

export type NflTeam = {
  abbr: string;
  name: string;
  conference: string;
  division: string;
};

export type NflSeason = {
  season_year: number;
  is_current: boolean;
  futures_lock_at: string | null;
  created_at?: string;
};

export type NflGame = {
  id: string;
  season_year: number;
  week: number;
  kickoff: string | null;
  away_abbr: string;
  home_abbr: string;
  winner_abbr: string | null;
  is_final: boolean;
  created_at?: string;
};

export type GamePick = {
  id: string;
  user_id: string;
  game_id: string;
  pick_abbr: string;
  created_at?: string;
};

export type FuturesPick = {
  id: string;
  user_id: string;
  season_year: number;
  category: "division" | "conference" | "super_bowl";
  slot_key: string;
  pick_abbr: string;
  created_at?: string;
};

export type FuturesResult = {
  season_year: number;
  category: string;
  slot_key: string;
  winner_abbr: string | null;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  weekly_pts: number;
  futures_pts: number;
  total_pts: number;
};

/** A manager's all-time, aggregated career line. */
export type CareerStat = {
  manager: Manager;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  championships: number;
  runnerUps: number;
  playoffAppearances: number;
  winPct: number;
};
