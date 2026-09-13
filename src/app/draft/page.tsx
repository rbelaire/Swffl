import {
  getDraftPicks,
  getManagers,
  getPlayerScores,
  getSeasons,
  getTeams,
} from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { round2 } from "@/lib/analytics";
import { EmptyState, PageHeader, SeasonTabs, StatTile } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Draft Room" };

export default async function DraftPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const [managers, seasons, teams, picks, scores] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
    getDraftPicks(),
    getPlayerScores(),
  ]);

  const L = buildLookups(managers, seasons, teams);
  const selectedYear =
    searchParams.year && seasons.some((s) => String(s.year) === searchParams.year)
      ? Number(searchParams.year)
      : seasons[0]?.year;
  const season = seasons.find((s) => s.year === selectedYear);

  const seasonPicks = picks
    .filter((p) => p.season_id === season?.id)
    .sort((a, b) => (a.overall ?? 999) - (b.overall ?? 999));

  // season points per player (by name)
  const pts = new Map<string, number>();
  for (const s of scores) {
    if (s.season_id !== season?.id) continue;
    pts.set(s.player_name, round2((pts.get(s.player_name) ?? 0) + Number(s.points)));
  }
  const hasScores = pts.size > 0;
  const pointsFor = (name: string) => pts.get(name);

  const withPts = seasonPicks
    .map((p) => ({ p, pts: pointsFor(p.player_name) ?? -1 }))
    .filter((x) => x.pts >= 0);
  const bestValue = [...withPts].sort((a, b) => b.pts - a.pts)[0];
  const steal = [...withPts].filter((x) => (x.p.overall ?? 0) > 12).sort((a, b) => b.pts - a.pts)[0];
  const bust = [...withPts].filter((x) => (x.p.round ?? 99) <= 2).sort((a, b) => a.pts - b.pts)[0];

  const rounds = Array.from(new Set(seasonPicks.map((p) => p.round ?? 0))).sort((a, b) => a - b);

  return (
    <>
      <PageHeader
        eyebrow="Where It All Begins"
        title="Draft Room"
        intro="Every pick, every year — graded in hindsight against how many points that player actually scored."
      />

      <div className="container-content py-12">
        {seasons.length === 0 ? (
          <EmptyState title="No seasons yet" message="Add seasons and draft picks to build the draft room." />
        ) : (
          <>
            <SeasonTabs seasons={seasons} selectedYear={selectedYear} basePath="/draft" />

            {seasonPicks.length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  title={`No draft recorded for ${selectedYear}`}
                  message="Add this season's draft picks in the admin area (or bulk-import them)."
                />
              </div>
            ) : (
              <>
                {hasScores && (
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <StatTile label="Best Pick" value={bestValue ? bestValue.pts.toFixed(0) : "—"} sub={bestValue ? `${bestValue.p.player_name} · pick ${bestValue.p.overall}` : undefined} />
                    <StatTile label="Steal of the Draft" value={steal ? steal.pts.toFixed(0) : "—"} sub={steal ? `${steal.p.player_name} · pick ${steal.p.overall}` : undefined} />
                    <StatTile label="Biggest Bust" value={bust ? bust.pts.toFixed(0) : "—"} sub={bust ? `${bust.p.player_name} · pick ${bust.p.overall}` : undefined} />
                  </div>
                )}

                <div className="mt-10 space-y-8">
                  {rounds.map((rd) => (
                    <div key={rd}>
                      <h2 className="mb-3 font-display text-lg font-700 text-navy-950">
                        Round {rd || "?"}
                      </h2>
                      <div className="card overflow-x-auto">
                        <table className="stat-table">
                          <thead>
                            <tr>
                              <th className="w-16">Pick</th>
                              <th>Player</th>
                              <th>Pos</th>
                              <th>Drafted By</th>
                              {hasScores && <th className="text-right">Season Pts</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {seasonPicks
                              .filter((p) => (p.round ?? 0) === rd)
                              .map((p) => (
                                <tr key={p.id}>
                                  <td className="font-semibold text-navy-500">
                                    {p.overall ?? `${p.round}.${p.pick}`}
                                  </td>
                                  <td className="font-semibold text-navy-950">
                                    {p.player_name}
                                    {p.is_keeper && <span className="ml-2 badge-gold">Keeper</span>}
                                  </td>
                                  <td className="text-navy-900/70">{p.position ?? "—"}</td>
                                  <td>{p.team_id ? L.teamManagerName(p.team_id) : "—"}</td>
                                  {hasScores && (
                                    <td className="text-right tabular-nums font-semibold">
                                      {pointsFor(p.player_name) != null
                                        ? pointsFor(p.player_name)!.toFixed(1)
                                        : "—"}
                                    </td>
                                  )}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {!hasScores && (
                  <p className="mt-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a611b]">
                    Load weekly <strong>player scores</strong> for this season to unlock
                    retroactive draft grades (best pick, steals, busts).
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
