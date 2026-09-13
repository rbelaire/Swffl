"use client";

import { AdminTable } from "@/components/admin/AdminTable";

const teamLabel = (t: any, refs: Record<string, any[]>) => {
  const season = refs.seasons?.find((s) => s.id === t.season_id);
  const mgr = refs.managers?.find((m) => m.id === t.manager_id);
  return [season?.year, t.team_name || mgr?.name || "Team"].filter(Boolean).join(" · ");
};

export default function AdminMatchups() {
  return (
    <AdminTable
      table="matchups"
      title="Matchups"
      description="Head-to-head games. Leave scores blank for future games (used by playoff odds)."
      orderBy={{ column: "week", ascending: true }}
      references={[
        { table: "seasons", orderBy: { column: "year", ascending: false }, label: (s) => String(s.year) },
        { table: "managers", orderBy: { column: "name" }, label: (m) => m.name },
        { table: "teams", orderBy: { column: "created_at", ascending: false }, label: teamLabel },
      ]}
      fields={[
        { key: "season_id", label: "Season", type: "ref", refTable: "seasons", required: true },
        { key: "week", label: "Week", type: "number", required: true },
        { key: "is_playoff", label: "Playoff?", type: "boolean", default: false },
        { key: "round", label: "Round", placeholder: "e.g. Championship", hideInTable: true },
        { key: "home_team_id", label: "Home", type: "ref", refTable: "teams", required: true },
        { key: "away_team_id", label: "Away", type: "ref", refTable: "teams", required: true },
        { key: "home_score", label: "Home Pts", type: "number" },
        { key: "away_score", label: "Away Pts", type: "number" },
      ]}
    />
  );
}
