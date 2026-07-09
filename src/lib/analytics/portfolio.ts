import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PersonReference,
  ProjectListItem,
  ReferenceItem,
} from "@/types/project-registry";

export type AnalyticsSegment = {
  key: string;
  label: string;
  count: number;
  color: string;
  href?: string;
};

export type CsmMatrixGroup = {
  id: string;
  name: string;
  count: number;
  projects: ProjectListItem[];
};

export type DirectorAnalyticsGroup = {
  id: string;
  name: string;
  totalProjects: number;
  averageProjectsPerCsm: number;
  industries: Array<{
    id: string;
    name: string;
    totalProjects: number;
  }>;
  clusters: Array<{
    id: string;
    name: string;
    totalProjects: number;
    href: string;
    csms: Array<{
      id: string;
      name: string;
      projectCount: number;
      href: string;
    }>;
  }>;
  href: string;
};

export type DirectorCsmAssignment = {
  id: string;
  external_id: string;
  director_id: string | null;
  director_name: string;
  industry_unit_id: string | null;
  industry_unit_name: string;
  csm_id: string | null;
  csm_name: string;
  is_active: boolean;
  comment: string | null;
  sort_order: number | null;
};

export type PortfolioAnalyticsData = {
  activeProjects: ProjectListItem[];
  totalProjects: number;
  statusSegments: AnalyticsSegment[];
  clusterSegments: AnalyticsSegment[];
  csmMatrix: CsmMatrixGroup[];
  directorGroups: DirectorAnalyticsGroup[];
  assignments: DirectorCsmAssignment[];
  assignmentsErrorMessage: string | null;
  flagshipSplit: AnalyticsSegment[];
  flagshipStatusSegments: AnalyticsSegment[];
  flagshipReadiness: Array<{
    key: string;
    label: string;
    count: number;
    percent: number;
  }>;
  qualitySegments: AnalyticsSegment[];
  errorMessage: string | null;
};

const statusColors = new Map([
  ["идея/кп", "#f59e0b"],
  ["факт оплаты", "#16a34a"],
  ["уточнение тз", "#2563eb"],
  ["в разработке", "#7c3aed"],
  ["на паузе", "#64748b"],
  ["__none", "#94a3b8"],
]);

const clusterColors = new Map([
  ["сфера услуг", "#0891b2"],
  ["торговля", "#16a34a"],
  ["промышленность", "#7c3aed"],
  ["недвижимость", "#ea580c"],
  ["производство", "#4f46e5"],
  ["инфраструктура", "#0f766e"],
  ["социальный", "#e11d48"],
  ["скм", "#6d28d9"],
  ["транспорт", "#475569"],
  ["опк", "#1e3a8a"],
  ["__none", "#94a3b8"],
]);

export async function getPortfolioAnalyticsData(): Promise<PortfolioAnalyticsData> {
  const registryData = await getProjectRegistryData();
  const activeProjects = registryData.projects.filter(
    (project) => !project.is_archived,
  );
  const assignmentsResult = await getDirectorCsmAssignments();
  const flagshipProjects = activeProjects.filter((project) => project.is_flagship);

  return {
    activeProjects,
    totalProjects: registryData.projects.length,
    statusSegments: buildReferenceSegments({
      projects: activeProjects,
      references: registryData.statuses,
      missingLabel: "Без статуса",
      missingHref: "/projects?status=__none",
      getReference: (project) => project.status,
      getHref: (id) => `/projects?status=${id}`,
      getColor: (label, isMissing) =>
        getMappedColor(statusColors, isMissing ? "__none" : label),
    }),
    clusterSegments: buildReferenceSegments({
      projects: activeProjects,
      references: registryData.clusters,
      missingLabel: "Без кластера",
      missingHref: "/projects?cluster=__none",
      getReference: (project) => project.cluster,
      getHref: (id) => `/projects?cluster=${id}`,
      getColor: (label, isMissing) =>
        getMappedColor(clusterColors, isMissing ? "__none" : label),
    }),
    csmMatrix: buildCsmMatrix(activeProjects, registryData.csms),
    directorGroups: buildDirectorGroups(
      activeProjects,
      assignmentsResult.assignments,
    ),
    assignments: assignmentsResult.assignments,
    assignmentsErrorMessage: assignmentsResult.errorMessage,
    flagshipSplit: [
      {
        key: "flagship",
        label: "Флагманские",
        count: flagshipProjects.length,
        color: "#4f46e5",
        href: "/projects?flagship=true",
      },
      {
        key: "not_flagship",
        label: "Не флагманские",
        count: activeProjects.length - flagshipProjects.length,
        color: "#94a3b8",
        href: "/projects?flagship=false",
      },
    ].sort(sortSegments),
    flagshipStatusSegments: buildReferenceSegments({
      projects: flagshipProjects,
      references: registryData.flagshipStatuses,
      missingLabel: "Без статуса",
      missingHref: "/projects?flagship=true&flagship_status=__none",
      getReference: (project) => project.flagship_status,
      getHref: (id) => `/projects?flagship=true&flagship_status=${id}`,
      getColor: (label, isMissing) =>
        getMappedColor(statusColors, isMissing ? "__none" : label),
    }),
    flagshipReadiness: buildFlagshipReadiness(flagshipProjects),
    qualitySegments: buildQualitySegments(activeProjects),
    errorMessage: registryData.errorMessage,
  };
}

