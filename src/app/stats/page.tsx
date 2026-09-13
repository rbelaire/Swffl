import Link from "next/link";
import {
  computeCareerStats,
  getManagers,
  getSeasons,
  getTeams,
} from "@/lib/data";
import { EmptyState, PageHeader, StatTile } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "All-Time Stats" };

export default async function StatsPage() {
  const [managers, seasons, teams] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
  ]);

  const careers = computeCareerStats(managers, seasons, teams).filter(
    (c) => c.seasons > 0,
  );

  const mostTitles = [...careers].sort(
    (a, b) => b.championships - a.championships,
  )[0];
  const mostWins = [...careers].sort((a, b) => b.wins - a.wins)[0];
  const mostPoints = [...careers].sort((a, b) => b.pointsFor - a.pointsFor)[0];

  return (
    <>
      <PageHeader
        eyebrow="The Ledger"
        title="All-Time Stats"
        intro="Every manager's complete career line across all 14 seasons — titles, records, and win percentage."
      />

      <div className="container-content py-12">
        {careers.length === 0 ? (
          <EmptyState
            title="No stats yet"
            message="Career stats are calculated automatically from seasons and teams. Add them in the admin area."
          />
        ) : (
          <>
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              <StatTile
                label="Most Championships"
                value={mostTitles?.championships ?? 0}
                sub={mostTitles?.manager.name}
              />
              <StatTile
                label="Most Career Wins"
                value={mostWins?.wins ?? 0}
                sub={mostWins?.manager.name}
              />
              <StatTile
                label="Most Points For"
                value={Math.round(mostPoints?.pointsFor ?? 0).toLocaleString()}
                sub={mostPoints?.manager.name}
              />
            </div>

            <div className="card overflow-x-auto">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>Manager</th>
                    <th className="text-center">Seasons</th>
                    <th className="text-center">Titles</th>
                    <th className="text-center">Runner-Up</th>
                    <th className="text-center">Playoffs</th>
                    <th className="text-center">W–L–T</th>
                    <th className="text-right">Win %</th>
                    <th className="text-right">Points For</th>
                  </tr>
                </thead>
                <tbody>
                  {careers.map((c, i) => (
                    <tr key={c.manager.id}>
                      <td className="font-semibold text-navy-500">{i + 1}</td>
                      <td>
                        {c.manager.slug ? (
                          <Link
                            href={`/managers/${c.manager.slug}`}
                            className="font-semibold text-navy-950 hover:text-navy-600"
                          >
                            {c.manager.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-navy-950">
                            {c.manager.name}
                          </span>
                        )}
                        {!c.manager.active && (
                          <span className="ml-2 badge-navy">Retired</span>
                        )}
                      </td>
                      <td className="text-center tabular-nums">{c.seasons}</td>
                      <td className="text-center">
                        {c.championships > 0 ? (
                          <span className="badge-gold">🏆 {c.championships}</span>
                        ) : (
                          <span className="text-navy-900/40">—</span>
                        )}
                      </td>
                      <td className="text-center tabular-nums">
                        {c.runnerUps || <span className="text-navy-900/40">—</span>}
                      </td>
                      <td className="text-center tabular-nums">
                        {c.playoffAppearances}
                      </td>
                      <td className="text-center tabular-nums">
                        {c.wins}–{c.losses}
                        {c.ties ? `–${c.ties}` : ""}
                      </td>
                      <td className="text-right tabular-nums font-semibold">
                        {(c.winPct * 100).toFixed(1)}%
                      </td>
                      <td className="text-right tabular-nums">
                        {Math.round(c.pointsFor).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-navy-900/50">
              Ranked by championships, then win percentage. Career totals are
              computed live from season results.
            </p>
          </>
        )}
      </div>
    </>
  );
}
