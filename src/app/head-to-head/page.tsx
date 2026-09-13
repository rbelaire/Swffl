import { getManagers, getMatchups, getSeasons, getTeams } from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { headToHead } from "@/lib/analytics";
import { EmptyState, PageHeader, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Head-to-Head" };

export default async function HeadToHeadPage() {
  const [managers, seasons, teams, matchups] = await Promise.all([
    getManagers(),
    getSeasons(),
    getTeams(),
    getMatchups(),
  ]);

  const L = buildLookups(managers, seasons, teams);
  const grid = headToHead(matchups, L.teamToManager);

  // managers that actually appear in head-to-head data
  const ids = [...grid.keys()].sort((a, b) =>
    (L.managerById.get(a)?.name ?? "").localeCompare(L.managerById.get(b)?.name ?? ""),
  );

  // build rivalry list (unordered pairs)
  type Rivalry = { a: string; b: string; games: number; aw: number; bw: number; ties: number; diff: number };
  const seen = new Set<string>();
  const rivalries: Rivalry[] = [];
  for (const a of ids) {
    for (const [b, cell] of grid.get(a)!) {
      const key = [a, b].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const rev = grid.get(b)?.get(a);
      const bw = rev?.wins ?? cell.losses;
      const games = cell.wins + cell.losses + cell.ties;
      rivalries.push({ a, b, games, aw: cell.wins, bw, ties: cell.ties, diff: Math.abs(cell.wins - bw) });
    }
  }
  const mostPlayed = [...rivalries].sort((r1, r2) => r2.games - r1.games).slice(0, 3);
  const closest = [...rivalries].filter((r) => r.games >= 3).sort((r1, r2) => r1.diff - r2.diff || r2.games - r1.games).slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Bad Blood"
        title="Head-to-Head"
        intro="Every manager against every other, all-time. Find out who owns whom."
      />

      <div className="container-content py-12">
        {ids.length === 0 ? (
          <EmptyState title="No matchup history yet" message="Add matchups across seasons to build the all-time head-to-head grid." />
        ) : (
          <>
            {/* Rivalry cards */}
            {(mostPlayed.length > 0 || closest.length > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <SectionHeading eyebrow="Most Played" title="Storied Rivalries" />
                  <div className="mt-5 space-y-3">
                    {mostPlayed.map((r) => (
                      <RivalryCard key={`${r.a}${r.b}`} r={r} name={L.managerName} />
                    ))}
                  </div>
                </div>
                <div>
                  <SectionHeading eyebrow="Too Close to Call" title="Dead Heats" />
                  <div className="mt-5 space-y-3">
                    {closest.length === 0 ? (
                      <p className="text-sm text-navy-900/55">Not enough games yet.</p>
                    ) : (
                      closest.map((r) => (
                        <RivalryCard key={`c${r.a}${r.b}`} r={r} name={L.managerName} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Full grid */}
            <h2 className="mt-14 font-display text-2xl font-700 text-navy-950">
              All-Time Grid
            </h2>
            <p className="mt-1 text-sm text-navy-900/60">
              Read across: each row is that manager&apos;s record vs. the column.
            </p>
            <div className="card mt-5 overflow-x-auto">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white">Manager</th>
                    {ids.map((c) => (
                      <th key={c} className="text-center">
                        {initials(L.managerById.get(c)?.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ids.map((rId) => (
                    <tr key={rId}>
                      <td className="sticky left-0 bg-white font-semibold text-navy-950">
                        {L.managerById.get(rId)?.name}
                      </td>
                      {ids.map((cId) => {
                        if (rId === cId)
                          return <td key={cId} className="bg-navy-900/[0.03] text-center text-navy-900/25">—</td>;
                        const cell = grid.get(rId)?.get(cId);
                        if (!cell || cell.wins + cell.losses + cell.ties === 0)
                          return <td key={cId} className="text-center text-navy-900/25">·</td>;
                        const winning = cell.wins > cell.losses;
                        const losing = cell.wins < cell.losses;
                        return (
                          <td
                            key={cId}
                            className={`text-center tabular-nums font-medium ${
                              winning ? "text-emerald-700" : losing ? "text-red-600" : "text-navy-900"
                            }`}
                          >
                            {cell.wins}-{cell.losses}{cell.ties ? `-${cell.ties}` : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function RivalryCard({
  r,
  name,
}: {
  r: { a: string; b: string; games: number; aw: number; bw: number; ties: number };
  name: (id: string) => string;
}) {
  const leader = r.aw === r.bw ? null : r.aw > r.bw ? r.a : r.b;
  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-600 text-navy-950">
          {name(r.a)} <span className="text-navy-900/40">vs</span> {name(r.b)}
        </p>
        <p className="text-sm text-navy-900/60">{r.games} meetings all-time</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-xl font-700 tabular-nums text-navy-950">
          {r.aw}–{r.bw}{r.ties ? `–${r.ties}` : ""}
        </p>
        <p className="text-xs text-navy-900/55">
          {leader ? `${name(leader)} leads` : "All square"}
        </p>
      </div>
    </div>
  );
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
