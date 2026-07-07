import { UserHeader } from "@/components/auth/user-header";
import { ProjectsRegistry } from "@/components/projects/projects-registry";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import type { ReferenceItem } from "@/types/project-registry";

type ProjectsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { clusters, errorMessage, projects, statuses } =
    await getProjectRegistryData();

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader activePath="/projects" email={user?.email ?? "Пользователь"} />

        <section className="flex flex-col gap-5 py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                Проекты
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Read-only реестр с поиском, фильтрами и карточками. Архив
                скрыт по умолчанию.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
              Всего в базе:{" "}
              <span className="font-semibold text-slate-950">
                {projects.length}
              </span>
            </div>
          </div>

          {errorMessage ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {errorMessage}
            </section>
          ) : null}

          <ProjectsRegistry
            clusters={clusters}
            initialFilters={{
              archiveMode: resolveArchiveFilter(
                params.archived ?? params.archive,
              ),
              clusterId: resolveReferenceFilter(params.cluster, clusters),
              flagship: resolveFlagshipFilter(params.flagship),
              statusId: resolveReferenceFilter(params.status, statuses),
            }}
            projects={projects}
            statuses={statuses}
          />
        </section>
      </div>
    </main>
  );
}

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveReferenceFilter(
  value: string | string[] | undefined,
  references: ReferenceItem[],
) {
  const rawValue = getFirstSearchParam(value)?.trim();

  if (!rawValue) {
    return "all";
  }

  if (rawValue === "__none") {
    return rawValue;
  }

  const normalizedValue = rawValue.toLowerCase();
  const matchedReference = references.find(
    (reference) =>
      reference.id === rawValue ||
      reference.name.trim().toLowerCase() === normalizedValue,
  );

  return matchedReference?.id ?? "all";
}

function resolveFlagshipFilter(value: string | string[] | undefined) {
  const rawValue = getFirstSearchParam(value)?.trim().toLowerCase();

  return rawValue === "yes" || rawValue === "no" ? rawValue : "all";
}

function resolveArchiveFilter(value: string | string[] | undefined) {
  const rawValue = getFirstSearchParam(value)?.trim().toLowerCase();

  return rawValue === "all" || rawValue === "archived" ? rawValue : "active";
}
