import { getManagers, getMatchups, getSeasons, getTeams } from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { playoffOdds } from "@/lib/analytics";
import { EmptyState, PageHeader, SeasonTabs } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Playoff Odds" };

function Bar({ pct, tone }: { pct: number; tone: "navy" | "gold" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-navy-900/10">
        <div
          className={`h-full rounded-full ${tone === "gold" ? "bg-gold" : "bg-navy"}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right tabular-nums text-xs font-semibold text-navy-900/70">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export default async function PlayoffOddsPage({
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
  const { rows, simulated } = season
    ? playoffOdds(season, seasonMatchups)
    : { rows: [], simulated: false };

  return (
    <>
      <PageHeader
        eyebrow="Crystal Ball"
        title="Playoff Odds"
        intro="We simulate the rest of the season thousands of times from each team's scoring profile to estimate playoff and championship chances."
      />

      <div className="container-content py-12">
        {seasons.length === 0 ? (
          <EmptyState title="No seasons yet" message="Add a season with a schedule to simulate playoff odds." />
        ) : (
          <>
            <SeasonTabs seasons={seasons} selectedYear={selectedYear} basePath="/playoff-odds" />

            {rows.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={`Not enough data for ${selectedYear}`}
                  message="Playoff odds need at least a few played weeks of matchups. Add results (and future matchups) to simulate."
                />
              </div>
            ) : (
              <>
                <p className="mt-6 text-sm text-navy-900/60">
                  {simulated
                    ? `${(season!.playoff_teams ?? 6)}-team playoff · 5,000 simulations · results are deterministic per season.`
                    : "Season complete — these reflect final results."}
                </p>
                <div className="mt-4 card overflow-x-auto">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th>Manager</th>
                        <th className="text-center">Cur. W</th>
                        <th className="text-center">Proj. W</th>
                        <th className="text-center">Avg Seed</th>
                        <th className="min-w-[180px]">Make Playoffs</th>
                        <th className="min-w-[180px]">Win It All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.teamId}>
                          <td className="font-semibold text-navy-950">{L.teamManagerName(r.teamId)}</td>
                          <td className="text-center tabular-nums">{r.currentWins}</td>
                          <td className="text-center tabular-nums">{r.avgWins.toFixed(1)}</td>
                          <td className="text-center tabular-nums">{r.avgSeed.toFixed(1)}</td>
                          <td><Bar pct={r.playoffPct} tone="navy" /></td>
                          <td><Bar pct={r.titlePct} tone="gold" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-navy-900/50">
                  Each team&apos;s weekly score is modeled from its mean and variance so far;
                  remaining games and a reseeding bracket are simulated to estimate odds.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
