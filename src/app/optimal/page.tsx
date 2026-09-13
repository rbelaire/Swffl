import {
  getManagers,
  getMatchups,
  getPlayerScores,
  getSeasons,
  getTeams,
} from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import {
  coachingEfficiency,
  optimalScoreMap,
  standingsFromMatchups,
} from "@/lib/analytics";
import { EmptyState, PageHeader, SeasonTabs, StatTile } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Optimal Lineups" };

export default async function OptimalPage({
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

  const optMap = optimalScoreMap(seasonScores, L.seasonById);
  const actual = standingsFromMatchups(seasonMatchups);
  const optimal = standingsFromMatchups(seasonMatchups, optMap);
  const eff = coachingEfficiency(seasonScores, L.seasonById);

  const actualRank = new Map(actual.map((r, i) => [r.teamId, i + 1]));

  const hasMatchups = seasonMatchups.some((m) => m.home_score != null);
  const hasScores = seasonScores.length > 0;

  // league-wide coaching efficiency summary
  const effRows = [...eff.values()];
  const avgEff = effRows.length
    ? effRows.reduce((n, r) => n + r.efficiency, 0) / effRows.length
    : 0;
  const totalLeft = effRows.reduce((n, r) => n + r.pointsLeftOnBench, 0);
  const bestCoach = [...effRows].sort((a, b) => b.efficiency - a.efficiency)[0];

  return (
    <>
      <PageHeader
        eyebrow="What Could've Been"
        title="Optimal Lineups"
        intro="If every manager had set their best possible lineup each week, here's how the season would have played out — plus who actually coaches their team well."
      />

      <div className="container-content py-12">
        {seasons.length === 0 ? (
          <EmptyState title="No seasons yet" message="Add seasons, matchups and weekly player scores to unlock optimal-lineup analysis." />
        ) : (
          <>
            <SeasonTabs seasons={seasons} selectedYear={selectedYear} basePath="/optimal" />

            {!hasMatchups ? (
              <div className="mt-8">
                <EmptyState
                  title={`No matchups recorded for ${selectedYear}`}
                  message="Add this season's matchups (and weekly player scores) in the admin area to see alternate standings."
                />
              </div>
            ) : (
              <>
                {hasScores && (
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <StatTile label="Avg Coaching Efficiency" value={`${(avgEff * 100).toFixed(1)}%`} sub="Points scored ÷ points possible" />
                    <StatTile label="Points Left on Benches" value={Math.round(totalLeft).toLocaleString()} sub="Across the whole league" />
                    <StatTile label="Best Manager" value={bestCoach ? `${(bestCoach.efficiency * 100).toFixed(0)}%` : "—"} sub={bestCoach ? L.teamManagerName(bestCoach.teamId) : undefined} />
                  </div>
                )}

                <h2 className="mt-12 font-display text-2xl font-700 text-navy-950">
                  Alternate Standings — Best Lineups
                </h2>
                <p className="mt-1 text-sm text-navy-900/60">
                  {hasScores
                    ? "W–L if every team started their optimal lineup every week. The arrow shows movement vs. the real standings."
                    : "Add weekly player scores to compute optimal lineups. Showing actual standings until then."}
                </p>

                <div className="card mt-5 overflow-x-auto">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Manager</th>
                        <th className="text-center">Optimal W–L</th>
                        <th className="text-center">Move</th>
                        <th className="text-right">Optimal PF</th>
                        {hasScores && <th className="text-right">Coaching Eff.</th>}
                        {hasScores && <th className="text-right">Pts Left on Bench</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {optimal.map((r, i) => {
                        const prev = actualRank.get(r.teamId) ?? i + 1;
                        const move = prev - (i + 1); // + = climbed
                        const e = eff.get(r.teamId);
                        return (
                          <tr key={r.teamId}>
                            <td className="font-semibold text-navy-500">{i + 1}</td>
                            <td className="font-semibold text-navy-950">{L.teamManagerName(r.teamId)}</td>
                            <td className="text-center tabular-nums">
                              {r.wins}–{r.losses}{r.ties ? `–${r.ties}` : ""}
                            </td>
                            <td className="text-center">
                              {move === 0 ? (
                                <span className="text-navy-900/35">—</span>
                              ) : move > 0 ? (
                                <span className="font-semibold text-emerald-600">▲ {move}</span>
                              ) : (
                                <span className="font-semibold text-red-500">▼ {Math.abs(move)}</span>
                              )}
                            </td>
                            <td className="text-right tabular-nums">{r.pointsFor.toFixed(1)}</td>
                            {hasScores && (
                              <td className="text-right tabular-nums font-semibold">
                                {e ? `${(e.efficiency * 100).toFixed(1)}%` : "—"}
                              </td>
                            )}
                            {hasScores && (
                              <td className="text-right tabular-nums text-navy-900/70">
                                {e ? e.pointsLeftOnBench.toFixed(1) : "—"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!hasScores && (
                  <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a611b]">
                    Optimal lineups need weekly <strong>player scores</strong> (starters + bench).
                    Load those via the admin importer and this page fills in coaching
                    efficiency, benched points, and true best-ball standings.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
