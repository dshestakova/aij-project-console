import Link from "next/link";
import { redirect } from "next/navigation";

import { UserHeader } from "@/components/auth/user-header";
import {
  getAdminProjectActivityData,
  type ProjectActivityEvent,
  type ProjectActivityKind,
} from "@/lib/admin/project-activity";
import { formatDateTime } from "@/lib/project-registry/format";
import { getCurrentProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminActivityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ActivityTypeFilter =
  | "all"
  | "changes"
  | "passports"
  | "autofill"
  | "created";
type ActivityPeriodFilter = "7" | "30" | "90" | "all";

const typeOptions: Array<{ value: ActivityTypeFilter; label: string }> = [
  { value: "all", label: "Все события" },
  { value: "changes", label: "Изменения" },
  { value: "passports", label: "Паспорта" },
  { value: "autofill", label: "Автозаполнение" },
  { value: "created", label: "Новые проекты" },
];

const periodOptions: Array<{ value: ActivityPeriodFilter; label: string }> = [
  { value: "7", label: "Последние 7 дней" },
  { value: "30", label: "Последние 30 дней" },
  { value: "90", label: "Последние 90 дней" },
  { value: "all", label: "За все время" },
];

export default async function AdminActivityPage({
  searchParams,
}: AdminActivityPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/activity");
  }

  const currentProfile = await getCurrentProfile();

  if (currentProfile?.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <UserHeader
            email={user.email ?? "Пользователь"}
            role={currentProfile?.role}
          />
          <section className="py-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <h2 className="text-lg font-semibold">Доступ ограничен</h2>
              <p className="mt-2 text-sm leading-6">
                Активность всех проектов доступна только администраторам.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const [resolvedSearchParams, activityData] = await Promise.all([
    searchParams,
    getAdminProjectActivityData(),
  ]);
  const typeFilter = getTypeFilter(resolvedSearchParams.type);
  const periodFilter = getPeriodFilter(resolvedSearchParams.period);
  const actorFilter = getParam(resolvedSearchParams.actor);
  const actorOptions = getActorOptions(activityData.events);
  const filteredEvents = activityData.events
    .filter((event) => matchesType(event.kind, typeFilter))
    .filter((event) => !actorFilter || getActorId(event) === actorFilter)
    .filter((event) => matchesPeriod(event.occurredAt, periodFilter))
    .slice(0, 100);
  const eventsInLastSevenDays = activityData.events.filter((event) =>
    matchesPeriod(event.occurredAt, "7"),
  ).length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/admin/activity"
          email={user.email ?? "Пользователь"}
          role={currentProfile.role}
        />

        <section className="flex flex-col gap-5 py-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                Активность проектов
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Последние изменения, загрузки и генерации паспортов — со
                ссылками на проекты, чтобы быстро проверить результат.
              </p>
            </div>
            <div className="self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-auto">
              За 7 дней: {" "}
              <span className="font-semibold text-slate-950">
                {eventsInLastSevenDays}
              </span>
            </div>
          </div>

          {activityData.errorMessage ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {activityData.errorMessage}
            </section>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      Последние обновленные проекты
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      По времени последнего сохранения в реестре.
                    </p>
                  </div>
                  <Link
                    className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
                    href="/projects"
                  >
                    Весь реестр
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {activityData.recentProjects.map((project) => (
                    <Link
                      className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                      href={`/projects/${project.id}`}
                      key={project.id}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {project.externalId}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">
                        {getProjectTitle(project)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(project.updatedAt)}
                      </p>
                      {project.isArchived ? (
                        <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                          Архив
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">
                  Лента событий
                </h3>
                <form
                  className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto]"
                  method="get"
                >
                  <FilterSelect
                    label="Тип события"
                    name="type"
                    options={typeOptions}
                    value={typeFilter}
                  />
                  <FilterSelect
                    label="Пользователь"
                    name="actor"
                    options={[
                      { value: "", label: "Все пользователи" },
                      ...actorOptions,
                    ]}
                    value={actorFilter}
                  />
                  <FilterSelect
                    label="Период"
                    name="period"
                    options={periodOptions}
                    value={periodFilter}
                  />
                  <button
                    className="h-11 self-end rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    type="submit"
                  >
                    Применить
                  </button>
                  <Link
                    className="h-11 self-end rounded-md border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:text-slate-950"
                    href="/admin/activity"
                  >
                    Сбросить
                  </Link>
                </form>

                {filteredEvents.length === 0 ? (
                  <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    По выбранным фильтрам событий нет.
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-200">
                    {filteredEvents.map((event) => (
                      <ActivityRow event={event} key={event.id} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function ActivityRow({ event }: { event: ProjectActivityEvent }) {
  return (
    <article className="grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
      <span
        className={`mt-1 h-3 w-3 rounded-full ${getKindDotClass(event.kind)}`}
        title={getKindLabel(event.kind)}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-950">{event.title}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {getKindLabel(event.kind)}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{event.detail}</p>
        <p className="mt-2 text-sm text-slate-600">
          <Link
            className="font-medium text-slate-950 transition hover:text-slate-600"
            href={`/projects/${event.project.id}`}
          >
            {event.project.externalId} · {getProjectTitle(event.project)}
          </Link>
          {event.project.isArchived ? " · архив" : ""}
        </p>
      </div>
      <div className="text-sm text-slate-500 sm:text-right">
        <p>{getActorLabel(event)}</p>
        <p className="mt-1 text-xs">{formatDateTime(event.occurredAt)}</p>
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        defaultValue={value}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getActorOptions(events: ProjectActivityEvent[]) {
  const actors = new Map<string, string>();

  for (const event of events) {
    const id = getActorId(event);
    actors.set(id, getActorLabel(event));
  }

  return Array.from(actors, ([value, label]) => ({ value, label })).sort(
    (first, second) => first.label.localeCompare(second.label, "ru"),
  );
}

function getActorId(event: ProjectActivityEvent) {
  return event.actor?.id ?? "system";
}

function getActorLabel(event: ProjectActivityEvent) {
  return (
    event.actor?.display_name ??
    event.actor?.email ??
    "Системное действие"
  );
}

function getProjectTitle(project: {
  projectName: string | null;
  client: string | null;
}) {
  return project.projectName?.trim() || project.client?.trim() || "Без названия";
}

function matchesType(
  kind: ProjectActivityKind,
  filter: ActivityTypeFilter,
) {
  if (filter === "all") return true;
  if (filter === "changes") return kind === "project_updated";
  if (filter === "created") return kind === "project_created";
  if (filter === "passports") {
    return kind === "passport_uploaded" || kind === "passport_generated";
  }

  return kind === "autofill_started" || kind === "autofill_completed";
}

function matchesPeriod(value: string, period: ActivityPeriodFilter) {
  if (period === "all") return true;

  const cutoff = Date.now() - Number(period) * 24 * 60 * 60 * 1000;
  return new Date(value).getTime() >= cutoff;
}

function getKindLabel(kind: ProjectActivityKind) {
  const labels: Record<ProjectActivityKind, string> = {
    project_created: "Новый проект",
    project_updated: "Изменение",
    passport_uploaded: "Паспорт",
    passport_generated: "Паспорт AI",
    autofill_started: "Автозаполнение",
    autofill_completed: "Данные AI",
  };

  return labels[kind];
}

function getKindDotClass(kind: ProjectActivityKind) {
  if (kind === "project_created") return "bg-emerald-500";
  if (kind === "project_updated") return "bg-sky-500";
  if (kind === "passport_uploaded") return "bg-indigo-500";
  if (kind === "passport_generated") return "bg-violet-500";
  return "bg-amber-500";
}

function getTypeFilter(
  value: string | string[] | undefined,
): ActivityTypeFilter {
  const normalized = getParam(value);
  return typeOptions.some((option) => option.value === normalized)
    ? (normalized as ActivityTypeFilter)
    : "all";
}

function getPeriodFilter(
  value: string | string[] | undefined,
): ActivityPeriodFilter {
  const normalized = getParam(value);
  return periodOptions.some((option) => option.value === normalized)
    ? (normalized as ActivityPeriodFilter)
    : "30";
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
