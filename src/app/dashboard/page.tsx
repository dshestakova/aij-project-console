import Link from "next/link";

import { UserHeader } from "@/components/auth/user-header";
import { Badge } from "@/components/projects/badge";
import { ProjectCard } from "@/components/projects/project-card";
import { getBadgeTone, getChartTone } from "@/lib/project-registry/colors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import type {
  ColorKey,
  ProjectListItem,
  ReferenceItem,
} from "@/types/project-registry";

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
  const flagshipProjects = activeProjects.filter((project) => project.is_flagship);

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
      detail: "Активные проекты с флагманским признаком",
    },
    {
      label: "Архив",
      value: archivedProjects.length,
      detail: "Скрыты из основного списка",
    },
  ];

  const statusDistribution = getStatusDistribution(statuses, activeProjects);
  const clusterDistribution = getClusterDistribution(clusters, activeProjects);

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
              description="Активные проекты по текущим статусам. Пустые значения показаны отдельно."
              emptyLabel="Активных проектов пока нет."
              items={statusDistribution}
              totalLabel="Активных"
              title="Распределение по статусам"
            />
            <DistributionPanel
              description="Активные проекты по кластерам. Архив учитывается отдельно в верхних карточках."
              emptyLabel="Активных проектов пока нет."
              items={clusterDistribution}
              totalLabel="Активных"
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

type DistributionItem = {
  id: string;
  name: string;
  color_key?: ColorKey | null;
  count: number;
};

const canonicalStatuses: Array<Pick<DistributionItem, "name" | "color_key">> = [
  { name: "идея/КП", color_key: "amber" },
  { name: "факт оплаты", color_key: "green" },
  { name: "уточнение ТЗ", color_key: "blue" },
  { name: "в разработке", color_key: "violet" },
  { name: "на паузе", color_key: "gray" },
];

function getStatusDistribution(
  references: ReferenceItem[],
  projects: ProjectListItem[],
): DistributionItem[] {
  const items = canonicalStatuses.map((status) => {
    const reference = references.find(
      (item) => item.name.toLowerCase() === status.name.toLowerCase(),
    );

    return {
      id: reference?.id ?? `status-${status.name}`,
      name: reference?.name ?? status.name,
      color_key: reference?.color_key ?? status.color_key,
      count: projects.filter(
        (project) =>
          project.status?.name.toLowerCase() === status.name.toLowerCase(),
      ).length,
    };
  });

  const canonicalNames = new Set(
    canonicalStatuses.map((status) => status.name.toLowerCase()),
  );
  const extraStatuses = references
    .filter(
      (reference) =>
        !canonicalNames.has(reference.name.toLowerCase()) &&
        projects.some((project) => project.status?.id === reference.id),
    )
    .map((reference) => ({
      ...reference,
      count: projects.filter((project) => project.status?.id === reference.id)
        .length,
    }));

  const missingCount = projects.filter((project) => !project.status).length;

  return [
    ...items,
    ...extraStatuses,
    {
      id: "status-missing",
      name: "Без статуса",
      color_key: "gray",
      count: missingCount,
    },
  ];
}

function getClusterDistribution(
  references: ReferenceItem[],
  projects: ProjectListItem[],
): DistributionItem[] {
  const items = references
    .map((reference) => ({
      ...reference,
      count: projects.filter((project) => project.cluster?.id === reference.id)
        .length,
    }))
    .filter((item) => item.count > 0);
  const knownClusterIds = new Set(references.map((reference) => reference.id));
  const unknownClusterItems = projects
    .filter(
      (project) =>
        project.cluster && !knownClusterIds.has(project.cluster.id),
    )
    .reduce<DistributionItem[]>((items, project) => {
      const cluster = project.cluster;

      if (!cluster) {
        return items;
      }

      const existing = items.find((item) => item.id === cluster.id);

      if (existing) {
        existing.count += 1;
      } else {
        items.push({ ...cluster, count: 1 });
      }

      return items;
    }, []);
  const missingCount = projects.filter((project) => !project.cluster).length;

  return [
    ...items,
    ...unknownClusterItems,
    {
      id: "cluster-missing",
      name: "Без кластера",
      color_key: "gray",
      count: missingCount,
    },
  ];
}

function DistributionPanel({
  description,
  emptyLabel,
  items,
  title,
  totalLabel,
}: {
  description: string;
  emptyLabel: string;
  items: DistributionItem[];
  title: string;
  totalLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const visibleItems = items.filter((item) => item.count > 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total === 0 ? emptyLabel : description}
          </p>
        </div>
        <Badge colorKey="slate">
          {totalLabel}: {total}
        </Badge>
      </div>

      <div
        aria-label={`${title}: всего ${total}`}
        className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100"
        role="img"
      >
        {total === 0 ? (
          <span className="h-full w-full bg-slate-200" />
        ) : (
          visibleItems.map((item) => (
            <span
              className={`h-full min-w-1 ${getChartTone(item.color_key)}`}
              key={item.id}
              style={{ width: `${(item.count / total) * 100}%` }}
              title={`${item.name}: ${item.count}`}
            />
          ))
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            className="flex min-h-9 items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 text-sm"
            key={item.id}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${getChartTone(
                  item.color_key,
                )}`}
              />
              <span className="truncate text-slate-700">{item.name}</span>
            </span>
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${getBadgeTone(
                item.color_key,
              )}`}
            >
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
