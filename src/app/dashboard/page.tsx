import Link from "next/link";

import { UserHeader } from "@/components/auth/user-header";
import { Badge } from "@/components/projects/badge";
import { ProjectCard } from "@/components/projects/project-card";
import {
  getBadgeTone,
  getChartTone,
  getIndustryUnitColorKey,
} from "@/lib/project-registry/colors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectRegistryData } from "@/lib/supabase/project-registry";
import { getCurrentProfile } from "@/lib/supabase/profiles";
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

  const { errorMessage, industryUnits, projects, statuses } =
    await getProjectRegistryData();
  const currentProfile = await getCurrentProfile();

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
  const industryUnitDistribution = getIndustryUnitDistribution(
    industryUnits,
    activeProjects,
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/dashboard"
          email={user?.email ?? "Пользователь"}
          role={currentProfile?.role}
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
              description="Активные проекты по отраслевым управлениям. Архив учитывается отдельно в верхних карточках."
              emptyLabel="Активных проектов пока нет."
              items={industryUnitDistribution}
              totalLabel="Активных"
              title="Распределение по отраслевым управлениям"
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
  href?: string;
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
    const matchingProjects = projects.filter(
      (project) =>
        project.status?.name.toLowerCase() === status.name.toLowerCase(),
    );
    const id = reference?.id ?? matchingProjects[0]?.status?.id;

    return {
      id: id ?? `status-${status.name}`,
      name: reference?.name ?? status.name,
      color_key: status.color_key,
      count: matchingProjects.length,
      href: id ? `/projects?status=${id}` : undefined,
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
      href: `/projects?status=${reference.id}`,
    }));

  const missingCount = projects.filter((project) => !project.status).length;

  return sortDistributionItems([
    ...items,
    ...extraStatuses,
    {
      id: "status-missing",
      name: "Без статуса",
      color_key: "gray",
      count: missingCount,
      href: "/projects?status=__none",
    },
  ]);
}

function getIndustryUnitDistribution(
  references: ReferenceItem[],
  projects: ProjectListItem[],
): DistributionItem[] {
  const items = references
    .map((reference) => ({
      ...reference,
      color_key: getIndustryUnitColorKey(reference.name, reference.color_key),
      count: projects.filter(
        (project) => project.industry_unit?.id === reference.id,
      ).length,
      href: `/projects?industry_unit=${reference.id}`,
    }))
    .filter((item) => item.count > 0);
  const knownIndustryUnitIds = new Set(
    references.map((reference) => reference.id),
  );
  const unknownIndustryUnitItems = projects
    .filter(
      (project) =>
        project.industry_unit &&
        !knownIndustryUnitIds.has(project.industry_unit.id),
    )
    .reduce<DistributionItem[]>((items, project) => {
      const industryUnit = project.industry_unit;

      if (!industryUnit) {
        return items;
      }

      const existing = items.find((item) => item.id === industryUnit.id);

      if (existing) {
        existing.count += 1;
      } else {
        items.push({
          ...industryUnit,
          color_key: getIndustryUnitColorKey(
            industryUnit.name,
            industryUnit.color_key,
          ),
          count: 1,
          href: `/projects?industry_unit=${industryUnit.id}`,
        });
      }

      return items;
    }, []);
  const missingCount = projects.filter((project) => !project.industry_unit)
    .length;

  return sortDistributionItems([
    ...items,
    ...unknownIndustryUnitItems,
    {
      id: "industry-unit-missing",
      name: "Без отраслевого управления",
      color_key: "gray",
      count: missingCount,
      href: "/projects?industry_unit=__none",
    },
  ]);
}

function sortDistributionItems(items: DistributionItem[]) {
  return [...items].sort((first, second) => {
    if (second.count !== first.count) {
      return second.count - first.count;
    }

    return first.name.localeCompare(second.name, "ru");
  });
}

function getProjectCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} проектов`;
  }

  if (lastDigit === 1) {
    return `${count} проект`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} проекта`;
  }

  return `${count} проектов`;
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
            <DistributionBarSegment
              item={item}
              key={item.id}
              total={total}
            />
          ))
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <DistributionCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function DistributionBarSegment({
  item,
  total,
}: {
  item: DistributionItem;
  total: number;
}) {
  const title = `${item.name} — ${getProjectCountLabel(item.count)}`;
  const className = `h-full min-w-1 ${getChartTone(item.color_key)}`;
  const style = { width: `${(item.count / total) * 100}%` };

  return item.href ? (
    <Link
      aria-label={title}
      className={`${className} cursor-pointer`}
      href={item.href}
      style={style}
      title={title}
    />
  ) : (
    <span
      aria-label={title}
      className={className}
      style={style}
      title={title}
    />
  );
}

function DistributionCard({ item }: { item: DistributionItem }) {
  const content = (
    <>
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
    </>
  );
  const baseClassName =
    "flex min-h-9 items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 text-sm";
  const title = `${item.name} — ${getProjectCountLabel(item.count)}`;

  return item.href ? (
    <Link
      className={`${baseClassName} cursor-pointer transition hover:border-slate-200 hover:bg-white`}
      href={item.href}
      title={title}
    >
      {content}
    </Link>
  ) : (
    <div className={baseClassName} title={title}>
      {content}
    </div>
  );
}
