import type {
  DraftPick,
  Manager,
  Matchup,
  PlayerScore,
  RosterSlot,
  Season,
  Team,
} from "@/lib/types";

// ============================================================================
//  Shared helpers
// ============================================================================

/** Standard half-PPR lineup used when a season has no custom roster_slots. */
export const DEFAULT_SLOTS: RosterSlot[] = [
  { slot: "QB", eligible: ["QB"], count: 1 },
  { slot: "RB", eligible: ["RB"], count: 2 },
  { slot: "WR", eligible: ["WR"], count: 2 },
  { slot: "TE", eligible: ["TE"], count: 1 },
  { slot: "FLEX", eligible: ["RB", "WR", "TE"], count: 1 },
  { slot: "K", eligible: ["K"], count: 1 },
  { slot: "DEF", eligible: ["DEF"], count: 1 },
];

export function slotsForSeason(season?: Season | null): RosterSlot[] {
  const s = season?.roster_slots;
  if (Array.isArray(s) && s.length > 0) return s;
  return DEFAULT_SLOTS;
}

const BENCH_SLOTS = new Set(["BENCH", "BE", "IR", "NA", "TAXI", "RES", ""]);

export function isStarterSlot(slot: string | null | undefined): boolean {
  if (slot == null) return false;
  return !BENCH_SLOTS.has(slot.trim().toUpperCase());
}

const norm = (p: string | null | undefined) => (p ?? "").trim().toUpperCase();

// ============================================================================
//  Optimal lineup solver
// ----------------------------------------------------------------------------
//  Because every slot counts equally toward the total, the optimal lineup is
//  just the max-sum set of players that can be legally assigned to slots. With
//  nested flex eligibility, greedily filling the most-restrictive slots first
//  with the best available eligible player is provably optimal.
// ============================================================================

export type SolvablePlayer = { position: string | null; points: number };

