import {
  getManagers,
  getMatchups,
  getPlayerScores,
  getSeasons,
  getTeams,
} from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { coachingEfficiency, standingsFromMatchups } from "@/lib/analytics";
import { EmptyState, PageHeader, SeasonTabs } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Awards" };

type Award = { emoji: string; title: string; winner: string; detail?: string; gold?: boolean };

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const [managers, seasons, teams, matchups, scores] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
    getMatchups(),
    getPlayerScores(),
  ]);

  const L = buildLookups(managers, seasons, teams);
  const selectedYear =
    searchParams.year && seasons.some((s) => String(s.year) === searchParams.year)
      ? Number(searchParams.year)
      : seasons[0]?.year;
  const season = seasons.find((s) => s.year === selectedYear);

  const seasonMatchups = matchups.filter((m) => m.season_id === season?.id);
  const seasonScores = scores.filter((s) => s.season_id === season?.id);
  const standings = standingsFromMatchups(seasonMatchups.filter((m) => !m.is_playoff));
  const eff = [...coachingEfficiency(seasonScores, L.seasonById).values()];

  const awards: Award[] = [];
  if (season?.champion_id)
    awards.push({ emoji: "🏆", title: "League Champion", winner: L.managerName(season.champion_id), gold: true });
  if (season?.runner_up_id)
    awards.push({ emoji: "🥈", title: "Runner-Up", winner: L.managerName(season.runner_up_id) });

  const regTop = season?.regular_season_id
    ? L.managerName(season.regular_season_id)
    : standings[0]
    ? L.teamManagerName(standings[0].teamId)
    : null;
  if (regTop) awards.push({ emoji: "📊", title: "Regular Season #1", winner: regTop, detail: standings[0] ? `${standings[0].wins}–${standings[0].losses}` : undefined });

  // best manager by coaching efficiency
  if (eff.length) {
    const best = [...eff].sort((a, b) => b.efficiency - a.efficiency)[0];
    awards.push({ emoji: "🧠", title: "Best Manager", winner: L.teamManagerName(best.teamId), detail: `${(best.efficiency * 100).toFixed(1)}% efficiency` });
  }

  // MVP: top scoring player of the season
  if (seasonScores.length) {
    const totals = new Map<string, { pts: number; team: string; pos: string | null }>();
    for (const s of seasonScores) {
      const cur = totals.get(s.player_name) ?? { pts: 0, team: s.team_id, pos: s.position };
      cur.pts += Number(s.points);
      totals.set(s.player_name, cur);
    }
    const mvp = [...totals.entries()].sort((a, b) => b[1].pts - a[1].pts)[0];
    if (mvp) awards.push({ emoji: "⭐", title: "League MVP (Player)", winner: mvp[0], detail: `${mvp[1].pts.toFixed(1)} pts · ${L.teamManagerName(mvp[1].team)}` });
  }

  // highest single week
  const teamWeeks: { teamId: string; score: number; week: number }[] = [];
  for (const m of seasonMatchups) {
    if (m.home_score != null) teamWeeks.push({ teamId: m.home_team_id, score: Number(m.home_score), week: m.week });
    if (m.away_score != null) teamWeeks.push({ teamId: m.away_team_id, score: Number(m.away_score), week: m.week });
  }
  if (teamWeeks.length) {
    const hi = teamWeeks.reduce((a, b) => (b.score > a.score ? b : a));
    awards.push({ emoji: "🔥", title: "Highest Weekly Score", winner: L.teamManagerName(hi.teamId), detail: `${hi.score.toFixed(1)} · Week ${hi.week}` });
  }

  // sacko / last place
  const sacko = season?.last_place_id
    ? L.managerName(season.last_place_id)
    : standings.length
    ? L.teamManagerName(standings[standings.length - 1].teamId)
    : null;
  if (sacko) awards.push({ emoji: "💩", title: "The Sacko (Last Place)", winner: sacko });

  return (
    <>
      <PageHeader
        eyebrow="Hand Out the Hardware"
        title="Season Awards"
        intro="The superlatives that define a season — champions, best managers, MVPs, and the one nobody wants."
      />

      <div className="container-content py-12">
        {seasons.length === 0 ? (
          <EmptyState title="No seasons yet" message="Add a season to hand out awards." />
        ) : (
          <>
            <SeasonTabs seasons={seasons} selectedYear={selectedYear} basePath="/awards" />
            {awards.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={`No awards for ${selectedYear} yet`}
                  message="Set the season's champion/results and add matchup + player data to generate awards."
                />
              </div>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {awards.map((a) => (
                  <div
                    key={a.title}
                    className={`card p-6 ${a.gold ? "ring-1 ring-gold/40" : ""}`}
                  >
                    <div className="text-3xl">{a.emoji}</div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-navy-500">
                      {a.title}
                    </p>
                    <p className="mt-1 font-display text-2xl font-700 text-navy-950">{a.winner}</p>
                    {a.detail && <p className="mt-1 text-sm text-navy-900/60">{a.detail}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
