"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DownloadablePanel } from "@/components/analytics/downloadable-panel";
import type {
  AnalyticsSegment,
  PortfolioAnalyticsData,
} from "@/lib/analytics/portfolio";
import { getStatusChartColor } from "@/lib/project-registry/colors";
import type { ProjectListItem } from "@/types/project-registry";

type PortfolioAnalyticsProps = {
  data: PortfolioAnalyticsData;
};

export function PortfolioAnalytics({ data }: PortfolioAnalyticsProps) {
  const totalActiveProjects = data.activeProjects.length;
  const flagshipTotal = data.flagshipSplit.find(
    (item) => item.key === "flagship",
  )?.count ?? 0;

  return (
    <section className="flex flex-col gap-6">
      {data.errorMessage ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {data.errorMessage}
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Активные проекты"
          value={totalActiveProjects}
          detail="Архив не учитывается в аналитике по умолчанию"
        />
        <SummaryCard
          label="Флагманские"
          value={flagshipTotal}
          detail={`${getPercent(flagshipTotal, totalActiveProjects)}% активного портфеля`}
        />
        <SummaryCard
          label="В аналитике"
          value={data.totalProjects}
          detail="Только активные проекты"
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <SegmentPanel
          description="Активные проекты по текущим статусам, включая проекты без статуса."
          segments={data.statusSegments}
          title="Проекты по статусам"
          total={totalActiveProjects}
        />
        <SegmentPanel
          description="Активные проекты по отраслевым управлениям. Управления окрашены разными цветами."
          segments={data.industryUnitSegments}
          title="Проекты по отраслевым управлениям"
          total={totalActiveProjects}
        />
      </div>

      <CsmMatrix projects={data.csmMatrix} statusSegments={data.statusSegments} />

      <DirectorAnalytics
        assignmentsCount={data.assignments.length}
        assignmentsErrorMessage={data.assignmentsErrorMessage}
        directors={data.directorGroups}
      />

      <div className="grid gap-5 2xl:grid-cols-2">
        <FlagshipAnalytics
          readiness={data.flagshipReadiness}
          split={data.flagshipSplit}
          statusSegments={data.flagshipStatusSegments}
          totalFlagship={flagshipTotal}
        />
        <DataQualityPanel
          segments={data.qualitySegments}
          total={totalActiveProjects}
        />
      </div>
    </section>
  );
}

function SummaryCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function SegmentPanel({
  description,
  segments,
  title,
  total,
}: {
  description: string;
  segments: AnalyticsSegment[];
  title: string;
  total: number;
}) {
  return (
    <DownloadablePanel fileName={slugify(title)}>
      <PanelHeader description={description} title={title} />
      <SegmentedBar segments={segments} total={total} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {segments.map((segment) => (
          <SegmentCard key={segment.key} segment={segment} total={total} />
        ))}
      </div>
    </DownloadablePanel>
  );
}

function SegmentedBar({
  segments,
  total,
}: {
  segments: AnalyticsSegment[];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
        Нет активных проектов для расчета.
      </div>
    );
  }

  return (
    <div className="mt-4 flex h-9 overflow-hidden rounded-md bg-slate-100">
      {segments
        .filter((segment) => segment.count > 0)
        .map((segment) => {
          const width = `${(segment.count / total) * 100}%`;
          const title = `${segment.label} — ${segment.count} проектов`;
          const style = { width, backgroundColor: segment.color };

          return segment.href ? (
            <Link
              aria-label={title}
              href={segment.href}
              key={segment.key}
              style={style}
              title={title}
            />
          ) : (
            <span key={segment.key} style={style} title={title} />
          );
        })}
    </div>
  );
}

function SegmentCard({
  segment,
  total,
}: {
  segment: AnalyticsSegment;
  total: number;
}) {
  const content = (
    <>
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: segment.color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-800">
          {segment.label}
        </span>
        <span className="text-xs text-slate-500">
          {segment.count} проектов · {getPercent(segment.count, total)}%
        </span>
      </span>
    </>
  );
  const baseClassName =
    "flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm";
  const linkClassName = `${baseClassName} cursor-pointer transition hover:border-slate-300 hover:bg-white`;
  const title = `${segment.label} — ${segment.count} проектов`;

  return segment.href ? (
    <Link className={linkClassName} href={segment.href} title={title}>
      {content}
    </Link>
  ) : (
    <div className={baseClassName} title={title}>
      {content}
    </div>
  );
}

