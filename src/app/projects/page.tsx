import { UserHeader } from "@/components/auth/user-header";
import { ProjectsRegistry } from "@/components/projects/projects-registry";
import { isArchivedProject } from "@/lib/project-registry/filters";
import type {
  ArchiveMode,
  BooleanFilter,
  QualityFilter,
} from "@/lib/project-registry/filters";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import { getCurrentProfile } from "@/lib/supabase/profiles";

export const dynamic = "force-dynamic";

type ProjectsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    csms,
    directors,
    errorMessage,
    flagshipStatuses,
    industryUnits,
    projects,
    statuses,
  } = await getProjectRegistryData();
  const currentProfile = await getCurrentProfile();
  const initialFilters = getInitialFilters(resolvedSearchParams);
  const activeProjectCount = projects.filter(
    (project) => !isArchivedProject(project),
  ).length;
  const canCreateProject =
    currentProfile?.role === "admin" || currentProfile?.role === "editor";

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/projects"
          email={user?.email ?? "Пользователь"}
          role={currentProfile?.role}
        />

        <section className="flex flex-col gap-5 py-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-slate-950">
                Проекты
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Read-only реестр с поиском, фильтрами и карточками. Архив
                скрыт по умолчанию.
              </p>
            </div>
            <div className="self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-auto">
              Активных:{" "}
              <span className="font-semibold text-slate-950">
                {activeProjectCount}
              </span>
            </div>
          </div>

          {errorMessage ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {errorMessage}
            </section>
          ) : null}

          <ProjectsRegistry
            canCreateProject={canCreateProject}
            csms={csms}
            directors={directors}
            flagshipStatuses={flagshipStatuses}
            industryUnits={industryUnits}
            initialFilters={initialFilters}
            key={getFiltersKey(initialFilters)}
            projects={projects}
            statuses={statuses}
          />
        </section>
      </div>
    </main>
  );
}

function getFiltersKey(filters: ReturnType<typeof getInitialFilters>) {
  return [
    filters.statusId,
    filters.csmId,
    filters.directorId,
    filters.industryUnitId,
    filters.flagshipStatusId,
    filters.flagship,
    filters.social,
    filters.quality,
    filters.archiveMode,
    filters.query,
  ].join("|");
}

function getInitialFilters(
  searchParams: Record<string, string | string[] | undefined>,
) {
  return {
    statusId: getParam(searchParams.status),
    csmId: getParam(searchParams.csm),
    directorId: getParam(searchParams.director),
    industryUnitId: getParam(searchParams.industry_unit ?? searchParams.cluster),
    flagshipStatusId: getParam(searchParams.flagship_status),
    flagship: getBooleanParam(searchParams.flagship),
    social: getBooleanParam(searchParams.social),
    quality: getQualityParam(searchParams.quality),
    archiveMode: getArchiveParam(searchParams.archive ?? searchParams.archived),
    query: getTextParam(searchParams.search ?? searchParams.query),
  };
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "all" : value ?? "all";
}

function getTextParam(value: string | string[] | undefined) {
  const param = Array.isArray(value) ? value[0] ?? "" : value ?? "";

  return param.trim();
}

function getBooleanParam(value: string | string[] | undefined): BooleanFilter {
  const param = getParam(value);

  if (param === "true" || param === "yes") {
    return "yes";
  }

  if (param === "false" || param === "no") {
    return "no";
  }

  return "all";
}

function getQualityParam(value: string | string[] | undefined): QualityFilter {
  const param = getParam(value);

  if (param === "good" || param === "partial" || param === "poor") {
    return param;
  }

  return "all";
}

function getArchiveParam(value: string | string[] | undefined): ArchiveMode {
  const param = getParam(value);

  if (param === "all" || param === "archived" || param === "active") {
    return param;
  }

  if (param === "true") {
    return "archived";
  }

  return "active";
}
