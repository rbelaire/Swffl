import Link from "next/link";
import { computeCareerStats, getManagers, getSeasons, getTeams } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Managers" };

export default async function ManagersPage() {
  const [managers, seasons, teams] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
  ]);
  const careers = computeCareerStats(managers, seasons, teams);

  return (
    <>
      <PageHeader
        eyebrow="The Owners"
        title="Managers"
        intro="Every manager who has ever set a lineup. Tap through for a full career profile."
      />
      <div className="container-content py-12">
        {managers.length === 0 ? (
          <EmptyState title="No managers yet" message="Add managers in the admin area." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {careers.map((c) => (
              <Link
                key={c.manager.id}
                href={c.manager.slug ? `/managers/${c.manager.slug}` : "#"}
                className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-700 text-navy-950">
                    {c.manager.name}
                  </h2>
                  {c.championships > 0 && (
                    <span className="badge-gold">🏆 {c.championships}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-navy-900/55">
                  {c.manager.active ? "Active" : "Retired"}
                  {c.manager.joined_year ? ` · since ${c.manager.joined_year}` : ""}
                </p>
                <div className="mt-4 flex gap-6 text-sm">
                  <div>
                    <p className="font-display text-lg font-700 text-navy-950">{c.seasons}</p>
                    <p className="text-xs text-navy-900/55">Seasons</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-700 text-navy-950 tabular-nums">
                      {c.wins}–{c.losses}
                    </p>
                    <p className="text-xs text-navy-900/55">Record</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-700 text-navy-950">
                      {(c.winPct * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-navy-900/55">Win rate</p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-navy-600 group-hover:text-navy-800">
                  View profile →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
