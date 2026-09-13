import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-navy text-white">
      <div className="container-content grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-white.png"
              alt="So Whopped FFL"
              width={30}
              height={46}
              className="h-9 w-auto"
            />
            <span className="font-display text-xl font-700 tracking-tight">
              So Whopped FFL
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Fourteen seasons and counting. A dynasty fantasy football league
            built on rivalries, dramatic finishes, and one very coveted trophy.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
            League
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li><Link className="hover:text-white" href="/standings">Standings</Link></li>
            <li><Link className="hover:text-white" href="/stats">Stats</Link></li>
            <li><Link className="hover:text-white" href="/records">Records</Link></li>
            <li><Link className="hover:text-white" href="/history">History</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white/50">
            More
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li><Link className="hover:text-white" href="/rosters">Rosters</Link></li>
            <li><Link className="hover:text-white" href="/managers">Managers</Link></li>
            <li><Link className="hover:text-white" href="/optimal">Optimal Lineups</Link></li>
            <li><Link className="hover:text-white" href="/playoff-odds">Playoff Odds</Link></li>
            <li><Link className="hover:text-white" href="/admin">Admin</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-content flex flex-col items-center justify-between gap-2 py-6 text-xs text-white/50 sm:flex-row">
          <p>© {year} So Whopped FFL. All rights reserved.</p>
          <p>Built for the league, by the league.</p>
        </div>
      </div>
    </footer>
  );
}
