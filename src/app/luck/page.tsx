import { getManagers, getMatchups, getSeasons, getTeams } from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { luckStandings } from "@/lib/analytics";
import { EmptyState, PageHeader, SeasonTabs } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Luck Index" };

export default async function LuckPage({
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
  const luck = [...luckStandings(seasonMatchups).values()].sort((a, b) => b.luck - a.luck);

  return (
    <>
      <PageHeader
        eyebrow="Skill vs. Schedule"
        title="Luck Index"
        intro="Your record depends partly on who you happened to play each week. The all-play record shows how you'd do against everyone — the gap is luck."
      />

      <div className="container-content py-12">
        {seasons.length === 0 ? (
          <EmptyState title="No seasons yet" message="Add seasons and weekly matchups to measure luck." />
        ) : (
          <>
            <SeasonTabs seasons={seasons} selectedYear={selectedYear} basePath="/luck" />

            {luck.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={`No results for ${selectedYear}`}
                  message="Record weekly matchups with scores to compute the luck index."
                />
              </div>
            ) : (
              <>
                <div className="mt-4 card overflow-x-auto">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th>Manager</th>
                        <th className="text-center">Actual W–L</th>
                        <th className="text-center">All-Play W–L</th>
                        <th className="text-center">Expected W</th>
                        <th className="text-right">Luck</th>
                      </tr>
                    </thead>
                    <tbody>
                      {luck.map((r) => (
                        <tr key={r.teamId}>
                          <td className="font-semibold text-navy-950">{L.teamManagerName(r.teamId)}</td>
                          <td className="text-center tabular-nums">{r.actualWins}–{r.actualLosses}</td>
                          <td className="text-center tabular-nums text-navy-900/70">{r.allPlayWins}–{r.allPlayLosses}</td>
                          <td className="text-center tabular-nums">{r.expectedWins.toFixed(1)}</td>
                          <td className="text-right">
                            <span
                              className={`badge ${
                                r.luck > 0.5
                                  ? "bg-emerald-100 text-emerald-700"
                                  : r.luck < -0.5
                                  ? "bg-red-100 text-red-700"
                                  : "bg-navy-900/[0.06] text-navy-800"
                              }`}
                            >
                              {r.luck > 0 ? "+" : ""}
                              {r.luck.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-navy-900/50">
                  All-play record = your weekly score vs. every other team that week.
                  Expected wins scale that to your games played. Luck = actual wins − expected wins.
                  Positive means the schedule was kind.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
