"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PredictNav } from "@/components/predict/PredictNav";
import type { FuturesResult, NflSeason, NflTeam } from "@/lib/types";

type PickKey = string; // `${category}|${slot_key}`

export default function FuturesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [season, setSeason] = useState<NflSeason | null>(null);
  const [teams, setTeams] = useState<NflTeam[]>([]);
  const [picks, setPicks] = useState<Record<PickKey, string>>({});
  const [results, setResults] = useState<Record<PickKey, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const [seasons, tms] = await Promise.all([
      supabase.from("nfl_season").select("*").order("season_year", { ascending: false }),
      supabase.from("nfl_teams").select("*").order("division").order("name"),
    ]);
    const cur = (seasons.data ?? []).find((s: NflSeason) => s.is_current) ?? (seasons.data ?? [])[0] ?? null;
    setSeason(cur);
    setTeams((tms.data ?? []) as NflTeam[]);

    if (cur) {
      const [res, mine] = await Promise.all([
        supabase.from("futures_results").select("*").eq("season_year", cur.season_year),
        user ? supabase.from("futures_picks").select("*").eq("season_year", cur.season_year) : Promise.resolve({ data: [] }),
      ]);
      setResults(Object.fromEntries((res.data ?? []).map((r: FuturesResult) => [`${r.category}|${r.slot_key}`, r.winner_abbr])));
      setPicks(Object.fromEntries((mine.data ?? []).map((p: any) => [`${p.category}|${p.slot_key}`, p.pick_abbr])));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const locked = season?.futures_lock_at != null && new Date(season.futures_lock_at).getTime() <= Date.now();

  const divisions = useMemo(() => {
    const order = ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"];
    const by: Record<string, NflTeam[]> = {};
    for (const t of teams) (by[t.division] ??= []).push(t);
    return order.filter((d) => by[d]).map((d) => ({ division: d, teams: by[d] }));
  }, [teams]);

  const conferences = useMemo(() => {
    const by: Record<string, NflTeam[]> = {};
    for (const t of teams) (by[t.conference] ??= []).push(t);
    return ["AFC", "NFC"].filter((c) => by[c]).map((c) => ({ conference: c, teams: by[c] }));
  }, [teams]);

  const setPick = async (category: string, slot_key: string, abbr: string) => {
    if (!supabase || !userId || !season || locked) return;
    const key = `${category}|${slot_key}`;
    setSavingKey(key);
    setError(null);
    const prev = picks[key];
    setPicks((p) => ({ ...p, [key]: abbr }));
    const { error } = await supabase.from("futures_picks").upsert(
      { user_id: userId, season_year: season.season_year, category, slot_key, pick_abbr: abbr },
      { onConflict: "user_id,season_year,category,slot_key" },
    );
    if (error) { setError(error.message); setPicks((p) => ({ ...p, [key]: prev })); }
    setSavingKey(null);
  };

  const Selector = ({
    category, slotKey, options, label,
  }: { category: string; slotKey: string; options: NflTeam[]; label: string }) => {
    const key = `${category}|${slotKey}`;
    const val = picks[key] ?? "";
    const result = results[key];
    const decided = result != null && result !== "";
    const correct = decided && val === result;
    return (
      <div className="flex items-center justify-between gap-3 border-b border-navy-900/[0.06] py-2.5 last:border-0">
        <span className="text-sm font-medium text-navy-900">{label}</span>
        <div className="flex items-center gap-2">
          {decided && (
            <span className={`badge ${correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {correct ? "✓" : "✗"} {result}
            </span>
          )}
          <select
            className="field w-44"
            value={val}
            disabled={locked || !userId || savingKey === key}
            onChange={(e) => setPick(category, slotKey, e.target.value)}
          >
            <option value="">— pick —</option>
            {options.map((t) => (
              <option key={t.abbr} value={t.abbr}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="container-content py-12">
      <PredictNav />

      {loading ? (
        <p className="mt-10 text-center text-sm text-navy-900/55">Loading…</p>
      ) : !season ? (
        <p className="mt-10 text-center text-sm text-navy-900/55">No NFL season set up yet.</p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-2xl font-700 text-navy-950">
              {season.season_year} Futures
            </h1>
            {locked ? (
              <span className="badge-navy">Locked</span>
            ) : season.futures_lock_at ? (
              <span className="text-sm text-navy-900/55">
                Locks {new Date(season.futures_lock_at).toLocaleString()}
              </span>
            ) : null}
          </div>

          {userId === null && (
            <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a611b]">
              <Link href="/login?redirect=/predict/futures" className="font-semibold underline">Sign in</Link> to set your futures.
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="font-display text-lg font-700 text-navy-950">Division Winners</h2>
              <p className="text-xs text-navy-900/55">8 picks · 1 pt each</p>
              <div className="mt-3">
                {divisions.map((d) => (
                  <Selector key={d.division} category="division" slotKey={d.division} options={d.teams} label={d.division} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="font-display text-lg font-700 text-navy-950">Conference Winners</h2>
                <p className="text-xs text-navy-900/55">2 picks · 1 pt each</p>
                <div className="mt-3">
                  {conferences.map((c) => (
                    <Selector key={c.conference} category="conference" slotKey={c.conference} options={c.teams} label={`${c.conference} Champion`} />
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h2 className="font-display text-lg font-700 text-navy-950">Super Bowl Champion</h2>
                <p className="text-xs text-navy-900/55">1 pick · 1 pt</p>
                <div className="mt-3">
                  <Selector category="super_bowl" slotKey="SB" options={teams} label="Super Bowl Winner" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
