import Link from "next/link";

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
    <section className="flex flex-col gap-5">
      {data.errorMessage ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {data.errorMessage}
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
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

      <div className="grid gap-5 xl:grid-cols-2">
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

      <div className="grid gap-5 xl:grid-cols-2">
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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelHeader description={description} title={title} />
      <SegmentedBar segments={segments} total={total} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {segments.map((segment) => (
          <SegmentCard key={segment.key} segment={segment} total={total} />
        ))}
      </div>
    </section>
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
      <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        Нет активных проектов для расчета.
      </div>
    );
  }

  return (
    <div className="mt-4 flex h-8 overflow-hidden rounded-md bg-slate-100">
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
    "flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-white";
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
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelHeader
        description="Единственная CSM-матрица: группы отсортированы по числу проектов, внутри проекты разложены по клиентам."
        title="CSM-матрица"
      />
      {projects.length === 0 ? (
        <EmptyState text="Активных проектов для CSM-матрицы пока нет." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-[760px] flex-col gap-3">
            {projects.map((group) => (
              <article
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[220px_1fr]"
                key={group.id}
              >
                <div>
                  <p className="text-base font-semibold text-slate-950">
                    {group.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {group.count} проектов
                  </p>
                </div>
                <div className="grid gap-3">
                  {group.clients.map((client) => (
                    <div key={client.name}>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                        {client.name} · {client.projects.length}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {client.projects.map((project) => (
                          <ProjectPill key={project.id} project={project} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
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
      className={`max-w-[240px] truncate rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        project.is_flagship ? "border-2" : ""
      }`}
      href={`/projects/${project.id}`}
      style={{
        borderColor: project.is_flagship ? "#4f46e5" : color,
        boxShadow: `inset 4px 0 0 ${color}`,
      }}
      title={title}
    >
      {project.external_id} · {project.project_name || "Без названия"}
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelHeader
        description="Иерархия Director → Industry unit → CSM с суммарной нагрузкой и средним числом проектов на CSM."
        title="Директорская структура"
      />
      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {assignmentsErrorMessage
          ? assignmentsErrorMessage
          : assignmentsCount > 0
            ? `Используются активные назначения: ${assignmentsCount}`
            : "Таблица назначений пока пустая. Показан fallback по полям проектов."}
      </div>

      {directors.length === 0 ? (
        <EmptyState text="Нет активных проектов с директорской структурой." />
      ) : (
        <div className="mt-4 grid gap-3">
          {directors.map((director) => (
            <article
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              key={director.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <Link
                  className="text-lg font-semibold text-slate-950 transition hover:text-slate-600"
                  href={director.href}
                >
                  {director.name}
                </Link>
                <div className="text-sm text-slate-600 sm:text-right">
                  <p>{director.totalProjects} проектов</p>
                  <p>
                    В среднем {director.averageProjectsPerCsm.toFixed(1)} на CSM
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {director.industries.map((industry) => (
                  <div
                    className="rounded-md border border-slate-200 bg-white p-3"
                    key={industry.id}
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {industry.name} · {industry.totalProjects}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {industry.csms.map((csm) => (
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
    </section>
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelHeader
        description="Доля флагманских проектов, статусы и готовность паспортного контура."
        title="Флагманская аналитика"
      />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {split.map((segment) => (
          <SegmentCard key={segment.key} segment={segment} total={split.reduce((sum, item) => sum + item.count, 0)} />
        ))}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Статусы флагманов
        </p>
        <SegmentedBar segments={statusSegments} total={totalFlagship} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {statusSegments.map((segment) => (
            <SegmentCard
              key={segment.key}
              segment={segment}
              total={totalFlagship}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {readiness.map((item) => (
          <div
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3"
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
    </section>
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelHeader
        description="Оценка по 8 ключевым полям: клиент, название, суть, статус, кластер, CSM, директор, следующий шаг."
        title="Качество заполнения карточек"
      />
      <SegmentedBar segments={segments} total={total} />
      <div className="mt-4 grid gap-2">
        {segments.map((segment) => (
          <SegmentCard key={segment.key} segment={segment} total={total} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Порог: 7-8 заполненных полей — хорошо, 4-6 — частично, 0-3 — много
        пустых полей. URL-фильтр качества можно добавить отдельным шагом.
      </p>
    </section>
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
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function getPercent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}