async function getDirectorCsmAssignments(): Promise<{
  assignments: DirectorCsmAssignment[];
  errorMessage: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("director_csm_assignments")
    .select(
      "id, external_id, director_id, director_name, industry_unit_id, industry_unit_name, csm_id, csm_name, is_active, comment, sort_order",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("director_name", { ascending: true })
    .order("csm_name", { ascending: true });

  if (error) {
    return {
      assignments: [],
      errorMessage:
        "Назначения директор-CSM-отрасль пока недоступны. После применения миграции аналитика использует эту таблицу автоматически.",
    };
  }

  return {
    assignments: (data ?? []) as DirectorCsmAssignment[],
    errorMessage: null,
  };
}

function buildReferenceSegments({
  projects,
  references,
  missingHref,
  missingLabel,
  getColor,
  getHref,
  getReference,
}: {
  projects: ProjectListItem[];
  references: ReferenceItem[];
  missingHref: string;
  missingLabel: string;
  getReference: (project: ProjectListItem) => ReferenceItem | null;
  getHref: (id: string) => string;
  getColor: (label: string, isMissing: boolean) => string;
}) {
  const segments = references.map((reference) => ({
    key: reference.id,
    label: reference.name,
    count: projects.filter((project) => getReference(project)?.id === reference.id)
      .length,
    color: getColor(reference.name, false),
    href: getHref(reference.id),
  }));

  segments.push({
    key: "__none",
    label: missingLabel,
    count: projects.filter((project) => !getReference(project)).length,
    color: getColor(missingLabel, true),
    href: missingHref,
  });

  return segments.sort(sortSegments);
}

function buildCsmMatrix(
  projects: ProjectListItem[],
  csms: PersonReference[],
): CsmMatrixGroup[] {
  const groups = new Map<string, CsmMatrixGroup>();

  for (const csm of csms) {
    groups.set(csm.id, {
      id: csm.id,
      name: csm.full_name,
      count: 0,
      projects: [],
    });
  }

  for (const project of projects) {
    const csmId = project.csm?.id ?? "__none";
    const csmName = project.csm?.full_name ?? "Без CSM";
    const group =
      groups.get(csmId) ??
      ({
        id: csmId,
        name: csmName,
        count: 0,
        projects: [],
      } satisfies CsmMatrixGroup);

    group.count += 1;
    group.projects.push(project);
    groups.set(csmId, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      projects: group.projects.sort((first, second) =>
        (first.client ?? first.external_id).localeCompare(
          second.client ?? second.external_id,
          "ru",
        ),
      ),
    }))
    .sort((first, second) => second.count - first.count);
}

