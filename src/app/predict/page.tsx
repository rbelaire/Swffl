import Link from "next/link";
import {
  getCurrentNflSeason,
  getLeaderboard,
} from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import { PredictNav } from "@/components/predict/PredictNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prediction Pool" };

export default async function PredictPage() {
  const season = await getCurrentNflSeason();
  const rows = season ? await getLeaderboard(season.season_year) : [];

  return (
    <>
      <PageHeader
        eyebrow={season ? `${season.season_year} Season` : "Prediction Pool"}
        title="NFL Prediction Pool"
        intro="Pick every NFL game each week and lock in your futures. One point per correct pick — most points wins the pool."
      />

      <div className="container-content py-12">
        <PredictNav />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Link href="/predict/games" className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-3xl">🏈</p>
            <h2 className="mt-3 font-display text-lg font-700 text-navy-950">Weekly Picks</h2>
            <p className="mt-1 text-sm text-navy-900/60">Pick the winner of every game. Locks at kickoff.</p>
            <p className="mt-3 text-sm font-semibold text-navy-600 group-hover:text-navy-800">Make picks →</p>
          </Link>
          <Link href="/predict/futures" className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-3xl">🔮</p>
            <h2 className="mt-3 font-display text-lg font-700 text-navy-950">Futures</h2>
            <p className="mt-1 text-sm text-navy-900/60">Call the division, conference, and Super Bowl winners.</p>
            <p className="mt-3 text-sm font-semibold text-navy-600 group-hover:text-navy-800">Set futures →</p>
          </Link>
          <div className="card p-6">
            <p className="text-3xl">🏆</p>
            <h2 className="mt-3 font-display text-lg font-700 text-navy-950">How scoring works</h2>
            <p className="mt-1 text-sm text-navy-900/60">
              1 point per correct game pick, division winner, conference winner and
              Super Bowl champ. Simple.
            </p>
          </div>
        </div>

        <h2 className="mt-14 font-display text-2xl font-700 text-navy-950">Leaderboard</h2>
        {!season ? (
          <div className="mt-5">
            <EmptyState title="No season set up yet" message="An admin needs to create the current NFL season and add games." />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No picks in yet" message="Be the first to make your picks and top the board!" />
          </div>
        ) : (
          <div className="card mt-5 overflow-x-auto">
            <table className="stat-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Member</th>
                  <th className="text-center">Weekly</th>
                  <th className="text-center">Futures</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_id}>
                    <td className="font-semibold text-navy-500">{i + 1}</td>
                    <td className="font-semibold text-navy-950">
                      {i === 0 && <span className="mr-1">👑</span>}
                      {r.display_name}
                    </td>
                    <td className="text-center tabular-nums">{r.weekly_pts}</td>
                    <td className="text-center tabular-nums">{r.futures_pts}</td>
                    <td className="text-right tabular-nums font-bold text-navy-950">{r.total_pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
