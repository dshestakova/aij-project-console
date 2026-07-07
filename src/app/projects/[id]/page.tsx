import Link from "next/link";

import { UserHeader } from "@/components/auth/user-header";
import { ProjectDetailEditor } from "@/components/projects/project-detail-editor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectDetailPageData } from "@/lib/supabase/project-registry";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    changes,
    currentPassport,
    currentProfile,
    errorMessage,
    project,
    references,
  } = await getProjectDetailPageData(id);
  const canEdit =
    currentProfile?.role === "admin" || currentProfile?.role === "editor";

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader activePath="/projects" email={user?.email ?? "Пользователь"} />

        <section className="flex flex-col gap-5 py-6">
          <Link
            className="w-fit text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href="/projects"
          >
            Назад к проектам
          </Link>

          {errorMessage ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {errorMessage}
            </section>
          ) : null}

          {project ? (
            <ProjectDetailEditor
              canEdit={canEdit}
              changes={changes}
              currentPassport={currentPassport}
              project={project}
              references={references}
            />
          ) : errorMessage ? null : (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-semibold text-slate-950">
                Проект не найден
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Не удалось найти проект с таким идентификатором. Возможно, он
                был удален, перемещен в другой реестр или ссылка устарела.
              </p>
              <Link
                className="mt-5 inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                href="/projects"
              >
                Вернуться к проектам
              </Link>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
