"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const sections = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/import", label: "Bulk Import" },
  { href: "/admin/managers", label: "Managers" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/matchups", label: "Matchups" },
  { href: "/admin/players", label: "Player Scores" },
  { href: "/admin/draft", label: "Draft Picks" },
  { href: "/admin/rosters", label: "Rosters" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/content", label: "Site Content" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/nfl-season", label: "NFL Seasons" },
  { href: "/admin/nfl-games", label: "NFL Games" },
  { href: "/admin/futures-results", label: "Futures Results" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="container-content grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/logo-dark.png" alt="" width={26} height={40} className="h-7 w-auto" />
          <div>
            <p className="font-display text-sm font-700 leading-tight text-navy-950">
              Admin
            </p>
            <p className="text-xs text-navy-900/50">So Whopped FFL</p>
          </div>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active(s.href, s.exact)
                  ? "bg-navy text-white"
                  : "text-navy-900/70 hover:bg-navy-900/[0.05] hover:text-navy-950"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 hidden border-t border-navy-900/10 pt-4 lg:block">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm text-navy-900/60 hover:text-navy-950"
          >
            ← View site
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {children}
        <div className="mt-10 flex gap-3 border-t border-navy-900/10 pt-6 lg:hidden">
          <Link href="/" className="btn-ghost">
            View site
          </Link>
          <button onClick={signOut} className="btn-danger">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
