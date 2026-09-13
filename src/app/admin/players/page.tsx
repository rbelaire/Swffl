"use client";

import { AdminTable } from "@/components/admin/AdminTable";

const teamLabel = (t: any, refs: Record<string, any[]>) => {
  const season = refs.seasons?.find((s) => s.id === t.season_id);
  const mgr = refs.managers?.find((m) => m.id === t.manager_id);
  return [season?.year, t.team_name || mgr?.name || "Team"].filter(Boolean).join(" · ");
};

export default function AdminPlayers() {
  return (
    <AdminTable
      table="player_scores"
      title="Player Scores"
      description="Weekly player lines (starters AND bench). This powers optimal lineups, coaching efficiency, MVPs and draft grades. Tip: use the Import page to load these in bulk."
      orderBy={{ column: "week", ascending: true }}
      references={[
        { table: "seasons", orderBy: { column: "year", ascending: false }, label: (s) => String(s.year) },
        { table: "managers", orderBy: { column: "name" }, label: (m) => m.name },
        { table: "teams", orderBy: { column: "created_at", ascending: false }, label: teamLabel },
      ]}
      fields={[
        { key: "season_id", label: "Season", type: "ref", refTable: "seasons", required: true },
        { key: "team_id", label: "Team", type: "ref", refTable: "teams", required: true },
        { key: "week", label: "Week", type: "number", required: true },
        { key: "is_playoff", label: "Playoff?", type: "boolean", default: false, hideInTable: true },
        { key: "player_name", label: "Player", required: true },
        {
          key: "position",
          label: "Pos",
          type: "select",
          options: ["QB", "RB", "WR", "TE", "K", "DEF"].map((p) => ({ value: p, label: p })),
        },
        { key: "nfl_team", label: "NFL", placeholder: "e.g. KC", hideInTable: true },
        {
          key: "lineup_slot",
          label: "Slot",
          type: "select",
          default: "BENCH",
          options: ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF", "BENCH", "IR"].map((s) => ({ value: s, label: s })),
        },
        { key: "points", label: "Points", type: "number", default: 0 },
      ]}
    />
  );
}
