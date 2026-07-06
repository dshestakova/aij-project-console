import Link from "next/link";
import { notFound } from "next/navigation";

import { UserHeader } from "@/components/auth/user-header";
import { Badge } from "@/components/projects/badge";
import { formatDateTime, getDisplayValue } from "@/lib/project-registry/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectDetail } from "@/lib/supabase/project-registry";

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
  const { errorMessage, project } = await getProjectDetail(id);

  if (!project && !errorMessage) {
    notFound();
  }

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
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-500">
                      {project.external_id}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {getDisplayValue(project.project_name)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {getDisplayValue(project.client)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Обновлено {formatDateTime(project.updated_at)}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {project.cluster ? (
                    <Badge colorKey={project.cluster.color_key}>
                      {project.cluster.name}
                    </Badge>
                  ) : (
                    <Badge>Кластер не указан</Badge>
                  )}
                  {project.status ? (
                    <Badge colorKey={project.status.color_key}>
                      {project.status.name}
                    </Badge>
                  ) : (
                    <Badge>Статус не указан</Badge>
                  )}
                  {project.is_flagship ? (
                    <Badge colorKey="indigo">Флагман</Badge>
                  ) : null}
                  {project.flagship_status ? (
                    <Badge colorKey={project.flagship_status.color_key}>
                      {project.flagship_status.name}
                    </Badge>
                  ) : null}
                  {project.is_archived ? <Badge colorKey="gray">Архив</Badge> : null}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="flex flex-col gap-4">
                  <DetailBlock label="Суть проекта" value={project.essence} />
                  <DetailBlock label="Прогресс" value={project.progress} />
                  <DetailBlock label="Следующий шаг" value={project.next_step} />
                  <DetailBlock label="Комментарий" value={project.comment} />
                </div>

                <aside className="flex flex-col gap-4">
                  <InfoCard
                    rows={[
                      ["Финансирование", project.funding],
                      ["Статус финансирования", project.funding_status],
                      ["CSM", project.csm?.full_name],
                      ["Директор", project.director?.full_name],
                      ["Отраслевое управление", project.industry_unit?.name],
                    ]}
                    title="Ответственные и финансы"
                  />
                </aside>
              </section>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase text-slate-400">{label}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {getDisplayValue(value)}
      </p>
    </section>
  );
}

function InfoCard({
  rows,
  title,
}: {
  rows: Array<[string, string | null | undefined]>;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase text-slate-400">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-slate-700">
              {getDisplayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
