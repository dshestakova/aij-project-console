import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectQualityCategory } from "@/lib/project-registry/filters";
import {
  getChartColor,
  getIndustryUnitColorKey,
  getStatusChartColor,
} from "@/lib/project-registry/colors";
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
  industryUnits: Array<{
    id: string;
    name: string;
    totalProjects: number;
    csmCount: number;
    projectsPerCsm: number;
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
  industryUnitSegments: AnalyticsSegment[];
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
    color: string;
  }>;
  qualitySegments: AnalyticsSegment[];
  errorMessage: string | null;
};

export async function getPortfolioAnalyticsData(): Promise<PortfolioAnalyticsData> {
  const registryData = await getProjectRegistryData();
  const activeProjects = registryData.projects.filter(
    (project) => !project.is_archived,
  );
  const assignmentsResult = await getDirectorCsmAssignments();
  const flagshipProjects = activeProjects.filter((project) => project.is_flagship);

  return {
    activeProjects,
    totalProjects: activeProjects.length,
    statusSegments: buildReferenceSegments({
      projects: activeProjects,
      references: registryData.statuses,
      missingLabel: "Без статуса",
      missingHref: "/projects?status=__none",
      getReference: (project) => project.status,
      getHref: (id) => `/projects?status=${id}`,
      getColor: (reference) =>
        getStatusChartColor(reference?.name, reference?.color_key),
    }),
    industryUnitSegments: buildReferenceSegments({
      projects: activeProjects,
      references: registryData.industryUnits,
      missingLabel: "Без отраслевого управления",
      missingHref: "/projects?industry_unit=__none",
      getReference: (project) => project.industry_unit,
      getHref: (id) => `/projects?industry_unit=${id}`,
      getColor: (reference) =>
        getChartColor(
          getIndustryUnitColorKey(reference?.name, reference?.color_key),
        ),
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
        color: getChartColor("indigo"),
        href: "/projects?flagship=true",
      },
      {
        key: "not_flagship",
        label: "Не флагманские",
        count: activeProjects.length - flagshipProjects.length,
        color: getChartColor("teal"),
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
      getColor: (reference) =>
        getStatusChartColor(reference?.name, reference?.color_key),
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
  getColor: (reference: ReferenceItem | null) => string;
}) {
  const segments = references.map((reference) => ({
    key: reference.id,
    label: reference.name,
    count: projects.filter((project) => getReference(project)?.id === reference.id)
      .length,
    color: getColor(reference),
    href: getHref(reference.id),
  }));

  segments.push({
    key: "__none",
    label: missingLabel,
    count: projects.filter((project) => !getReference(project)).length,
    color: getColor(null),
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
      projects: group.projects.sort(compareCsmProjects),
    }))
    .sort((first, second) => second.count - first.count);
}

function compareCsmProjects(first: ProjectListItem, second: ProjectListItem) {
  const statusDifference =
    getCsmStatusOrder(first.status?.name) -
    getCsmStatusOrder(second.status?.name);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return getCsmProjectSortName(first).localeCompare(
    getCsmProjectSortName(second),
    "ru",
  );
}

function getCsmStatusOrder(statusName: string | null | undefined) {
  const normalizedStatus = normalizeName(statusName);
  const orderByStatus: Record<string, number> = {
    "внедрен в прод": 0,
    "внедрен в промышленную эксплуатацию": 0,
    "в разработке": 1,
    "уточнение тз": 2,
    "идея/кп": 3,
    опасно: 4,
    пауза: 5,
    "на паузе": 5,
  };

  return orderByStatus[normalizedStatus] ?? 6;
}

function getCsmProjectSortName(project: ProjectListItem) {
  return project.client?.trim() || project.project_name?.trim() || project.external_id;
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
        industryUnits: [],
        href: `/projects?director=${key.directorId}`,
      } satisfies DirectorAnalyticsGroup);
    const industryUnit =
      director.industryUnits.find((item) => item.id === key.industryId) ??
      addIndustryUnitGroup(director, key.industryId, key.industryName);

    industryUnit.totalProjects += matchingProjects.length;
    director.totalProjects += matchingProjects.length;

    const csm =
      industryUnit.csms.find((item) => item.id === key.csmId) ??
      addCsmGroup(industryUnit, key, director.id);

    csm.projectCount += matchingProjects.length;

    directors.set(key.directorId, director);
  }

  return Array.from(directors.values())
    .map((director) => {
      const uniqueCsmCount = new Set(
        director.industryUnits.flatMap((industryUnit) =>
          industryUnit.csms.map((csm) => csm.id),
        ),
      ).size;

      return {
        ...director,
        averageProjectsPerCsm: uniqueCsmCount
          ? director.totalProjects / uniqueCsmCount
          : 0,
        industryUnits: director.industryUnits
          .map((industryUnit) => ({
            ...industryUnit,
            csmCount: industryUnit.csms.length,
            projectsPerCsm: industryUnit.csms.length
              ? industryUnit.totalProjects / industryUnit.csms.length
              : 0,
            csms: industryUnit.csms.sort(
              (first, second) => second.projectCount - first.projectCount,
            ),
          }))
          .sort((first, second) => second.totalProjects - first.totalProjects),
      };
    })
    .sort((first, second) => second.totalProjects - first.totalProjects);
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

function addIndustryUnitGroup(
  director: DirectorAnalyticsGroup,
  id: string,
  name: string,
) {
  const industryUnit = {
    id,
    name,
    totalProjects: 0,
    csmCount: 0,
    projectsPerCsm: 0,
    href: `/projects?director=${director.id}&industry_unit=${id}`,
    csms: [],
  };
  director.industryUnits.push(industryUnit);
  return industryUnit;
}

function addCsmGroup(
  industryUnit: DirectorAnalyticsGroup["industryUnits"][number],
  key: { csmId: string; csmName: string },
  directorId: string,
) {
  const csm = {
    id: key.csmId,
    name: key.csmName,
    projectCount: 0,
    href: `/projects?director=${directorId}&csm=${key.csmId}`,
  };
  industryUnit.csms.push(csm);
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
      color: getChartColor("blue"),
    },
    {
      key: "passport",
      label: "Паспорт загружен",
      count: projects.filter((project) => project.flagship_passport_uploaded)
        .length,
      color: getChartColor("indigo"),
    },
    {
      key: "innovation",
      label: "Инновационность пройдена",
      count: projects.filter((project) => project.flagship_innovation_level)
        .length,
      color: getChartColor("violet"),
    },
    {
      key: "prbr",
      label: "Загружен на ПРБР",
      count: projects.filter((project) => project.flagship_uploaded_to_prbr)
        .length,
      color: getChartColor("orange"),
    },
    {
      key: "ca",
      label: "Одобрен ЦА",
      count: projects.filter((project) => project.flagship_approved_by_ca)
        .length,
      color: getChartColor("green"),
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
      color: getChartColor("green"),
      count: 0,
      href: "/projects?quality=good",
    },
    {
      key: "partial",
      label: "Заполнено частично",
      color: getChartColor("amber"),
      count: 0,
      href: "/projects?quality=partial",
    },
    {
      key: "poor",
      label: "Много пустых полей",
      color: getChartColor("rose"),
      count: 0,
      href: "/projects?quality=poor",
    },
  ];

  for (const project of projects) {
    const category = getProjectQualityCategory(project);
    const bucket = buckets.find((item) => item.key === category);

    if (bucket) {
      bucket.count += 1;
    }
  }

  return buckets.sort(sortSegments);
}

export function getStatusColor(project: ProjectListItem) {
  return getStatusChartColor(project.status?.name, project.status?.color_key);
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
