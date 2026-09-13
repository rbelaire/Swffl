import type { Manager, Season, Team } from "@/lib/types";

/** Convenience lookups built once per page from the base datasets. */
export function buildLookups(
  managers: Manager[],
  seasons: Season[],
  teams: Team[],
) {
  const managerById = new Map(managers.map((m) => [m.id, m]));
  const managerBySlug = new Map(managers.filter((m) => m.slug).map((m) => [m.slug as string, m]));
  const seasonById = new Map(seasons.map((s) => [s.id, s]));
  const seasonByYear = new Map(seasons.map((s) => [s.year, s]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamToManager = new Map(teams.map((t) => [t.id, t.manager_id]));

  const managerName = (id: string | null | undefined) =>
    (id && managerById.get(id)?.name) || "—";

  const teamManagerName = (teamId: string) => {
    const t = teamById.get(teamId);
    return (t && managerById.get(t.manager_id)?.name) || "Unknown";
  };

  const teamLabel = (teamId: string) => {
    const t = teamById.get(teamId);
    if (!t) return "Unknown";
    return t.team_name || managerById.get(t.manager_id)?.name || "Team";
  };

  const teamSeasonYear = (teamId: string) => {
    const t = teamById.get(teamId);
    return t ? seasonById.get(t.season_id)?.year : undefined;
  };

  return {
    managerById,
    managerBySlug,
    seasonById,
    seasonByYear,
    teamById,
    teamToManager,
    managerName,
    teamManagerName,
    teamLabel,
    teamSeasonYear,
  };
}
