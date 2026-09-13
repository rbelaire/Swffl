"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NflSeason, NflTeam } from "@/lib/types";

export default function AdminFuturesResults() {
  const supabase = useMemo(() => createClient(), []);
  const [seasons, setSeasons] = useState<NflSeason[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [teams, setTeams] = useState<NflTeam[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async (y?: number) => {
    if (!supabase) return;
    const [ss, tt] = await Promise.all([
      supabase.from("nfl_season").select("*").order("season_year", { ascending: false }),
      supabase.from("nfl_teams").select("*").order("division").order("name"),
    ]);
    const list = (ss.data ?? []) as NflSeason[];
    setSeasons(list);
    setTeams((tt.data ?? []) as NflTeam[]);
    const chosen = y ?? list.find((s) => s.is_current)?.season_year ?? list[0]?.season_year ?? null;
    setYear(chosen);
    if (chosen != null) {
      const { data } = await supabase.from("futures_results").select("*").eq("season_year", chosen);
      setResults(Object.fromEntries((data ?? []).map((r: any) => [`${r.category}|${r.slot_key}`, r.winner_abbr ?? ""])));
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const divisions = useMemo(() => {
    const order = ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"];
    const by: Record<string, NflTeam[]> = {};
    for (const t of teams) (by[t.division] ??= []).push(t);
    return order.filter((d) => by[d]).map((d) => ({ division: d, teams: by[d] }));
  }, [teams]);
  const conf = useMemo(() => {
    const by: Record<string, NflTeam[]> = {};
    for (const t of teams) (by[t.conference] ??= []).push(t);
    return ["AFC", "NFC"].filter((c) => by[c]).map((c) => ({ c, teams: by[c] }));
  }, [teams]);

  const save = async (category: string, slot_key: string, winner: string) => {
    if (!supabase || year == null) return;
    const key = `${category}|${slot_key}`;
    setSavingKey(key);
    setError(null);
    setResults((r) => ({ ...r, [key]: winner }));
    const { error } = await supabase.from("futures_results").upsert(
      { season_year: year, category, slot_key, winner_abbr: winner || null },
      { onConflict: "season_year,category,slot_key" },
    );
    if (error) setError(error.message);
    setSavingKey(null);
  };

  const Row = ({ category, slot, label, options }: { category: string; slot: string; label: string; options: NflTeam[] }) => {
    const key = `${category}|${slot}`;
    return (
      <div className="flex items-center justify-between gap-3 border-b border-navy-900/[0.06] py-2.5 last:border-0">
        <span className="text-sm font-medium text-navy-900">{label}</span>
        <select
          className="field w-48"
          value={results[key] ?? ""}
          disabled={savingKey === key}
          onChange={(e) => save(category, slot, e.target.value)}
        >
          <option value="">— not decided —</option>
          {options.map((t) => (
            <option key={t.abbr} value={t.abbr}>{t.name}</option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700 text-navy-950">Futures Results</h1>
          <p className="mt-1 text-sm text-navy-900/60">
            Set the actual winners as the season plays out. These score everyone&apos;s futures picks automatically.
          </p>
        </div>
        <select
          className="field w-auto"
          value={year ?? ""}
          onChange={(e) => load(Number(e.target.value))}
        >
          {seasons.map((s) => (
            <option key={s.season_year} value={s.season_year}>{s.season_year}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {seasons.length === 0 ? (
        <p className="mt-8 text-sm text-navy-900/55">Create an NFL season first.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-display text-lg font-700 text-navy-950">Division Winners</h2>
            <div className="mt-3">
              {divisions.map((d) => (
                <Row key={d.division} category="division" slot={d.division} label={d.division} options={d.teams} />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-display text-lg font-700 text-navy-950">Conference Champions</h2>
              <div className="mt-3">
                {conf.map((c) => (
                  <Row key={c.c} category="conference" slot={c.c} label={`${c.c} Champion`} options={c.teams} />
                ))}
              </div>
            </div>
            <div className="card p-6">
              <h2 className="font-display text-lg font-700 text-navy-950">Super Bowl Champion</h2>
              <div className="mt-3">
                <Row category="super_bowl" slot="SB" label="Super Bowl Winner" options={teams} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
