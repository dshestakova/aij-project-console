import Link from "next/link";

import { UserHeader } from "@/components/auth/user-header";
import { Badge } from "@/components/projects/badge";
import { ProjectCard } from "@/components/projects/project-card";
import { getBadgeTone } from "@/lib/project-registry/colors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import type { ProjectListItem, ReferenceItem } from "@/types/project-registry";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { clusters, errorMessage, projects, statuses } =
    await getProjectRegistryData();

  const activeProjects = projects.filter((project) => !project.is_archived);
  const archivedProjects = projects.filter((project) => project.is_archived);
  const flagshipProjects = projects.filter((project) => project.is_flagship);

  const summaryCards = [
    {
      label: "Всего проектов",
      value: projects.length,
      detail: "Все записи в Supabase",
    },
    {
      label: "Активные",
      value: activeProjects.length,
      detail: "Архив скрыт по умолчанию",
    },
    {
      label: "Флагманские",
      value: flagshipProjects.length,
      detail: "Проекты с флагманским признаком",
    },
    {
      label: "Архив",
      value: archivedProjects.length,
      detail: "Скрыты из основного списка",
    },
  ];

  const statusDistribution = getDistribution(statuses, projects, "status");
  const clusterDistribution = getDistribution(clusters, projects, "cluster");

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/dashboard"
          email={user?.email ?? "Пользователь"}
        />

        <section className="flex min-w-0 flex-col gap-6 py-6">
          {errorMessage ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {errorMessage}
            </section>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={card.label}
              >
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DistributionPanel
              emptyLabel="Статусы готовы, проекты пока не импортированы."
              items={statusDistribution}
              title="Распределение по статусам"
            />
            <DistributionPanel
              emptyLabel="Кластеры готовы, проекты пока не импортированы."
              items={clusterDistribution}
              title="Распределение по кластерам"
            />
          </div>

          {projects.length === 0 ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-semibold text-slate-950">
                Проекты еще не импортированы
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                База данных и справочники готовы. После импорта здесь появятся
                метрики, распределения и карточки проектов.
              </p>
              <Link
                className="mt-5 inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm"
                href="/projects"
              >
                Открыть реестр
              </Link>
            </section>
          ) : (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Последние обновления
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Показаны последние активные проекты по времени обновления.
                  </p>
                </div>
                <Link
                  className="h-10 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  href="/projects"
                >
                  Все проекты
                </Link>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {activeProjects.slice(0, 4).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function getDistribution(
  references: ReferenceItem[],
  projects: ProjectListItem[],
  key: "cluster" | "status",
) {
  return references.map((reference) => ({
    ...reference,
    count: projects.filter((project) => project[key]?.id === reference.id)
      .length,
  }));
}

function DistributionPanel({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: Array<ReferenceItem & { count: number }>;
  title: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total === 0 ? emptyLabel : "Считается по всем проектам в базе."}
          </p>
        </div>
        <Badge colorKey="slate">{total}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            className={`inline-flex min-h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium ${getBadgeTone(
              item.color_key,
            )}`}
            key={item.id}
          >
            <span>{item.name}</span>
            <span>{item.count}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
