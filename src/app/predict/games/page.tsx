"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PredictNav } from "@/components/predict/PredictNav";
import type { NflGame, NflSeason, NflTeam } from "@/lib/types";

const isLocked = (g: NflGame) =>
  g.is_final || (g.kickoff != null && new Date(g.kickoff).getTime() <= Date.now());

export default function GamesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [season, setSeason] = useState<NflSeason | null>(null);
  const [teams, setTeams] = useState<Record<string, NflTeam>>({});
  const [games, setGames] = useState<NflGame[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({}); // game_id -> pick_abbr
  const [week, setWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const [seasons, tms] = await Promise.all([
      supabase.from("nfl_season").select("*").order("season_year", { ascending: false }),
      supabase.from("nfl_teams").select("*"),
    ]);
    const cur = (seasons.data ?? []).find((s: NflSeason) => s.is_current) ?? (seasons.data ?? [])[0] ?? null;
    setSeason(cur);
    setTeams(Object.fromEntries((tms.data ?? []).map((t: NflTeam) => [t.abbr, t])));

    if (cur) {
      const { data: gs } = await supabase
        .from("nfl_games").select("*").eq("season_year", cur.season_year)
        .order("week", { ascending: true }).order("kickoff", { ascending: true });
      const list = (gs ?? []) as NflGame[];
      setGames(list);

      if (user) {
        const { data: ps } = await supabase.from("game_picks").select("game_id,pick_abbr");
        setPicks(Object.fromEntries((ps ?? []).map((p: any) => [p.game_id, p.pick_abbr])));
      }

      // default week = first week with an unlocked game, else last week
      const weeks = Array.from(new Set(list.map((g) => g.week))).sort((a, b) => a - b);
      const open = weeks.find((w) => list.some((g) => g.week === w && !isLocked(g)));
      setWeek(open ?? weeks[weeks.length - 1] ?? null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const weeks = useMemo(
    () => Array.from(new Set(games.map((g) => g.week))).sort((a, b) => a - b),
    [games],
  );
  const weekGames = games.filter((g) => g.week === week);

  const makePick = async (game: NflGame, abbr: string) => {
    if (!supabase || !userId) return;
    if (isLocked(game)) return;
    setSavingId(game.id);
    setError(null);
    const prev = picks[game.id];
    setPicks((p) => ({ ...p, [game.id]: abbr })); // optimistic
    const { error } = await supabase
      .from("game_picks")
      .upsert({ user_id: userId, game_id: game.id, pick_abbr: abbr }, { onConflict: "user_id,game_id" });
    if (error) {
      setError(error.message);
      setPicks((p) => ({ ...p, [game.id]: prev })); // revert
    }
    setSavingId(null);
  };

  const tName = (abbr: string) => teams[abbr]?.name ?? abbr;

  return (
    <div className="container-content py-12">
      <PredictNav />

      {loading ? (
        <p className="mt-10 text-center text-sm text-navy-900/55">Loading…</p>
      ) : !season ? (
        <p className="mt-10 text-center text-sm text-navy-900/55">
          No NFL season set up yet. Check back once the commissioner adds the schedule.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-700 text-navy-950">
              {season.season_year} · Weekly Picks
            </h1>
            {weeks.length > 0 && (
              <select
                className="field w-auto"
                value={week ?? ""}
                onChange={(e) => setWeek(Number(e.target.value))}
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            )}
          </div>

          {userId === null && (
            <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a611b]">
              <Link href="/login?redirect=/predict/games" className="font-semibold underline">Sign in</Link>{" "}
              to lock in your picks. You can browse the slate below either way.
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {weekGames.length === 0 ? (
            <p className="mt-10 text-center text-sm text-navy-900/55">No games scheduled for this week yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {weekGames.map((g) => {
                const locked = isLocked(g);
                const myPick = picks[g.id];
                return (
                  <div key={g.id} className="card p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-navy-900/50">
                      <span>
                        {g.kickoff
                          ? new Date(g.kickoff).toLocaleString(undefined, {
                              weekday: "short", month: "short", day: "numeric",
                              hour: "numeric", minute: "2-digit",
                            })
                          : "Time TBD"}
                      </span>
                      {locked ? (
                        <span className="badge-navy">{g.is_final ? "Final" : "Locked"}</span>
                      ) : (
                        <span className="text-emerald-600">Open</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[g.away_abbr, g.home_abbr].map((abbr, idx) => {
                        const picked = myPick === abbr;
                        const isWinner = g.winner_abbr === abbr;
                        const correct = g.is_final && picked && isWinner;
                        const wrong = g.is_final && picked && !isWinner;
                        return (
                          <button
                            key={abbr}
                            disabled={locked || !userId || savingId === g.id}
                            onClick={() => makePick(g, abbr)}
                            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                              picked
                                ? "border-navy bg-navy text-white"
                                : "border-navy-900/15 bg-white text-navy-900 hover:border-navy-900/40"
                            } ${locked || !userId ? "cursor-default opacity-95" : ""} ${
                              correct ? "ring-2 ring-emerald-400" : wrong ? "ring-2 ring-red-300" : ""
                            }`}
                          >
                            <span>
                              <span className="block text-xs uppercase tracking-wide opacity-60">
                                {idx === 0 ? "Away" : "Home"}
                              </span>
                              <span className="font-semibold">{tName(abbr)}</span>
                            </span>
                            {g.is_final && isWinner && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
