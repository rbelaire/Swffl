"use client";

import { AdminTable } from "@/components/admin/AdminTable";

const teamLabel = (t: any, refs: Record<string, any[]>) => {
  const season = refs.seasons?.find((s) => s.id === t.season_id);
  const mgr = refs.managers?.find((m) => m.id === t.manager_id);
  return [season?.year, t.team_name || mgr?.name || "Team"].filter(Boolean).join(" · ");
};

export default function AdminDraft() {
  return (
    <AdminTable
      table="draft_picks"
      title="Draft Picks"
      description="Every pick, for draft history and retroactive grades."
      orderBy={{ column: "overall", ascending: true }}
      references={[
        { table: "seasons", orderBy: { column: "year", ascending: false }, label: (s) => String(s.year) },
        { table: "managers", orderBy: { column: "name" }, label: (m) => m.name },
        { table: "teams", orderBy: { column: "created_at", ascending: false }, label: teamLabel },
      ]}
      fields={[
        { key: "season_id", label: "Season", type: "ref", refTable: "seasons", required: true },
        { key: "overall", label: "Overall", type: "number" },
        { key: "round", label: "Round", type: "number" },
        { key: "pick", label: "Pick", type: "number", hideInTable: true },
        { key: "team_id", label: "Drafted By", type: "ref", refTable: "teams" },
        { key: "player_name", label: "Player", required: true },
        {
          key: "position",
          label: "Pos",
          type: "select",
          options: ["QB", "RB", "WR", "TE", "K", "DEF"].map((p) => ({ value: p, label: p })),
        },
        { key: "nfl_team", label: "NFL", hideInTable: true },
        { key: "is_keeper", label: "Keeper?", type: "boolean", default: false, hideInTable: true },
      ]}
    />
  );
}
