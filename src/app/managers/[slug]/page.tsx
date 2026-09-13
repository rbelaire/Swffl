import Link from "next/link";
import { notFound } from "next/navigation";
import {
  computeCareerStats,
  getManagers,
  getMatchups,
  getSeasons,
  getTeams,
} from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { headToHead } from "@/lib/analytics";
import { PageHeader, StatTile } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const managers = await getManagers();
  const m = managers.find((x) => x.slug === params.slug);
  return { title: m ? m.name : "Manager" };
}

export default async function ManagerProfile({
  params,
}: {
  params: { slug: string };
}) {
  const [managers, seasons, teams, matchups] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
    getMatchups(),
  ]);

  const manager = managers.find((m) => m.slug === params.slug);
  if (!manager) notFound();

  const L = buildLookups(managers, seasons, teams);
  const career = computeCareerStats(managers, seasons, teams).find(
    (c) => c.manager.id === manager.id,
  );

  // per-season lines
  const myTeams = teams
    .filter((t) => t.manager_id === manager.id)
    .map((t) => ({ t, season: L.seasonById.get(t.season_id) }))
    .filter((x) => x.season)
    .sort((a, b) => (b.season!.year ?? 0) - (a.season!.year ?? 0));

  const titles = seasons.filter((s) => s.champion_id === manager.id).map((s) => s.year);

  // head-to-head slice
  const grid = headToHead(matchups, L.teamToManager);
  const myRow = grid.get(manager.id);
  let bestRival: { id: string; w: number; l: number } | null = null;
  let worstRival: { id: string; w: number; l: number } | null = null;
  if (myRow) {
    for (const [oppId, cell] of myRow) {
      const diff = cell.wins - cell.losses;
      if (!bestRival || diff > bestRival.w - bestRival.l) bestRival = { id: oppId, w: cell.wins, l: cell.losses };
      if (!worstRival || diff < worstRival.w - worstRival.l) worstRival = { id: oppId, w: cell.wins, l: cell.losses };
    }
  }

  const bestSeason = [...myTeams].sort(
    (a, b) => Number(b.t.points_for) - Number(a.t.points_for),
  )[0];

  return (
    <>
      <PageHeader
        eyebrow={manager.active ? "Active Manager" : "Emeritus"}
        title={manager.name}
        intro={manager.bio || undefined}
      />

      <div className="container-content py-12">
        <Link href="/managers" className="text-sm font-semibold text-navy-600 hover:text-navy-800">
          ← All managers
        </Link>

        {/* Career tiles */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Championships" value={career?.championships ?? 0} sub={titles.length ? titles.join(", ") : "None yet"} />
          <StatTile label="Seasons" value={career?.seasons ?? 0} sub={manager.joined_year ? `Since ${manager.joined_year}` : undefined} />
          <StatTile label="Career Record" value={`${career?.wins ?? 0}–${career?.losses ?? 0}`} sub={`${((career?.winPct ?? 0) * 100).toFixed(1)}% win rate`} />
          <StatTile label="Playoff Trips" value={career?.playoffAppearances ?? 0} />
        </div>

        {/* Rivals */}
        {(bestRival || worstRival) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {bestRival && bestRival.w + bestRival.l > 0 && (
              <div className="card p-6">
                <p className="eyebrow">Owns</p>
                <p className="mt-1 font-display text-xl font-700 text-navy-950">
                  {L.managerName(bestRival.id)}
                </p>
                <p className="text-sm text-navy-900/60">
                  {bestRival.w}–{bestRival.l} all-time
                </p>
              </div>
            )}
            {worstRival && worstRival.w + worstRival.l > 0 && (
              <div className="card p-6">
                <p className="eyebrow">Owned by</p>
                <p className="mt-1 font-display text-xl font-700 text-navy-950">
                  {L.managerName(worstRival.id)}
                </p>
                <p className="text-sm text-navy-900/60">
                  {worstRival.w}–{worstRival.l} all-time
                </p>
              </div>
            )}
          </div>
        )}

        {/* Season-by-season */}
        <h2 className="mt-12 font-display text-2xl font-700 text-navy-950">
          Season by Season
        </h2>
        {myTeams.length === 0 ? (
          <p className="mt-3 text-sm text-navy-900/60">No season data recorded yet.</p>
        ) : (
          <div className="card mt-5 overflow-x-auto">
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Team</th>
                  <th className="text-center">W–L–T</th>
                  <th className="text-right">PF</th>
                  <th className="text-right">Finish</th>
                </tr>
              </thead>
              <tbody>
                {myTeams.map(({ t, season }) => (
                  <tr key={t.id}>
                    <td className="font-semibold text-navy-950">
                      <Link href={`/standings?year=${season!.year}`} className="hover:text-navy-600">
                        {season!.year}
                      </Link>
                    </td>
                    <td>{t.team_name || "—"}</td>
                    <td className="text-center tabular-nums">
                      {t.wins}–{t.losses}{t.ties ? `–${t.ties}` : ""}
                    </td>
                    <td className="text-right tabular-nums">{Number(t.points_for).toFixed(1)}</td>
                    <td className="text-right">
                      {season!.champion_id === manager.id ? (
                        <span className="badge-gold">🏆 Champion</span>
                      ) : t.playoff_finish ? (
                        <span className="badge-navy">#{t.playoff_finish}</span>
                      ) : (
                        <span className="text-navy-900/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bestSeason && (
          <p className="mt-4 text-sm text-navy-900/60">
            Best scoring season:{" "}
            <strong className="text-navy-900">{bestSeason.season!.year}</strong> with{" "}
            {Number(bestSeason.t.points_for).toFixed(1)} points.
          </p>
        )}
      </div>
    </>
  );
}
