"use client";

import { AdminTable } from "@/components/admin/AdminTable";

const teamOpt = { table: "nfl_teams", valueField: "abbr", orderBy: { column: "name" }, label: (t: any) => `${t.abbr} — ${t.name}` };

export default function AdminNflGames() {
  return (
    <AdminTable
      table="nfl_games"
      title="NFL Games"
      description="The weekly schedule. Set kickoff (picks lock then), and fill winner + Final once a game is decided. Tip: bulk-import the schedule from the Import page."
      orderBy={{ column: "week", ascending: true }}
      references={[teamOpt]}
      fields={[
        { key: "season_year", label: "Year", type: "number", required: true },
        { key: "week", label: "Week", type: "number", required: true },
        { key: "kickoff", label: "Kickoff (ISO time)", placeholder: "2025-09-07T17:00:00Z", hideInTable: true },
        { key: "away_abbr", label: "Away", type: "ref", refTable: "nfl_teams", required: true },
        { key: "home_abbr", label: "Home", type: "ref", refTable: "nfl_teams", required: true },
        { key: "winner_abbr", label: "Winner", type: "ref", refTable: "nfl_teams" },
        { key: "is_final", label: "Final?", type: "boolean", default: false },
      ]}
    />
  );
}