function buildDirectorGroups(
  projects: ProjectListItem[],
  assignments: DirectorCsmAssignment[],
): DirectorAnalyticsGroup[] {
  const hasAssignments = assignments.length > 0;
  const directorKeys = dedupeDirectorKeys(
    hasAssignments
      ? assignments.map((assignment) => ({
        directorId: assignment.director_id ?? `name:${assignment.director_name}`,
        directorName: assignment.director_name,
        industryId:
          assignment.industry_unit_id ?? `name:${assignment.industry_unit_name}`,
        industryName: assignment.industry_unit_name,
        csmId: assignment.csm_id ?? `name:${assignment.csm_name}`,
        csmName: assignment.csm_name,
      }))
      : projects.map((project) => ({
        directorId: project.director?.id ?? "__none",
        directorName: project.director?.full_name ?? "Без директора",
        industryId: project.industry_unit?.id ?? "__none",
        industryName:
          project.industry_unit?.name ?? "Без отраслевого управления",
        csmId: project.csm?.id ?? "__none",
        csmName: project.csm?.full_name ?? "Без CSM",
      })),
  );
  const directors = new Map<string, DirectorAnalyticsGroup>();

  for (const key of directorKeys) {
    const matchingProjects = projects.filter((project) =>
      hasAssignments
        ? matchesAssignment(project, key)
        : (project.director?.id ?? "__none") === key.directorId &&
          (project.industry_unit?.id ?? "__none") === key.industryId &&
          (project.csm?.id ?? "__none") === key.csmId,
    );

    if (matchingProjects.length === 0 && hasAssignments) {
      continue;
    }

    const director =
      directors.get(key.directorId) ??
      ({
        id: key.directorId,
        name: key.directorName,
        totalProjects: 0,
        averageProjectsPerCsm: 0,
        industries: [],
        clusters: [],
        href: `/projects?director=${key.directorId}`,
      } satisfies DirectorAnalyticsGroup);
    const industry =
      director.industries.find((item) => item.id === key.industryId) ??
      addIndustryGroup(director, key.industryId, key.industryName);
    const matchingProjectsByCluster = groupProjectsByCluster(matchingProjects);

    industry.totalProjects += matchingProjects.length;
    director.totalProjects += matchingProjects.length;

    for (const clusterGroup of matchingProjectsByCluster) {
      const cluster =
        director.clusters.find((item) => item.id === clusterGroup.id) ??
        addClusterGroup(director, clusterGroup, key.directorId);
      const csm =
        cluster.csms.find((item) => item.id === key.csmId) ??
        addCsmGroup(cluster, key, director.id);

      csm.projectCount += clusterGroup.projects.length;
      cluster.totalProjects += clusterGroup.projects.length;
    }

    directors.set(key.directorId, director);
  }

  return Array.from(directors.values())
    .map((director) => {
      const uniqueCsmCount = new Set(
        director.clusters.flatMap((cluster) =>
          cluster.csms.map((csm) => csm.id),
        ),
      ).size;

      return {
        ...director,
        averageProjectsPerCsm: uniqueCsmCount
          ? director.totalProjects / uniqueCsmCount
          : 0,
        industries: director.industries
          .sort((first, second) => second.totalProjects - first.totalProjects),
        clusters: director.clusters
          .map((cluster) => ({
            ...cluster,
            csms: cluster.csms.sort(
              (first, second) => second.projectCount - first.projectCount,
            ),
          }))
          .sort((first, second) => second.totalProjects - first.totalProjects),
      };
    })
    .sort((first, second) => second.totalProjects - first.totalProjects);
}

function groupProjectsByCluster(projects: ProjectListItem[]) {
  const clusters = new Map<
    string,
    { id: string; name: string; projects: ProjectListItem[] }
  >();

  for (const project of projects) {
    const id = project.cluster?.id ?? "__none";
    const name = project.cluster?.name ?? "Без кластера";
    const cluster = clusters.get(id) ?? { id, name, projects: [] };

    cluster.projects.push(project);
    clusters.set(id, cluster);
  }

  return Array.from(clusters.values());
}

function dedupeDirectorKeys(
  keys: Array<{
    directorId: string;
    directorName: string;
    industryId: string;
    industryName: string;
    csmId: string;
    csmName: string;
  }>,
) {
  const uniqueKeys = new Map<string, (typeof keys)[number]>();

  for (const key of keys) {
    uniqueKeys.set(`${key.directorId}:${key.industryId}:${key.csmId}`, key);
  }

  return Array.from(uniqueKeys.values());
}

