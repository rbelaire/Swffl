import { getManagers, getMatchups, getSeasons, getTeams } from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { powerRankings } from "@/lib/analytics";
import { EmptyState, PageHeader, SeasonTabs } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Power Rankings" };

export default async function PowerPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const [managers, seasons, teams, matchups] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
    getMatchups(),
  ]);

  const L = buildLookups(managers, seasons, teams);
  const selectedYear =
    searchParams.year && seasons.some((s) => String(s.year) === searchParams.year)
      ? Number(searchParams.year)
      : seasons[0]?.year;
  const season = seasons.find((s) => s.year === selectedYear);
  const seasonMatchups = matchups.filter((m) => m.season_id === season?.id);
  const rows = powerRankings(seasonMatchups);
  const latestWeek = Math.max(
    0,
    ...seasonMatchups.filter((m) => m.home_score != null && !m.is_playoff).map((m) => m.week),
  );

  return (
    <>
      <PageHeader
        eyebrow="Who's Hot"
        title="Power Rankings"
        intro="A computed ranking blending recent form, season scoring, and winning. Updates automatically as results come in — no hot takes required."
      />

      <div className="container-content py-12">
        {seasons.length === 0 ? (
          <EmptyState title="No seasons yet" message="Add seasons and weekly matchups to generate power rankings." />
        ) : (
          <>
            <SeasonTabs seasons={seasons} selectedYear={selectedYear} basePath="/power" />

            {rows.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={`No results yet for ${selectedYear}`}
                  message="Once matchups with scores are recorded, rankings appear here."
                />
              </div>
            ) : (
              <>
                <p className="mt-6 text-sm text-navy-900/60">
                  Through Week {latestWeek}. Movement compares to the previous week.
                </p>
                <div className="mt-4 card overflow-x-auto">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th className="w-14 text-center">Move</th>
                        <th>Manager</th>
                        <th className="text-right">Rating</th>
                        <th className="text-right">Last 3 Avg</th>
                        <th className="text-right">Season Avg</th>
                        <th className="text-right">Win %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.teamId}>
                          <td className="font-semibold text-navy-500">{r.rank}</td>
                          <td className="text-center">
                            {!r.delta ? (
                              <span className="text-navy-900/35">—</span>
                            ) : r.delta > 0 ? (
                              <span className="font-semibold text-emerald-600">▲ {r.delta}</span>
                            ) : (
                              <span className="font-semibold text-red-500">▼ {Math.abs(r.delta)}</span>
                            )}
                          </td>
                          <td className="font-semibold text-navy-950">{L.teamManagerName(r.teamId)}</td>
                          <td className="text-right tabular-nums font-semibold">{r.rating.toFixed(1)}</td>
                          <td className="text-right tabular-nums">{r.last3.toFixed(1)}</td>
                          <td className="text-right tabular-nums">{r.avgScore.toFixed(1)}</td>
                          <td className="text-right tabular-nums">{(r.winPct * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-navy-900/50">
                  Rating = 45% last-3-week average + 35% season average + 20% win rate.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
