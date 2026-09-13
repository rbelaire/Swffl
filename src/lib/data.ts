import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  CareerStat,
  DraftPick,
  LeagueRecord,
  Manager,
  Matchup,
  PlayerScore,
  RosterPlayer,
  Season,
  SiteContent,
  Team,
} from "@/lib/types";

export { isSupabaseConfigured };

/**
 * Every fetch below degrades gracefully: if Supabase is not configured, or a
 * query errors, we return an empty result instead of crashing the page. That
 * keeps the whole site rendering before you connect Supabase.
 */

export async function getManagers(): Promise<Manager[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("managers")
    .select("*")
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getSeasons(): Promise<Season[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .order("year", { ascending: false });
  return data ?? [];
}

export async function getTeams(): Promise<Team[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("teams").select("*");
  return data ?? [];
}

export async function getRosterPlayers(): Promise<RosterPlayer[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("roster_players")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getRecords(): Promise<LeagueRecord[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("records")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getSiteContent(): Promise<SiteContent[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("site_content")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getMatchups(): Promise<Matchup[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("matchups")
    .select("*")
    .order("week", { ascending: true });
  return data ?? [];
}

export async function getPlayerScores(): Promise<PlayerScore[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("player_scores")
    .select("*")
    .order("week", { ascending: true });
  return data ?? [];
}

export async function getDraftPicks(): Promise<DraftPick[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("draft_picks")
    .select("*")
    .order("overall", { ascending: true });
  return data ?? [];
}

/** Compute all-time career lines for every manager from the season/team data. */
export function computeCareerStats(
  managers: Manager[],
  seasons: Season[],
  teams: Team[],
): CareerStat[] {
  const byId = new Map<string, CareerStat>();

  for (const m of managers) {
    byId.set(m.id, {
      manager: m,
      seasons: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      championships: 0,
      runnerUps: 0,
      playoffAppearances: 0,
      winPct: 0,
    });
  }

  for (const t of teams) {
    const line = byId.get(t.manager_id);
    if (!line) continue;
    line.seasons += 1;
    line.wins += t.wins ?? 0;
    line.losses += t.losses ?? 0;
    line.ties += t.ties ?? 0;
    line.pointsFor += Number(t.points_for ?? 0);
    if (t.playoff_finish != null && t.playoff_finish <= 4)
      line.playoffAppearances += 1;
  }

  for (const s of seasons) {
    if (s.champion_id && byId.has(s.champion_id))
      byId.get(s.champion_id)!.championships += 1;
    if (s.runner_up_id && byId.has(s.runner_up_id))
      byId.get(s.runner_up_id)!.runnerUps += 1;
  }

  const stats = Array.from(byId.values());
  for (const s of stats) {
    const games = s.wins + s.losses + s.ties;
    s.winPct = games > 0 ? (s.wins + s.ties * 0.5) / games : 0;
  }

  return stats.sort(
    (a, b) =>
      b.championships - a.championships ||
      b.winPct - a.winPct ||
      b.wins - a.wins,
  );
}