export function optimalLineup<T extends SolvablePlayer>(
  players: T[],
  slots: RosterSlot[],
): { points: number; chosen: T[]; chosenIdx: Set<number> } {
  // expand slots into individual instances, most restrictive first
  const instances = slots
    .flatMap((s) =>
      Array.from({ length: s.count }, () => ({
        eligible: new Set(s.eligible.map(norm)),
      })),
    )
    .sort((a, b) => a.eligible.size - b.eligible.size);

  const used = new Set<number>();
  let points = 0;
  const chosen: T[] = [];

  for (const inst of instances) {
    let bestIdx = -1;
    let bestPts = -Infinity;
    for (let i = 0; i < players.length; i++) {
      if (used.has(i)) continue;
      if (!inst.eligible.has(norm(players[i].position))) continue;
      const pts = players[i].points ?? 0;
      if (pts > bestPts) {
        bestPts = pts;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      points += players[bestIdx].points ?? 0;
      chosen.push(players[bestIdx]);
    }
  }

  return { points: round2(points), chosen, chosenIdx: used };
}

export type TeamWeekLine = {
  teamId: string;
  week: number;
  isPlayoff: boolean;
  actual: number;
  optimal: number;
  efficiency: number; // actual / optimal (1 = perfect)
  pointsLeftOnBench: number;
  rows: PlayerScore[];
  optimalIdx: Set<number>;
};

/** Build the actual + optimal line for a single team-week from player scores. */
export function lineupForTeamWeek(rows: PlayerScore[], slots: RosterSlot[]): TeamWeekLine {
  const actual = round2(
    rows
      .filter((r) => isStarterSlot(r.lineup_slot))
      .reduce((n, r) => n + Number(r.points ?? 0), 0),
  );
  const opt = optimalLineup(
    rows.map((r) => ({ position: r.position, points: Number(r.points ?? 0) })),
    slots,
  );
  const optimal = opt.points;
  return {
    teamId: rows[0]?.team_id ?? "",
    week: rows[0]?.week ?? 0,
    isPlayoff: rows[0]?.is_playoff ?? false,
    actual,
    optimal,
    efficiency: optimal > 0 ? actual / optimal : 1,
    pointsLeftOnBench: round2(Math.max(0, optimal - actual)),
    rows,
    optimalIdx: opt.chosenIdx,
  };
}

/** Group player scores by team + week (and playoff flag). */
export function groupTeamWeeks(scores: PlayerScore[]): Map<string, PlayerScore[]> {
  const map = new Map<string, PlayerScore[]>();
  for (const s of scores) {
    const key = `${s.team_id}|${s.week}|${s.is_playoff}`;
    (map.get(key) ?? map.set(key, []).get(key)!).push(s);
  }
  return map;
}

// ============================================================================
//  Standings (actual & optimal) from matchups
// ============================================================================

export type StandingRow = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

const emptyStanding = (teamId: string): StandingRow => ({
  teamId,
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
});

/** A per-team-week optimal score lookup, keyed `${teamId}|${week}|${isPlayoff}`. */
export function optimalScoreMap(
  scores: PlayerScore[],
  seasonsById: Map<string, Season>,
): Map<string, number> {
  const groups = groupTeamWeeks(scores);
  const out = new Map<string, number>();
  for (const [key, rows] of groups) {
    const season = seasonsById.get(rows[0].season_id);
    const line = lineupForTeamWeek(rows, slotsForSeason(season));
    out.set(key, line.optimal);
  }
  return out;
}

/**
 * Standings for a season computed from matchups. When `optimalMap` is given,
 * scores are replaced by each team's optimal score to produce the "what if
 * everyone set their best lineup" alternate standings.
 */
export function standingsFromMatchups(
  seasonMatchups: Matchup[],
  optimalMap?: Map<string, number>,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const get = (id: string) => rows.get(id) ?? rows.set(id, emptyStanding(id)).get(id)!;

  for (const m of seasonMatchups) {
    let hs = m.home_score;
    let as = m.away_score;
    if (optimalMap) {
      const hk = `${m.home_team_id}|${m.week}|${m.is_playoff}`;
      const ak = `${m.away_team_id}|${m.week}|${m.is_playoff}`;
      hs = optimalMap.get(hk) ?? m.home_score;
      as = optimalMap.get(ak) ?? m.away_score;
    }
    if (hs == null || as == null) continue; // unplayed

    const home = get(m.home_team_id);
    const away = get(m.away_team_id);
    home.pointsFor += Number(hs);
    home.pointsAgainst += Number(as);
    away.pointsFor += Number(as);
    away.pointsAgainst += Number(hs);
    if (hs > as) {
      home.wins++;
      away.losses++;
    } else if (as > hs) {
      away.wins++;
      home.losses++;
    } else {
      home.ties++;
      away.ties++;
    }
  }

  return Array.from(rows.values())
    .map((r) => ({
      ...r,
      pointsFor: round2(r.pointsFor),
      pointsAgainst: round2(r.pointsAgainst),
    }))
    .sort(
      (a, b) =>
        winPctOf(b) - winPctOf(a) || b.pointsFor - a.pointsFor,
    );
}

const winPctOf = (r: StandingRow) => {
  const g = r.wins + r.losses + r.ties;
  return g ? (r.wins + r.ties * 0.5) / g : 0;
};
export const winPct = winPctOf;

// ============================================================================
//  Coaching efficiency (per team, per season)
// ============================================================================

export type EfficiencyRow = {
  teamId: string;
  actual: number;
  optimal: number;
  efficiency: number;
  pointsLeftOnBench: number;
  weeks: number;
};

export function coachingEfficiency(
  scores: PlayerScore[],
  seasonsById: Map<string, Season>,
): Map<string, EfficiencyRow> {
  const groups = groupTeamWeeks(scores);
  const acc = new Map<string, EfficiencyRow>();
  for (const [, rows] of groups) {
    const season = seasonsById.get(rows[0].season_id);
    const line = lineupForTeamWeek(rows, slotsForSeason(season));
    const cur =
      acc.get(rows[0].team_id) ??
      acc
        .set(rows[0].team_id, {
          teamId: rows[0].team_id,
          actual: 0,
          optimal: 0,
          efficiency: 0,
          pointsLeftOnBench: 0,
          weeks: 0,
        })
        .get(rows[0].team_id)!;
    cur.actual += line.actual;
    cur.optimal += line.optimal;
    cur.pointsLeftOnBench += line.pointsLeftOnBench;
    cur.weeks += 1;
  }
  for (const r of acc.values()) {
    r.actual = round2(r.actual);
    r.optimal = round2(r.optimal);
    r.pointsLeftOnBench = round2(r.pointsLeftOnBench);
    r.efficiency = r.optimal > 0 ? r.actual / r.optimal : 1;
  }
  return acc;
}

// ============================================================================
//  Head-to-head (all-time, by manager)
// ============================================================================

export type H2HCell = { wins: number; losses: number; ties: number; pf: number; pa: number };

export function headToHead(
  matchups: Matchup[],
  teamToManager: Map<string, string>,
): Map<string, Map<string, H2HCell>> {
  const grid = new Map<string, Map<string, H2HCell>>();
  const cell = (a: string, b: string) => {
    const row = grid.get(a) ?? grid.set(a, new Map()).get(a)!;
    return row.get(b) ?? row.set(b, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 }).get(b)!;
  };

  for (const m of matchups) {
    if (m.home_score == null || m.away_score == null) continue;
    const hm = teamToManager.get(m.home_team_id);
    const am = teamToManager.get(m.away_team_id);
    if (!hm || !am || hm === am) continue;
    const hs = Number(m.home_score);
    const as = Number(m.away_score);

    const h = cell(hm, am);
    const a = cell(am, hm);
    h.pf += hs; h.pa += as;
    a.pf += as; a.pa += hs;
    if (hs > as) { h.wins++; a.losses++; }
    else if (as > hs) { a.wins++; h.losses++; }
    else { h.ties++; a.ties++; }
  }
  return grid;
}

