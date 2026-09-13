"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/predict", label: "Leaderboard", exact: true },
  { href: "/predict/games", label: "Weekly Picks" },
  { href: "/predict/futures", label: "Futures" },
];

export function PredictNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [who, setWho] = useState<{ name: string } | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setWho(null); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setWho(null); return; }
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setWho({ name: data?.display_name || user.email || "Member" });
    })();
  }, []);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const signOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.refresh();
    setWho(null);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active(t.href, t.exact)
                ? "bg-navy text-white"
                : "border border-navy-900/15 bg-white text-navy-900 hover:border-navy-900/30"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="text-sm">
        {who === undefined ? null : who ? (
          <span className="flex items-center gap-3">
            <span className="text-navy-900/60">Signed in as <strong className="text-navy-900">{who.name}</strong></span>
            <button onClick={signOut} className="font-semibold text-red-600 hover:text-red-800">Sign out</button>
          </span>
        ) : (
          <Link href="/login?redirect=/predict/games" className="btn-primary py-2">Sign in to play</Link>
        )}
      </div>
    </div>
  );
}