function matchesAssignment(
  project: ProjectListItem,
  assignment: {
    directorId: string;
    directorName: string;
    industryId: string;
    industryName: string;
    csmId: string;
    csmName: string;
  },
) {
  return (
    matchesIdOrName(project.director?.id, project.director?.full_name, assignment.directorId, assignment.directorName) &&
    matchesIdOrName(project.industry_unit?.id, project.industry_unit?.name, assignment.industryId, assignment.industryName) &&
    matchesIdOrName(project.csm?.id, project.csm?.full_name, assignment.csmId, assignment.csmName)
  );
}

function matchesIdOrName(
  projectId: string | undefined,
  projectName: string | undefined,
  assignmentId: string,
  assignmentName: string,
) {
  return assignmentId.startsWith("name:")
    ? normalizeName(projectName) === normalizeName(assignmentName)
    : projectId === assignmentId;
}

function addIndustryGroup(
  director: DirectorAnalyticsGroup,
  id: string,
  name: string,
) {
  const industry = {
    id,
    name,
    totalProjects: 0,
  };
  director.industries.push(industry);
  return industry;
}

function addClusterGroup(
  director: DirectorAnalyticsGroup,
  cluster: { id: string; name: string },
  directorId: string,
) {
  const clusterGroup = {
    id: cluster.id,
    name: cluster.name,
    totalProjects: 0,
    href: `/projects?director=${directorId}&cluster=${cluster.id}`,
    csms: [],
  };
  director.clusters.push(clusterGroup);
  return clusterGroup;
}

function addCsmGroup(
  cluster: DirectorAnalyticsGroup["clusters"][number],
  key: { csmId: string; csmName: string },
  directorId: string,
) {
  const csm = {
    id: key.csmId,
    name: key.csmName,
    projectCount: 0,
    href: `/projects?director=${directorId}&csm=${key.csmId}`,
  };
  cluster.csms.push(csm);
  return csm;
}

function buildFlagshipReadiness(projects: ProjectListItem[]) {
  const total = projects.length;
  const items = [
    {
      key: "description",
      label: "Описание загружено",
      count: projects.filter((project) => project.flagship_description_uploaded)
        .length,
    },
    {
      key: "passport",
      label: "Паспорт загружен",
      count: projects.filter((project) => project.flagship_passport_uploaded)
        .length,
    },
    {
      key: "innovation",
      label: "Инновационность пройдена",
      count: projects.filter((project) => project.flagship_innovation_level)
        .length,
    },
    {
      key: "prbr",
      label: "Загружен на ПРБР",
      count: projects.filter((project) => project.flagship_uploaded_to_prbr)
        .length,
    },
    {
      key: "ca",
      label: "Одобрен ЦА",
      count: projects.filter((project) => project.flagship_approved_by_ca)
        .length,
    },
  ];

  return items.map((item) => ({
    ...item,
    percent: getPercent(item.count, total),
  }));
}

function buildQualitySegments(projects: ProjectListItem[]): AnalyticsSegment[] {
  const buckets = [
    {
      key: "good",
      label: "Заполнено хорошо",
      color: "#16a34a",
      count: 0,
    },
    {
      key: "partial",
      label: "Заполнено частично",
      color: "#f59e0b",
      count: 0,
    },
    {
      key: "poor",
      label: "Много пустых полей",
      color: "#e11d48",
      count: 0,
    },
  ];

  for (const project of projects) {
    const filledCount = [
      project.client,
      project.project_name,
      project.essence,
      project.status_id,
      project.cluster_id,
      project.csm_id,
      project.director_id,
      project.next_step,
    ].filter((value) => Boolean(value?.trim())).length;

    // 7-8 of 8 key fields is good, 4-6 is partial, 0-3 needs attention.
    if (filledCount >= 7) {
      buckets[0].count += 1;
    } else if (filledCount >= 4) {
      buckets[1].count += 1;
    } else {
      buckets[2].count += 1;
    }
  }

  return buckets.sort(sortSegments);
}

export function getStatusColor(project: ProjectListItem) {
  return getMappedColor(statusColors, project.status?.name ?? "__none");
}

function getMappedColor(map: Map<string, string>, label: string) {
  return map.get(normalizeName(label)) ?? "#475569";
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase().replaceAll("ё", "е") ?? "";
}

function getPercent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function sortSegments(first: { count: number; label: string }, second: { count: number; label: string }) {
  if (second.count !== first.count) {
    return second.count - first.count;
  }

  return first.label.localeCompare(second.label, "ru");
}
