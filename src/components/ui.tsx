import Link from "next/link";
import type { ReactNode } from "react";

/** Navy hero band used at the top of interior pages. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="bg-navy text-white">
      <div className="container-content py-14 sm:py-20">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 font-display text-4xl font-700 tracking-tight sm:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}

/** A compact stat tile. */
export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-700 text-navy-950">{value}</p>
      {sub && <p className="mt-1 text-sm text-navy-900/60">{sub}</p>}
    </div>
  );
}

/** Friendly empty state. */
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900/[0.06] text-navy-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-lg font-600 text-navy-950">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-navy-900/60">{message}</p>
    </div>
  );
}

/** Shown on public pages when Supabase env vars are not yet configured. */
export function SetupNotice() {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 text-sm text-[#7a611b]">
      <p className="font-semibold">Connect Supabase to go live</p>
      <p className="mt-1 leading-relaxed">
        This is sample content. Add your{" "}
        <code className="rounded bg-white/70 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        and{" "}
        <code className="rounded bg-white/70 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        to <code className="rounded bg-white/70 px-1">.env.local</code>, run{" "}
        <code className="rounded bg-white/70 px-1">supabase/schema.sql</code>, and
        your real league data will appear here. See the README for the full guide.
      </p>
    </div>
  );
}

/** Row of year tabs linking to `${basePath}?year=YYYY`. */
export function SeasonTabs({
  seasons,
  selectedYear,
  basePath,
  extraQuery = "",
}: {
  seasons: { id: string; year: number }[];
  selectedYear?: number;
  basePath: string;
  extraQuery?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((s) => (
        <Link
          key={s.id}
          href={`${basePath}?year=${s.year}${extraQuery}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            s.year === selectedYear
              ? "bg-navy text-white"
              : "border border-navy-900/15 bg-white text-navy-900 hover:border-navy-900/30"
          }`}
        >
          {s.year}
        </Link>
      ))}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1.5 font-display text-2xl font-700 tracking-tight text-navy-950 sm:text-3xl">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-semibold text-navy-600 hover:text-navy-800"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
