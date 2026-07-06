import { UserHeader } from "@/components/auth/user-header";
import { ProjectsRegistry } from "@/components/projects/projects-registry";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectRegistryData } from "@/lib/supabase/project-registry";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
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
            projects={projects}
            statuses={statuses}
          />
        </section>
      </div>
    </main>
  );
}
