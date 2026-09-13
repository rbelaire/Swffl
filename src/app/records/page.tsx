import {
  getManagers,
  getMatchups,
  getPlayerScores,
  getRecords,
  getSeasons,
  getTeams,
} from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { autoRecords } from "@/lib/analytics";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record Book" };

export default async function RecordsPage() {
  const [records, managers, seasons, teams, matchups, scores] = await Promise.all([
    getRecords(),
    getManagers(),
    getSeasons(),
    getTeams(),
    getMatchups(),
    getPlayerScores(),
  ]);

  const L = buildLookups(managers, seasons, teams);
  const auto = autoRecords(matchups, scores, L.teamLabel, L.teamSeasonYear);

  const categories = Array.from(new Set(records.map((r) => r.category || "General")));

  return (
    <>
      <PageHeader
        eyebrow="Etched in Stone"
        title="Record Book"
        intro="The high-water marks of the league — auto-detected from game data, plus the records you add by hand."
      />

      <div className="container-content py-12">
        {/* Auto-detected records */}
        {auto.length > 0 && (
          <div className="mb-14">
            <h2 className="mb-5 font-display text-xl font-700 text-navy-950">
              Auto Record Book
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {auto.map((r) => (
                <div key={r.title} className="card p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                    {r.title}
                  </p>
                  <p className="mt-2 font-display text-3xl font-700 text-navy-950">{r.value}</p>
                  <p className="mt-1 text-sm font-medium text-navy-900/80">
                    {r.holder}
                    {r.seasonYear ? <span className="text-navy-900/50"> · {r.seasonYear}</span> : null}
                  </p>
                  {r.detail && <p className="mt-2 text-xs text-navy-900/55">{r.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual records */}
        {records.length === 0 && auto.length === 0 ? (
          <EmptyState
            title="No records yet"
            message="Add matchup and player data to auto-generate records, or add memorable records by hand in the admin area."
          />
        ) : records.length > 0 ? (
          <div className="space-y-12">
            {auto.length > 0 && (
              <h2 className="font-display text-xl font-700 text-navy-950">Hall of Fame</h2>
            )}
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="mb-5 font-display text-lg font-700 text-navy-950">{cat}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {records
                    .filter((r) => (r.category || "General") === cat)
                    .map((r) => (
                      <div key={r.id} className="card p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                          {r.title}
                        </p>
                        <p className="mt-2 font-display text-3xl font-700 text-navy-950">{r.value}</p>
                        <p className="mt-1 text-sm font-medium text-navy-900/80">
                          {r.holder}
                          {r.season_year ? <span className="text-navy-900/50"> · {r.season_year}</span> : null}
                        </p>
                        {r.description && (
                          <p className="mt-3 text-sm leading-relaxed text-navy-900/60">{r.description}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