// ============================================================================
//  Luck / all-play (per season, regular season only)
// ============================================================================

export type LuckRow = {
  teamId: string;
  actualWins: number;
  actualLosses: number;
  allPlayWins: number;
  allPlayLosses: number;
  expectedWins: number;
  luck: number; // actualWins - expectedWins  (+ = lucky)
};

/** teamWeekScores: per season+week list of {teamId, score} from matchups. */
export function luckStandings(
  seasonMatchups: Matchup[],
): Map<string, LuckRow> {
  const reg = seasonMatchups.filter((m) => !m.is_playoff);
  // group scores by week
  const byWeek = new Map<number, { teamId: string; score: number }[]>();
  for (const m of reg) {
    if (m.home_score == null || m.away_score == null) continue;
    const arr = byWeek.get(m.week) ?? byWeek.set(m.week, []).get(m.week)!;
    arr.push({ teamId: m.home_team_id, score: Number(m.home_score) });
    arr.push({ teamId: m.away_team_id, score: Number(m.away_score) });
  }

  const out = new Map<string, LuckRow>();
  const row = (id: string) =>
    out.get(id) ??
    out
      .set(id, {
        teamId: id,
        actualWins: 0,
        actualLosses: 0,
        allPlayWins: 0,
        allPlayLosses: 0,
        expectedWins: 0,
        luck: 0,
      })
      .get(id)!;

  // actual W/L
  for (const m of reg) {
    if (m.home_score == null || m.away_score == null) continue;
    const hs = Number(m.home_score);
    const as = Number(m.away_score);
    if (hs > as) { row(m.home_team_id).actualWins++; row(m.away_team_id).actualLosses++; }
    else if (as > hs) { row(m.away_team_id).actualWins++; row(m.home_team_id).actualLosses++; }
  }

  // all-play: each week compare every team to every other
  for (const [, arr] of byWeek) {
    for (const me of arr) {
      const r = row(me.teamId);
      for (const other of arr) {
        if (other === me) continue;
        if (me.score > other.score) r.allPlayWins++;
        else if (me.score < other.score) r.allPlayLosses++;
      }
    }
  }

  for (const r of out.values()) {
    const games = r.actualWins + r.actualLosses;
    const apGames = r.allPlayWins + r.allPlayLosses;
    const apPct = apGames ? r.allPlayWins / apGames : 0;
    r.expectedWins = round2(apPct * games);
    r.luck = round2(r.actualWins - r.expectedWins);
  }
  return out;
}

