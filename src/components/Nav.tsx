"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const primary = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/stats", label: "Stats" },
  { href: "/rosters", label: "Rosters" },
  { href: "/history", label: "History" },
];

const analytics = [
  { href: "/optimal", label: "Optimal Lineups", desc: "Best-ball standings" },
  { href: "/power", label: "Power Rankings", desc: "Who's hot right now" },
  { href: "/playoff-odds", label: "Playoff Odds", desc: "Simulated seeding" },
  { href: "/luck", label: "Luck Index", desc: "All-play vs. actual" },
  { href: "/head-to-head", label: "Head-to-Head", desc: "All-time rivalries" },
  { href: "/draft", label: "Draft Room", desc: "History & grades" },
  { href: "/records", label: "Record Book", desc: "All the extremes" },
  { href: "/awards", label: "Awards", desc: "Season superlatives" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const analyticsActive = analytics.some((l) => isActive(l.href));

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setMenu(false);
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-900/10 bg-white/85 backdrop-blur">
      <nav className="container-content flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-dark.png"
            alt="So Whopped FFL"
            width={34}
            height={52}
            className="h-8 w-auto"
            priority
          />
          <span className="hidden font-display text-lg font-700 tracking-tight text-navy-950 sm:block">
            So Whopped <span className="text-navy-500">FFL</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {primary.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(l.href)
                  ? "bg-navy-900/[0.06] text-navy-950"
                  : "text-navy-900/70 hover:bg-navy-900/[0.04] hover:text-navy-950"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* Analytics dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                analyticsActive || menu
                  ? "bg-navy-900/[0.06] text-navy-950"
                  : "text-navy-900/70 hover:bg-navy-900/[0.04] hover:text-navy-950"
              }`}
            >
              Analytics
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={menu ? "rotate-180 transition" : "transition"}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-navy-900/10 bg-white p-1.5 shadow-card">
                {analytics.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`block rounded-lg px-3 py-2 transition ${
                      isActive(l.href) ? "bg-navy-900/[0.06]" : "hover:bg-navy-900/[0.04]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-navy-950">{l.label}</span>
                    <span className="block text-xs text-navy-900/55">{l.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/admin" className="btn-primary ml-2 py-2">
            Admin
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-navy-900 hover:bg-navy-900/[0.05] md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-navy-900/10 bg-white md:hidden">
          <div className="container-content flex flex-col py-3">
            {primary.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(l.href) ? "bg-navy-900/[0.06] text-navy-950" : "text-navy-900/75"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-navy-500">
              Analytics
            </p>
            {analytics.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(l.href) ? "bg-navy-900/[0.06] text-navy-950" : "text-navy-900/75"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/admin" className="btn-primary mt-3">
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
