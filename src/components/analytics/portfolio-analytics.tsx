import Link from "next/link";

import { DownloadablePanel } from "@/components/analytics/downloadable-panel";
import {
  getStatusColor,
  type AnalyticsSegment,
  type PortfolioAnalyticsData,
} from "@/lib/analytics/portfolio";
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
          label="Всего в базе"
          value={data.totalProjects}
          detail="С учетом архивных проектов"
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
          description="Активные проекты по кластерам. Реальные кластеры окрашены разными цветами."
          segments={data.clusterSegments}
          title="Проекты по кластерам"
          total={totalActiveProjects}
        />
      </div>

      <CsmMatrix projects={data.csmMatrix} />

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
  const className =
    "flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition hover:border-slate-300 hover:bg-white";
  const title = `${segment.label} — ${segment.count} проектов`;

  return segment.href ? (
    <Link className={className} href={segment.href} title={title}>
      {content}
    </Link>
  ) : (
    <div className={className} title={title}>
      {content}
    </div>
  );
}

function CsmMatrix({ projects }: { projects: PortfolioAnalyticsData["csmMatrix"] }) {
  const statusLegend = [
    { label: "идея/КП", color: "#fde7b8" },
    { label: "факт оплаты", color: "#ccefdc" },
    { label: "уточнение ТЗ", color: "#d7e8ff" },
    { label: "в разработке", color: "#e6dcff" },
    { label: "на паузе", color: "#dce5ee" },
    { label: "Без статуса", color: "#edf0f4" },
  ];

  return (
    <DownloadablePanel fileName="csm-matrix">
      <PanelHeader
        description="Компактная матрица по CSM: строка CSM слева, справа горизонтальные клиентские проекты со статусной заливкой."
        title="CSM-матрица"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {statusLegend.map((item) => (
          <span
            className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
            key={item.label}
          >
            <span
              className="h-3.5 w-3.5 rounded-sm border border-slate-200"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      {projects.length === 0 ? (
        <EmptyState text="Активных проектов для CSM-матрицы пока нет." />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[760px] divide-y divide-slate-200">
            {projects.map((group) => (
              <article
                className="grid gap-3 bg-slate-50 px-3 py-2.5 lg:grid-cols-[190px_1fr]"
                key={group.id}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {group.name}
                  </p>
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
  const color = getStatusColor(project);
  const title = [
    `Клиент: ${project.client || "Без клиента"}`,
    `Проект: ${project.project_name || "Без названия"}`,
    `Статус: ${project.status?.name || "Без статуса"}`,
    `CSM: ${project.csm?.full_name || "Без CSM"}`,
    `Флагман: ${project.is_flagship ? "да" : "нет"}`,
  ].join("\n");

  return (
    <Link
      className={`max-w-[170px] truncate rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        project.is_flagship ? "border-[3px]" : ""
      }`}
      href={`/projects/${project.id}`}
      style={{
        backgroundColor: color,
        borderColor: project.is_flagship ? "#4338ca" : "transparent",
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
        description="Директорская структура с отраслевыми управлениями и разбивкой проектов по кластерам внутри каждого директора."
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
                    {director.industries.map((industry) => (
                      <span
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-500"
                        key={industry.id}
                      >
                        {industry.name}: {industry.totalProjects}
                      </span>
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
                {director.clusters.map((cluster) => (
                  <div
                    className="rounded-md border border-slate-200 bg-white p-4"
                    key={cluster.id}
                  >
                    <Link
                      className="text-sm font-semibold text-slate-800 transition hover:text-slate-600"
                      href={cluster.href}
                    >
                      {cluster.name} · {cluster.totalProjects}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cluster.csms.map((csm) => (
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
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4"
            key={item.key}
            title={`${item.label} — ${item.count} проектов`}
          >
            <p className="text-sm font-medium text-slate-800">{item.label}</p>
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
        description="Оценка по 8 ключевым полям: клиент, название, суть, статус, кластер, CSM, директор, следующий шаг."
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
        пустых полей. URL-фильтр качества можно добавить отдельным шагом.
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