// ============================================================================
//  Power rankings (per season, through a given week)
// ============================================================================

export type PowerRow = {
  teamId: string;
  rating: number;
  avgScore: number;
  last3: number;
  winPct: number;
  rank: number;
  prevRank?: number;
  delta?: number;
};

function ratingsThroughWeek(
  seasonMatchups: Matchup[],
  throughWeek: number,
): Map<string, PowerRow> {
  const games = seasonMatchups.filter(
    (m) => !m.is_playoff && m.week <= throughWeek && m.home_score != null && m.away_score != null,
  );
  const scores = new Map<string, number[]>(); // teamId -> weekly scores in order
  const wl = new Map<string, { w: number; l: number }>();
  const push = (id: string, sc: number, win: 0 | 1 | 2) => {
    (scores.get(id) ?? scores.set(id, []).get(id)!).push(sc);
    const r = wl.get(id) ?? wl.set(id, { w: 0, l: 0 }).get(id)!;
    if (win === 1) r.w++; else if (win === 2) r.l++;
  };
  for (const m of games) {
    const hs = Number(m.home_score), as = Number(m.away_score);
    push(m.home_team_id, hs, hs > as ? 1 : hs < as ? 2 : 0);
    push(m.away_team_id, as, as > hs ? 1 : as < hs ? 2 : 0);
  }

  const rows = new Map<string, PowerRow>();
  for (const [id, arr] of scores) {
    const avg = mean(arr);
    const last3 = mean(arr.slice(-3));
    const r = wl.get(id)!;
    const g = r.w + r.l;
    const wp = g ? r.w / g : 0;
    // composite: recent form + season average + winning
    const rating = 0.45 * last3 + 0.35 * avg + 0.2 * (wp * 100);
    rows.set(id, { teamId: id, rating: round2(rating), avgScore: round2(avg), last3: round2(last3), winPct: wp, rank: 0 });
  }
  // assign ranks
  const sorted = [...rows.values()].sort((a, b) => b.rating - a.rating);
  sorted.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export function powerRankings(seasonMatchups: Matchup[]): PowerRow[] {
  const weeks = seasonMatchups
    .filter((m) => !m.is_playoff && m.home_score != null)
    .map((m) => m.week);
  if (weeks.length === 0) return [];
  const latest = Math.max(...weeks);
  const cur = ratingsThroughWeek(seasonMatchups, latest);
  const prev = latest > 1 ? ratingsThroughWeek(seasonMatchups, latest - 1) : null;
  const out = [...cur.values()].sort((a, b) => a.rank - b.rank);
  for (const r of out) {
    const p = prev?.get(r.teamId);
    r.prevRank = p?.rank;
    r.delta = p ? p.rank - r.rank : 0; // + = moved up
  }
  return out;
}

// ============================================================================
//  Playoff odds — Monte Carlo simulation of the rest of the season
// ============================================================================

export type OddsRow = {
  teamId: string;
  playoffPct: number;
  titlePct: number;
  avgWins: number;
  avgSeed: number;
  currentWins: number;
};

// deterministic PRNG so results are stable across page loads
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng: () => number, mean: number, sd: number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function playoffOdds(
  season: Season,
  seasonMatchups: Matchup[],
  sims = 5000,
): { rows: OddsRow[]; simulated: boolean } {
  const regWeeks = season.regular_season_weeks ?? 14;
  const reg = seasonMatchups.filter((m) => !m.is_playoff && m.week <= regWeeks);
  const played = reg.filter((m) => m.home_score != null && m.away_score != null);
  const future = reg.filter((m) => m.home_score == null || m.away_score == null);

  // gather team ids + played scores
  const scores = new Map<string, number[]>();
  const baseWins = new Map<string, number>();
  const basePts = new Map<string, number>();
  const ensure = (id: string) => {
    if (!scores.has(id)) { scores.set(id, []); baseWins.set(id, 0); basePts.set(id, 0); }
  };
  for (const m of reg) { ensure(m.home_team_id); ensure(m.away_team_id); }
  for (const m of played) {
    const hs = Number(m.home_score), as = Number(m.away_score);
    scores.get(m.home_team_id)!.push(hs);
    scores.get(m.away_team_id)!.push(as);
    basePts.set(m.home_team_id, basePts.get(m.home_team_id)! + hs);
    basePts.set(m.away_team_id, basePts.get(m.away_team_id)! + as);
    if (hs > as) baseWins.set(m.home_team_id, baseWins.get(m.home_team_id)! + 1);
    else if (as > hs) baseWins.set(m.away_team_id, baseWins.get(m.away_team_id)! + 1);
  }

  const teamIds = [...scores.keys()];
  if (teamIds.length === 0 || played.length === 0) {
    return { rows: [], simulated: false };
  }

  // scoring model per team
  const allScores = [...scores.values()].flat();
  const leagueMean = mean(allScores) || 100;
  const leagueSd = stdev(allScores) || 20;
  const model = new Map<string, { mu: number; sd: number }>();
  for (const id of teamIds) {
    const arr = scores.get(id)!;
    model.set(id, {
      mu: arr.length ? mean(arr) : leagueMean,
      sd: arr.length >= 3 ? Math.max(stdev(arr), 8) : leagueSd,
    });
  }

  const nPlayoff = season.playoff_teams ?? 6;
  const rng = mulberry32((season.year || 2024) * 2654435761);

  const madeCount = new Map<string, number>(teamIds.map((id) => [id, 0]));
  const titleCount = new Map<string, number>(teamIds.map((id) => [id, 0]));
  const winsSum = new Map<string, number>(teamIds.map((id) => [id, 0]));
  const seedSum = new Map<string, number>(teamIds.map((id) => [id, 0]));

  for (let s = 0; s < sims; s++) {
    const wins = new Map(baseWins);
    const pts = new Map(basePts);
    for (const m of future) {
      const mh = model.get(m.home_team_id)!;
      const ma = model.get(m.away_team_id)!;
      const hs = gauss(rng, mh.mu, mh.sd);
      const as = gauss(rng, ma.mu, ma.sd);
      pts.set(m.home_team_id, pts.get(m.home_team_id)! + hs);
      pts.set(m.away_team_id, pts.get(m.away_team_id)! + as);
      if (hs >= as) wins.set(m.home_team_id, wins.get(m.home_team_id)! + 1);
      else wins.set(m.away_team_id, wins.get(m.away_team_id)! + 1);
    }
    // seed
    const seeded = teamIds
      .slice()
      .sort((a, b) => (wins.get(b)! - wins.get(a)!) || (pts.get(b)! - pts.get(a)!));
    seeded.forEach((id, i) => {
      seedSum.set(id, seedSum.get(id)! + (i + 1));
      winsSum.set(id, winsSum.get(id)! + wins.get(id)!);
    });
    const bracket = seeded.slice(0, nPlayoff);
    bracket.forEach((id) => madeCount.set(id, madeCount.get(id)! + 1));

    // simple reseeding single-elim bracket for title odds
    let alive = bracket.slice();
    while (alive.length > 1) {
      alive.sort((a, b) => bracket.indexOf(a) - bracket.indexOf(b)); // by seed
      const next: string[] = [];
      let i = 0, j = alive.length - 1;
      while (i < j) {
        const a = alive[i], b = alive[j];
        const ma = model.get(a)!, mb = model.get(b)!;
        next.push(gauss(rng, ma.mu, ma.sd) >= gauss(rng, mb.mu, mb.sd) ? a : b);
        i++; j--;
      }
      if (i === j) next.push(alive[i]); // bye for odd counts
      alive = next;
    }
    if (alive[0]) titleCount.set(alive[0], titleCount.get(alive[0])! + 1);
  }

  const rows: OddsRow[] = teamIds.map((id) => ({
    teamId: id,
    playoffPct: round1((madeCount.get(id)! / sims) * 100),
    titlePct: round1((titleCount.get(id)! / sims) * 100),
    avgWins: round1(winsSum.get(id)! / sims),
    avgSeed: round1(seedSum.get(id)! / sims),
    currentWins: baseWins.get(id)!,
  }));
  rows.sort((a, b) => b.playoffPct - a.playoffPct || b.titlePct - a.titlePct);
  return { rows, simulated: future.length > 0 };
}

// ============================================================================
//  Auto record book
// ============================================================================

export type AutoRecord = {
  title: string;
  value: string;
  holder: string;
  detail?: string;
  seasonYear?: number;
  category: string;
};

export function autoRecords(
  matchups: Matchup[],
  scores: PlayerScore[],
  teamName: (teamId: string) => string,
  seasonYear: (teamId: string) => number | undefined,
): AutoRecord[] {
  const out: AutoRecord[] = [];
  // team-week scores from matchups
  const teamWeeks: { teamId: string; opp: string; score: number; oppScore: number; week: number }[] = [];
  for (const m of matchups) {
    if (m.home_score == null || m.away_score == null) continue;
    teamWeeks.push({ teamId: m.home_team_id, opp: m.away_team_id, score: Number(m.home_score), oppScore: Number(m.away_score), week: m.week });
    teamWeeks.push({ teamId: m.away_team_id, opp: m.home_team_id, score: Number(m.away_score), oppScore: Number(m.home_score), week: m.week });
  }

  if (teamWeeks.length) {
    const high = teamWeeks.reduce((a, b) => (b.score > a.score ? b : a));
    const low = teamWeeks.reduce((a, b) => (b.score < a.score ? b : a));
    out.push({ title: "Highest team week", value: high.score.toFixed(1), holder: teamName(high.teamId), seasonYear: seasonYear(high.teamId), detail: `Week ${high.week}`, category: "Scoring" });
    out.push({ title: "Lowest team week", value: low.score.toFixed(1), holder: teamName(low.teamId), seasonYear: seasonYear(low.teamId), detail: `Week ${low.week}`, category: "Scoring" });

    const mostInLoss = teamWeeks.filter((t) => t.score < t.oppScore).sort((a, b) => b.score - a.score)[0];
    if (mostInLoss)
      out.push({ title: "Most points in a loss", value: mostInLoss.score.toFixed(1), holder: teamName(mostInLoss.teamId), seasonYear: seasonYear(mostInLoss.teamId), detail: `Week ${mostInLoss.week}`, category: "Heartbreak" });
  }

  // margins from matchups
  const withMargin = matchups
    .filter((m) => m.home_score != null && m.away_score != null)
    .map((m) => ({ m, margin: Math.abs(Number(m.home_score) - Number(m.away_score)) }));
  if (withMargin.length) {
    const blow = withMargin.reduce((a, b) => (b.margin > a.margin ? b : a));
    const close = withMargin.reduce((a, b) => (b.margin < a.margin ? b : a));
    const wName = (m: Matchup) => teamName(Number(m.home_score) >= Number(m.away_score) ? m.home_team_id : m.away_team_id);
    out.push({ title: "Biggest blowout", value: blow.margin.toFixed(1), holder: wName(blow.m), detail: `Week ${blow.m.week}`, seasonYear: seasonYear(blow.m.home_team_id), category: "Margins" });
    out.push({ title: "Closest game", value: close.margin.toFixed(1), holder: wName(close.m), detail: `Week ${close.m.week}`, seasonYear: seasonYear(close.m.home_team_id), category: "Margins" });
  }

  // highest single player week
  if (scores.length) {
    const p = scores.reduce((a, b) => (Number(b.points) > Number(a.points) ? b : a));
    out.push({ title: "Highest player week", value: Number(p.points).toFixed(1), holder: p.player_name, detail: `${p.position ?? ""} · Week ${p.week}`, seasonYear: seasonYear(p.team_id), category: "Players" });
  }

  return out;
}

// ============================================================================
//  Small math helpers
// ============================================================================

export function mean(a: number[]): number {
  return a.length ? a.reduce((n, x) => n + x, 0) / a.length : 0;
}
export function stdev(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((n, x) => n + (x - m) ** 2, 0) / (a.length - 1));
}
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
