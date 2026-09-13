import Link from "next/link";
import {
  getDraftPicks,
  getManagers,
  getMatchups,
  getPlayerScores,
  getRecords,
  getSeasons,
  getTeams,
  isSupabaseConfigured,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const configured = isSupabaseConfigured();

  const [managers, seasons, teams, matchups, players, draft, records] =
    await Promise.all([
      getManagers(),
      getSeasons(),
      getTeams(),
      getMatchups(),
      getPlayerScores(),
      getDraftPicks(),
      getRecords(),
    ]);

  const cards = [
    { href: "/admin/managers", label: "Managers", count: managers.length },
    { href: "/admin/seasons", label: "Seasons", count: seasons.length },
    { href: "/admin/teams", label: "Teams", count: teams.length },
    { href: "/admin/matchups", label: "Matchups", count: matchups.length },
    { href: "/admin/players", label: "Player Scores", count: players.length },
    { href: "/admin/draft", label: "Draft Picks", count: draft.length },
    { href: "/admin/records", label: "Records", count: records.length },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-700 text-navy-950">Dashboard</h1>
      <p className="mt-1 text-sm text-navy-900/60">
        Manage everything on the site from here. Changes save straight to
        Supabase and appear live.
      </p>

      {!configured && (
        <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-5 text-sm text-[#7a611b]">
          <p className="font-semibold">Supabase isn&apos;t connected yet</p>
          <p className="mt-1 leading-relaxed">
            Add your project keys to <code>.env.local</code> and run{" "}
            <code>supabase/schema.sql</code> to enable saving. See the README for
            step-by-step setup.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
              {c.label}
            </p>
            <p className="mt-2 font-display text-3xl font-700 text-navy-950">
              {c.count}
            </p>
            <p className="mt-3 text-sm font-semibold text-navy-600 group-hover:text-navy-800">
              Manage →
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-navy-700 bg-navy p-6 text-white">
        <h2 className="font-display text-lg font-700">Loading a lot of data?</h2>
        <p className="mt-1 text-sm text-white/70">
          The <strong>Bulk Import</strong> tool takes CSV or JSON and matches
          seasons/teams automatically — the fastest way to load matchups,
          weekly player scores, and drafts across 14 years.
        </p>
        <Link href="/admin/import" className="btn-primary mt-4 bg-white text-navy-950 hover:bg-white/90">
          Open Bulk Import
        </Link>
      </div>

      <div className="mt-6 card p-6">
        <h2 className="font-display text-lg font-700 text-navy-950">Prediction Pool</h2>
        <p className="mt-1 text-sm text-navy-900/60">
          Run the members-vs-field NFL pick&apos;em. Set up the season, load the
          schedule, and enter results as they happen.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/nfl-season" className="btn-ghost">NFL Seasons</Link>
          <Link href="/admin/nfl-games" className="btn-ghost">NFL Games</Link>
          <Link href="/admin/futures-results" className="btn-ghost">Futures Results</Link>
          <Link href="/admin/members" className="btn-ghost">Members</Link>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <h2 className="font-display text-lg font-700 text-navy-950">
          Recommended order
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-navy-900/75">
          <li>
            1. <strong>Managers</strong> → 2. <strong>Seasons</strong> → 3.{" "}
            <strong>Teams</strong> (these must exist before importing games).
          </li>
          <li>
            4. <strong>Matchups</strong> and <strong>Player Scores</strong> (bulk
            import) unlock optimal lineups, power rankings, playoff odds, luck,
            head-to-head, records and awards.
          </li>
          <li>
            5. <strong>Draft Picks</strong> power the Draft Room and grades.
          </li>
          <li>
            • Career/all-time stats are computed automatically — never entered by hand.
          </li>
        </ul>
      </div>
    </div>
  );
}
