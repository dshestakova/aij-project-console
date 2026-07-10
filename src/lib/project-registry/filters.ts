import type { ProjectListItem } from "@/types/project-registry";

export type ArchiveMode = "active" | "all" | "archived";
export type BooleanFilter = "all" | "yes" | "no";
export type QualityFilter = "all" | "good" | "partial" | "poor";

export type ProjectRegistryFilters = {
  archiveMode?: ArchiveMode;
  csmId?: string;
  directorId?: string;
  flagship?: BooleanFilter;
  flagshipStatusId?: string;
  industryUnitId?: string;
  quality?: QualityFilter;
  query?: string;
  social?: BooleanFilter;
  statusId?: string;
};

export function filterProjectRegistryProjects(
  projects: ProjectListItem[],
  filters: ProjectRegistryFilters,
) {
  return projects.filter((project) =>
    matchesProjectRegistryFilters(project, filters),
  );
}

export function matchesProjectRegistryFilters(
  project: ProjectListItem,
  filters: ProjectRegistryFilters,
) {
  const archiveMode = filters.archiveMode ?? "active";

  if (archiveMode === "active" && isArchivedProject(project)) {
    return false;
  }

  if (archiveMode === "archived" && !isArchivedProject(project)) {
    return false;
  }

  if (!matchesReferenceFilter(project.status?.id, filters.statusId)) {
    return false;
  }

  if (!matchesReferenceFilter(project.csm?.id, filters.csmId)) {
    return false;
  }

  if (!matchesReferenceFilter(project.director?.id, filters.directorId)) {
    return false;
  }

  if (!matchesReferenceFilter(project.industry_unit?.id, filters.industryUnitId)) {
    return false;
  }

  if (
    !matchesReferenceFilter(
      project.flagship_status?.id,
      filters.flagshipStatusId,
    )
  ) {
    return false;
  }

  if (!matchesBooleanFilter(project.is_flagship, filters.flagship)) {
    return false;
  }

  if (!matchesBooleanFilter(project.is_social, filters.social)) {
    return false;
  }

  if (!matchesQualityFilter(project, filters.quality)) {
    return false;
  }

  return matchesSearchQuery(project, filters.query);
}

export function isArchivedProject(project: Pick<ProjectListItem, "is_archived">) {
  return project.is_archived === true;
}

export function getProjectQualityCategory(
  project: Pick<
    ProjectListItem,
    | "client"
    | "csm_id"
    | "director_id"
    | "essence"
    | "industry_unit_id"
    | "next_step"
    | "project_name"
    | "status_id"
  >,
): Exclude<QualityFilter, "all"> {
  const filledCount = [
    project.client,
    project.project_name,
    project.essence,
    project.status_id,
    project.industry_unit_id,
    project.csm_id,
    project.director_id,
    project.next_step,
  ].filter((value) => Boolean(value?.trim())).length;

  if (filledCount >= 7) {
    return "good";
  }

  if (filledCount >= 4) {
    return "partial";
  }

  return "poor";
}

function matchesReferenceFilter(
  projectReferenceId: string | null | undefined,
  filterValue = "all",
) {
  if (filterValue === "all") {
    return true;
  }

  if (filterValue === "__none") {
    return !projectReferenceId;
  }

  return projectReferenceId === filterValue;
}

function matchesBooleanFilter(value: boolean, filterValue: BooleanFilter = "all") {
  if (filterValue === "all") {
    return true;
  }

  return filterValue === "yes" ? value : !value;
}

function matchesQualityFilter(
  project: ProjectListItem,
  filterValue: QualityFilter = "all",
) {
  return filterValue === "all" || getProjectQualityCategory(project) === filterValue;
}

function matchesSearchQuery(project: ProjectListItem, query = "") {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    project.external_id,
    project.client,
    project.project_name,
    project.next_step,
    project.status?.name,
    project.csm?.full_name,
    project.director?.full_name,
    project.industry_unit?.name,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
}
