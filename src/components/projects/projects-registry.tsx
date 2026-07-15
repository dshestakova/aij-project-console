"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProjectCard } from "@/components/projects/project-card";
import {
  filterProjectRegistryProjects,
  type ArchiveMode,
  type BooleanFilter,
  type QualityFilter,
} from "@/lib/project-registry/filters";
import type {
  PersonReference,
  ProjectListItem,
  ReferenceItem,
} from "@/types/project-registry";

type ProjectsRegistryProps = {
  projects: ProjectListItem[];
  statuses: ReferenceItem[];
  flagshipStatuses: ReferenceItem[];
  csms: PersonReference[];
  directors: PersonReference[];
  industryUnits: ReferenceItem[];
  canCreateProject?: boolean;
  initialFilters?: {
    statusId?: string;
    csmId?: string;
    directorId?: string;
    industryUnitId?: string;
    flagshipStatusId?: string;
    flagship?: BooleanFilter;
    archiveMode?: ArchiveMode;
    social?: BooleanFilter;
    quality?: QualityFilter;
    query?: string;
  };
};

type FilterUrlOverrides = Partial<{
  archiveMode: ArchiveMode;
  csmId: string;
  directorId: string;
  flagship: BooleanFilter;
  flagshipStatusId: string;
  industryUnitId: string;
  quality: QualityFilter;
  query: string;
  social: BooleanFilter;
  statusId: string;
}>;