function CsmMatrix({
  projects,
  statusSegments,
}: {
  projects: PortfolioAnalyticsData["csmMatrix"];
  statusSegments: AnalyticsSegment[];
}) {
  const [selectedIndustryUnitIds, setSelectedIndustryUnitIds] = useState<
    string[]
  >([]);
  const industryUnitOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const group of projects) {
      for (const project of group.projects) {
        options.set(
          project.industry_unit_id ?? "__none",
          project.industry_unit?.name ?? "Без отраслевого управления",
        );
      }
    }

    return Array.from(options, ([id, name]) => ({ id, name })).sort(
      (first, second) => first.name.localeCompare(second.name, "ru"),
    );
  }, [projects]);
  const selectedIndustryUnitIdSet = useMemo(
    () => new Set(selectedIndustryUnitIds),
    [selectedIndustryUnitIds],
  );
  const filteredGroups = useMemo(
    () =>
      projects
        .map((group) => {
          const filteredProjects =
            selectedIndustryUnitIdSet.size === 0
              ? group.projects
              : group.projects.filter((project) =>
                  selectedIndustryUnitIdSet.has(
                    project.industry_unit_id ?? "__none",
                  ),
                );

          return {
            ...group,
            count: filteredProjects.length,
            projects: filteredProjects,
          };
        })
        .sort((first, second) => second.count - first.count),
    [projects, selectedIndustryUnitIdSet],
  );
  const selectedIndustryUnitNames = industryUnitOptions
    .filter((option) => selectedIndustryUnitIdSet.has(option.id))
    .map((option) => option.name);
  const filterContext = selectedIndustryUnitNames.length
    ? selectedIndustryUnitNames.join(", ")
    : "все";
  const hasVisibleProjects = filteredGroups.some((group) => group.count > 0);

  function toggleIndustryUnit(id: string) {
    setSelectedIndustryUnitIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <DownloadablePanel fileName="csm-matrix">
      <PanelHeader
        description="Компактная матрица по CSM: строка CSM слева, справа горизонтальные клиентские проекты со статусной заливкой."
        title="CSM-матрица"
      />
      <div className="mt-4" data-export-ignore="true">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Отраслевые управления
        </p>
        <details className="relative max-w-xl rounded-md border border-slate-200 bg-white text-sm text-slate-700">
          <summary className="cursor-pointer list-none px-3 py-2.5 font-medium">
            {selectedIndustryUnitNames.length > 0
              ? `Выбрано: ${selectedIndustryUnitNames.join(", ")}`
              : "Все отраслевые управления"}
          </summary>
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
            <button
              className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100 disabled:text-slate-400"
              disabled={selectedIndustryUnitIds.length === 0}
              onClick={() => setSelectedIndustryUnitIds([])}
              type="button"
            >
              Все / сбросить
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              {industryUnitOptions.map((option) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-slate-50 px-3 py-2"
                  key={option.id}
                >
                  <input
                    checked={selectedIndustryUnitIdSet.has(option.id)}
                    className="h-4 w-4 accent-slate-900"
                    onChange={() => toggleIndustryUnit(option.id)}
                    type="checkbox"
                  />
                  <span>{option.name}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">
        Отраслевые управления: {filterContext}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {statusSegments.map((item) => (
          <span
            className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
            key={item.label}
          >
            <span
              className="h-3.5 w-3.5 rounded-sm border border-slate-200"
              style={{ backgroundColor: getPastelColor(item.color) }}
            />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          <span className="h-3.5 w-5 rounded-sm border-2 border-black bg-white" />
          Обводка = флагман / паспорт
        </span>
      </div>
      {!hasVisibleProjects ? (
        <EmptyState
          text={
            selectedIndustryUnitIds.length > 0
              ? "По выбранным отраслевым управлениям проекты не найдены."
              : "Активных проектов для CSM-матрицы пока нет."
          }
        />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[760px] divide-y divide-slate-200">
            {filteredGroups.map((group) => (
              <article
                className="grid gap-3 bg-slate-50 px-3 py-2.5 lg:grid-cols-[190px_1fr]"
                key={group.id}
              >
                <div>
                  <Link
                    className="text-sm font-semibold text-slate-950 transition hover:text-slate-600"
                    href={`/projects?csm=${group.id}`}
                    title={`${group.name} — ${group.count} проектов`}
                  >
                    {group.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {group.count} проектов
                  </p>
                </div>
                {group.projects.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
                    Проектов нет
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {group.projects.map((project) => (
                      <ProjectPill key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </DownloadablePanel>
  );
}

function ProjectPill({ project }: { project: ProjectListItem }) {
  const color = getPastelColor(
    getStatusChartColor(project.status?.name, project.status?.color_key),
  );
  const hasFlagshipOutline =
    project.is_flagship || project.flagship_passport_uploaded;
  const title = [
    `Клиент: ${project.client || "Без клиента"}`,
    `Проект: ${project.project_name || "Без названия"}`,
    `Статус: ${project.status?.name || "Без статуса"}`,
    `CSM: ${project.csm?.full_name || "Без CSM"}`,
    `Флагман / паспорт: ${hasFlagshipOutline ? "да" : "нет"}`,
  ].join("\n");

  return (
    <Link
      className={`max-w-[170px] truncate rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        hasFlagshipOutline ? "border-2" : ""
      }`}
      href={`/projects/${project.id}`}
      style={{
        backgroundColor: color,
        borderColor: hasFlagshipOutline ? "#000000" : "transparent",
        color: "#0f172a",
      }}
      title={title}
    >
      {project.client || "Без клиента"}
    </Link>
  );
}

function DirectorAnalytics({
  assignmentsCount,
  assignmentsErrorMessage,
  directors,
}: {
  assignmentsCount: number;
  assignmentsErrorMessage: string | null;
  directors: PortfolioAnalyticsData["directorGroups"];
}) {
  return (
    <DownloadablePanel fileName="director-analytics">
      <PanelHeader
        description="Директорская структура с отраслевыми управлениями, CSM и количеством проектов."
        title="Директорская структура"
      />
      <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {assignmentsErrorMessage
          ? assignmentsErrorMessage
          : assignmentsCount > 0
            ? `Используются активные назначения: ${assignmentsCount}`
            : "Таблица назначений пока пустая. Показан fallback по полям проектов."}
      </div>

      {directors.length === 0 ? (
        <EmptyState text="Нет активных проектов с директорской структурой." />
      ) : (
        <div className="mt-5 grid gap-4">
          {directors.map((director) => (
            <article
              className="rounded-lg border border-slate-200 bg-slate-50 p-5"
              key={director.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link
                    className="text-lg font-semibold text-slate-950 transition hover:text-slate-600"
                    href={director.href}
                  >
                    {director.name}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {director.industryUnits.map((industryUnit) => (
                      <Link
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
                        href={industryUnit.href}
                        key={industryUnit.id}
                      >
                        {industryUnit.name}: {industryUnit.totalProjects}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-slate-600 sm:text-right">
                  <p>{director.totalProjects} проектов</p>
                  <p>
                    В среднем {director.averageProjectsPerCsm.toFixed(1)} на CSM
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {director.industryUnits.map((industryUnit) => (
                  <div
                    className="rounded-md border border-slate-200 bg-white p-4"
                    key={industryUnit.id}
                  >
                    <Link
                      className="text-sm font-semibold text-slate-800 transition hover:text-slate-600"
                      href={industryUnit.href}
                    >
                      {industryUnit.name} · {industryUnit.totalProjects}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {industryUnit.csmCount} CSM · {industryUnit.projectsPerCsm.toFixed(1)} проекта на CSM
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {industryUnit.csms.map((csm) => (
                        <Link
                          className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                          href={csm.href}
                          key={csm.id}
                          title={`${csm.name} — ${csm.projectCount} проектов`}
                        >
                          {csm.name}: {csm.projectCount}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </DownloadablePanel>
  );
}

function FlagshipAnalytics({
  readiness,
  split,
  statusSegments,
  totalFlagship,
}: {
  readiness: PortfolioAnalyticsData["flagshipReadiness"];
  split: AnalyticsSegment[];
  statusSegments: AnalyticsSegment[];
  totalFlagship: number;
}) {
  return (
    <DownloadablePanel fileName="flagship-analytics">
      <PanelHeader
        description="Доля флагманских проектов, статусы и готовность паспортного контура."
        title="Флагманская аналитика"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {split.map((segment) => (
          <SegmentCard
            key={segment.key}
            segment={segment}
            total={split.reduce((sum, item) => sum + item.count, 0)}
          />
        ))}
      </div>
      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-slate-800">
          Статусы флагманов
        </p>
        <SegmentedBar segments={statusSegments} total={totalFlagship} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {statusSegments.map((segment) => (
            <SegmentCard
              key={segment.key}
              segment={segment}
              total={totalFlagship}
            />
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {readiness.map((item) => (
          <div
            className="rounded-md border bg-white px-4 py-4"
            key={item.key}
            style={{ borderColor: item.color }}
            title={`${item.label} — ${item.count} проектов`}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {item.count}
              <span className="ml-2 text-sm font-medium text-slate-500">
                {item.percent}%
              </span>
            </p>
          </div>
        ))}
      </div>
    </DownloadablePanel>
  );
}

function DataQualityPanel({
  segments,
  total,
}: {
  segments: AnalyticsSegment[];
  total: number;
}) {
  return (
    <DownloadablePanel fileName="data-quality">
      <PanelHeader
        description="Оценка по 8 ключевым полям: клиент, название, суть, статус, отраслевое управление, CSM, директор, следующий шаг."
        title="Качество заполнения карточек"
      />
      <SegmentedBar segments={segments} total={total} />
      <div className="mt-5 grid gap-3">
        {segments.map((segment) => (
          <SegmentCard key={segment.key} segment={segment} total={total} />
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Порог: 7-8 заполненных полей — хорошо, 4-6 — частично, 0-3 — много
        пустых полей. Архивные проекты не учитываются.
      </p>
    </DownloadablePanel>
  );
}

function PanelHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function getPercent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-zа-я0-9-]/g, "");
}

function getPastelColor(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const mixWithWhite = (channel: number) => Math.round(channel * 0.35 + 255 * 0.65);

  return `rgb(${mixWithWhite(red)}, ${mixWithWhite(green)}, ${mixWithWhite(blue)})`;
}
