"use client";

import { AdminTable } from "@/components/admin/AdminTable";

export default function AdminNflSeason() {
  return (
    <AdminTable
      table="nfl_season"
      title="NFL Seasons"
      description="The prediction-game seasons. Mark one as current, and set when futures picks lock (usually kickoff of Week 1)."
      idField="season_year"
      orderBy={{ column: "season_year", ascending: false }}
      fields={[
        { key: "season_year", label: "Year", type: "number", required: true },
        { key: "is_current", label: "Current?", type: "boolean", default: false, placeholder: "This is the active season" },
        {
          key: "futures_lock_at",
          label: "Futures lock (ISO time)",
          placeholder: "2025-09-05T00:20:00Z",
          hideInTable: true,
        },
      ]}
    />
  );
}