export function ProjectsRegistry({
  canCreateProject,
  csms,
  directors,
  flagshipStatuses,
  industryUnits,
  initialFilters,
  projects,
  statuses,
}: ProjectsRegistryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const shouldReplaceQueryRef = useRef(false);
  const scrollStorageKey = `aij-projects-scroll:${pathname}?${searchParams.toString()}`;
  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [statusId, setStatusId] = useState(initialFilters?.statusId ?? "all");
  const [csmId, setCsmId] = useState(initialFilters?.csmId ?? "all");
  const [directorId, setDirectorId] = useState(
    initialFilters?.directorId ?? "all",
  );
  const [industryUnitId, setIndustryUnitId] = useState(
    initialFilters?.industryUnitId ?? "all",
  );
  const [flagshipStatusId, setFlagshipStatusId] = useState(
    initialFilters?.flagshipStatusId ?? "all",
  );
  const [flagship, setFlagship] = useState(initialFilters?.flagship ?? "all");
  const [archiveMode, setArchiveMode] = useState(
    initialFilters?.archiveMode ?? "active",
  );
  const [social, setSocial] = useState(initialFilters?.social ?? "all");
  const [quality, setQuality] = useState(initialFilters?.quality ?? "all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return filterProjectRegistryProjects(projects, {
      archiveMode,
      csmId,
      directorId,
      flagship,
      flagshipStatusId,
      industryUnitId,
      quality,
      query,
      social,
      statusId,
    });
  }, [
    archiveMode,
    csmId,
    directorId,
    flagship,
    flagshipStatusId,
    industryUnitId,
    projects,
    quality,
    query,
    social,
    statusId,
  ]);

  const hasAnyProjects = projects.length > 0;
  const hasActiveSearchOrFilters =
    Boolean(query.trim()) ||
    statusId !== "all" ||
    csmId !== "all" ||
    directorId !== "all" ||
    industryUnitId !== "all" ||
    flagshipStatusId !== "all" ||
    flagship !== "all" ||
    social !== "all" ||
    quality !== "all";
  const hasActiveFilters =
    hasActiveSearchOrFilters ||
    archiveMode !== "active";
  const isArchiveOnlyEmpty =
    archiveMode === "archived" && !hasActiveSearchOrFilters;
  const activeFilterSummary = getActiveFilterSummary({
    archiveMode,
    csmId,
    csms,
    directorId,
    directors,
    flagship,
    flagshipStatusId,
    flagshipStatuses,
    industryUnitId,
    industryUnits,
    quality,
    query,
    social,
    statusId,
    statuses,
  });

  useEffect(() => {
    const savedPosition = sessionStorage.getItem(scrollStorageKey);

    if (!savedPosition) {
      return;
    }

    const parsedPosition = Number(savedPosition);

    if (!Number.isFinite(parsedPosition)) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: parsedPosition, behavior: "auto" });
    });
  }, [scrollStorageKey]);

  useEffect(() => {
    function saveScrollPosition() {
      sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
    }

    window.addEventListener("pagehide", saveScrollPosition);

    return () => {
      saveScrollPosition();
      window.removeEventListener("pagehide", saveScrollPosition);
    };
  }, [scrollStorageKey]);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/projects/export");

      if (!response.ok) {
        let message =
          "Не удалось скачать реестр. Проверьте доступ и попробуйте еще раз.";

        try {
          const payload = (await response.json()) as { message?: string };
          message = payload.message ?? message;
        } catch {
          // Response body is optional for failed downloads.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const filename = getDownloadFilename(response.headers);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Не удалось скачать реестр. Попробуйте еще раз.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const scrollResultsIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const replaceUrl = useCallback(({
    overrides = {},
    scrollToResults,
  }: {
    overrides?: FilterUrlOverrides;
    scrollToResults: boolean;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    const nextState = {
      archiveMode,
      csmId,
      directorId,
      flagship,
      flagshipStatusId,
      industryUnitId,
      quality,
      query,
      social,
      statusId,
      ...overrides,
    };

    setQueryParam(nextSearchParams, "search", nextState.query.trim(), "");
    setQueryParam(nextSearchParams, "status", nextState.statusId, "all");
    setQueryParam(nextSearchParams, "csm", nextState.csmId, "all");
    setQueryParam(nextSearchParams, "director", nextState.directorId, "all");
    setQueryParam(
      nextSearchParams,
      "industry_unit",
      nextState.industryUnitId,
      "all",
    );
    nextSearchParams.delete("cluster");
    setQueryParam(
      nextSearchParams,
      "flagship_status",
      nextState.flagshipStatusId,
      "all",
    );
    setQueryParam(
      nextSearchParams,
      "flagship",
      booleanFilterToParam(nextState.flagship),
      "all",
    );
    setQueryParam(
      nextSearchParams,
      "social",
      booleanFilterToParam(nextState.social),
      "all",
    );
    setQueryParam(nextSearchParams, "quality", nextState.quality, "all");
    setQueryParam(nextSearchParams, "archive", nextState.archiveMode, "active");
    nextSearchParams.delete("archived");

    const queryString = nextSearchParams.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(nextUrl, { scroll: false });

    if (scrollToResults) {
      scrollResultsIntoView();
    }
  }, [
    archiveMode,
    csmId,
    directorId,
    flagship,
    flagshipStatusId,
    industryUnitId,
    pathname,
    quality,
    query,
    router,
    scrollResultsIntoView,
    searchParams,
    social,
    statusId,
  ]);

  useEffect(() => {
    if (!shouldReplaceQueryRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      replaceUrl({ scrollToResults: false });
      shouldReplaceQueryRef.current = false;
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [query, replaceUrl]);

  function handleQueryChange(value: string) {
    setQuery(value);
    shouldReplaceQueryRef.current = true;
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    shouldReplaceQueryRef.current = false;
    replaceUrl({ scrollToResults: true });
  }

  function handleFilterChange<T extends FilterUrlOverrides[keyof FilterUrlOverrides]>(
    setter: (value: T) => void,
    value: T,
    field: keyof FilterUrlOverrides,
  ) {
    setter(value);
    window.requestAnimationFrame(() => {
      replaceUrl({
        overrides: { [field]: value } as FilterUrlOverrides,
        scrollToResults: true,
      });
    });
  }

  function resetFilters() {
    setQuery("");
    setStatusId("all");
    setCsmId("all");
    setDirectorId("all");
    setIndustryUnitId("all");
    setFlagshipStatusId("all");
    setFlagship("all");
    setArchiveMode("active");
    setSocial("all");
    setQuality("all");
    shouldReplaceQueryRef.current = false;
    router.replace(pathname, { scroll: false });
    scrollResultsIntoView();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <label className="block min-w-0 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Поиск</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleQueryKeyDown}
              placeholder="ID, клиент, проект, следующий шаг"
              type="search"
              value={query}
            />
          </label>

          <FilterSelect
            label="Статус"
            onChange={(value) => handleFilterChange(setStatusId, value, "statusId")}
            options={statuses}
            missingLabel="Без статуса"
            value={statusId}
          />
          <FilterSelect
            label="CSM"
            onChange={(value) => handleFilterChange(setCsmId, value, "csmId")}
            options={csms.map((csm) => ({
              id: csm.id,
              name: csm.full_name,
            }))}
            missingLabel="Без CSM"
            value={csmId}
          />
          <FilterSelect
            label="Директор"
            onChange={(value) =>
              handleFilterChange(setDirectorId, value, "directorId")
            }
            options={directors.map((director) => ({
              id: director.id,
              name: director.full_name,
            }))}
            missingLabel="Без директора"
            value={directorId}
          />
          <FilterSelect
            label="Отраслевое управление"
            onChange={(value) =>
              handleFilterChange(setIndustryUnitId, value, "industryUnitId")
            }
            options={industryUnits}
            missingLabel="Без отраслевого управления"
            value={industryUnitId}
          />
          <FilterSelect
            label="Статус флагмана"
            onChange={(value) =>
              handleFilterChange(setFlagshipStatusId, value, "flagshipStatusId")
            }
            options={flagshipStatuses}
            missingLabel="Без статуса"
            value={flagshipStatusId}
          />
          <label className="block min-w-0">
            <span className="text-sm font-medium text-slate-700">Флагман</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              onChange={(event) =>
                handleFilterChange(
                  setFlagship,
                  event.target.value as BooleanFilter,
                  "flagship",
                )
              }
              value={flagship}
            >
              <option value="all">Все</option>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-medium text-slate-700">
              Социальный
            </span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              onChange={(event) =>
                handleFilterChange(
                  setSocial,
                  event.target.value as BooleanFilter,
                  "social",
                )
              }
              value={social}
            >
              <option value="all">Все</option>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-medium text-slate-700">
              Качество
            </span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              onChange={(event) =>
                handleFilterChange(
                  setQuality,
                  event.target.value as QualityFilter,
                  "quality",
                )
              }
              value={quality}
            >
              <option value="all">Все</option>
              <option value="good">Хорошо</option>
              <option value="partial">Частично</option>
              <option value="poor">Много пустых</option>
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-medium text-slate-700">Архив</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              onChange={(event) =>
                handleFilterChange(
                  setArchiveMode,
                  event.target.value as ArchiveMode,
                  "archiveMode",
                )
              }
              value={archiveMode}
            >
              <option value="active">Только активные</option>
              <option value="all">Показать все</option>
              <option value="archived">Только архив</option>
            </select>
          </label>

          {canCreateProject ? (
            <div className="flex min-w-0 items-end">
              <Link
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                href="/projects/new"
              >
                Добавить проект
              </Link>
            </div>
          ) : null}

          <div className="flex min-w-0 items-end">
            <button
              className="h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isExporting}
              onClick={handleExport}
              type="button"
            >
              {isExporting ? "Готовим файл..." : "Скачать реестр"}
            </button>
          </div>
        </div>

        {exportError ? (
          <p className="mt-3 text-sm text-rose-700">{exportError}</p>
        ) : null}

        {archiveMode !== "active" ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {archiveMode === "archived"
              ? "Показаны только архивные проекты."
              : "Показаны активные и архивные проекты."}
          </p>
        ) : null}
      </div>

      <div ref={resultsRef} className="scroll-mt-6" />

      {!hasAnyProjects ? (
        <EmptyState
          title="Проекты еще не импортированы"
          description="База данных и справочники готовы. После импорта здесь появятся карточки проектов с фильтрами и быстрым просмотром следующего шага."
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          activeFilterSummary={activeFilterSummary}
          action={
            hasActiveFilters ? (
              <button
                className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                onClick={resetFilters}
                type="button"
              >
                Сбросить фильтры
              </button>
            ) : null
          }
          title={
            isArchiveOnlyEmpty
              ? "В архиве пока нет проектов"
              : "Проекты не найдены"
          }
          description={
            isArchiveOnlyEmpty
              ? "Архивные проекты появятся здесь после перевода проекта в архив."
              : "Попробуйте изменить параметры поиска или сбросить фильтры."
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

function getDownloadFilename(headers: Headers) {
  const disposition = headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/i);

  return match?.[1] ?? "aij-project-registry.csv";
}

function setQueryParam(
  searchParams: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string,
) {
  if (!value || value === defaultValue) {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, value);
}

function booleanFilterToParam(value: BooleanFilter) {
  if (value === "yes") {
    return "true";
  }

  if (value === "no") {
    return "false";
  }

  return "all";
}

function FilterSelect({
  label,
  missingLabel,
  onChange,
  options,
  value,
}: {
  label: string;
  missingLabel?: string;
  onChange: (value: string) => void;
  options: Array<Pick<ReferenceItem, "id" | "name">>;
  value: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">Все</option>
        {missingLabel ? <option value="__none">{missingLabel}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({
  action,
  activeFilterSummary,
  description,
  title,
}: {
  action?: React.ReactNode;
  activeFilterSummary?: string[];
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
      {activeFilterSummary && activeFilterSummary.length > 0 ? (
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
          {activeFilterSummary.map((item) => (
            <span
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
      {action}
    </section>
  );
}

function getActiveFilterSummary({
  archiveMode,
  csmId,
  csms,
  directorId,
  directors,
  flagship,
  flagshipStatusId,
  flagshipStatuses,
  industryUnitId,
  industryUnits,
  quality,
  query,
  social,
  statusId,
  statuses,
}: {
  archiveMode: ArchiveMode;
  csmId: string;
  csms: PersonReference[];
  directorId: string;
  directors: PersonReference[];
  flagship: BooleanFilter;
  flagshipStatusId: string;
  flagshipStatuses: ReferenceItem[];
  industryUnitId: string;
  industryUnits: ReferenceItem[];
  quality: QualityFilter;
  query: string;
  social: BooleanFilter;
  statusId: string;
  statuses: ReferenceItem[];
}) {
  return [
    query.trim() ? `Поиск: ${query.trim()}` : null,
    statusId !== "all"
      ? `Статус: ${findReferenceName(statuses, statusId, "Без статуса")}`
      : null,
    csmId !== "all"
      ? `CSM: ${findPersonName(csms, csmId, "Без CSM")}`
      : null,
    directorId !== "all"
      ? `Директор: ${findPersonName(directors, directorId, "Без директора")}`
      : null,
    industryUnitId !== "all"
      ? `ОУ: ${findReferenceName(
          industryUnits,
          industryUnitId,
          "Без отраслевого управления",
        )}`
      : null,
    flagshipStatusId !== "all"
      ? `Статус флагмана: ${findReferenceName(
          flagshipStatuses,
          flagshipStatusId,
          "Без статуса",
        )}`
      : null,
    flagship !== "all" ? `Флагман: ${flagship === "yes" ? "да" : "нет"}` : null,
    social !== "all" ? `Социальный: ${social === "yes" ? "да" : "нет"}` : null,
    quality !== "all" ? `Качество: ${getQualityLabel(quality)}` : null,
    archiveMode !== "active" ? `Архив: ${getArchiveLabel(archiveMode)}` : null,
  ].filter((item): item is string => Boolean(item));
}

function findReferenceName(
  items: ReferenceItem[],
  id: string,
  missingLabel: string,
) {
  if (id === "__none") {
    return missingLabel;
  }

  return items.find((item) => item.id === id)?.name ?? id;
}

function findPersonName(
  items: PersonReference[],
  id: string,
  missingLabel: string,
) {
  if (id === "__none") {
    return missingLabel;
  }

  return items.find((item) => item.id === id)?.full_name ?? id;
}

function getQualityLabel(value: QualityFilter) {
  const labels: Record<QualityFilter, string> = {
    all: "Все",
    good: "Хорошо",
    partial: "Частично",
    poor: "Много пустых",
  };

  return labels[value];
}

function getArchiveLabel(value: ArchiveMode) {
  const labels: Record<ArchiveMode, string> = {
    active: "Только активные",
    all: "Показать все",
    archived: "Только архив",
  };

  return labels[value];
}
