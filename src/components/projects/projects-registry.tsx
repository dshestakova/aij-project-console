"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  };
};

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
  const [query, setQuery] = useState("");
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
  const hasActiveFilters =
    query.trim() ||
    statusId !== "all" ||
    csmId !== "all" ||
    directorId !== "all" ||
    industryUnitId !== "all" ||
    flagshipStatusId !== "all" ||
    flagship !== "all" ||
    social !== "all" ||
    quality !== "all" ||
    archiveMode !== "active";

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

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <label className="block min-w-0 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Поиск</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID, клиент, проект, следующий шаг"
              type="search"
              value={query}
            />
          </label>

          <FilterSelect
            label="Статус"
            onChange={setStatusId}
            options={statuses}
            missingLabel="Без статуса"
            value={statusId}
          />
          <FilterSelect
            label="CSM"
            onChange={setCsmId}
            options={csms.map((csm) => ({
              id: csm.id,
              name: csm.full_name,
            }))}
            missingLabel="Без CSM"
            value={csmId}
          />
          <FilterSelect
            label="Директор"
            onChange={setDirectorId}
            options={directors.map((director) => ({
              id: director.id,
              name: director.full_name,
            }))}
            missingLabel="Без директора"
            value={directorId}
          />
          <FilterSelect
            label="Отраслевое управление"
            onChange={setIndustryUnitId}
            options={industryUnits}
            missingLabel="Без отраслевого управления"
            value={industryUnitId}
          />
          <FilterSelect
            label="Статус флагмана"
            onChange={setFlagshipStatusId}
            options={flagshipStatuses}
            missingLabel="Без статуса"
            value={flagshipStatusId}
          />
          <label className="block min-w-0">
            <span className="text-sm font-medium text-slate-700">Флагман</span>
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              onChange={(event) =>
                setFlagship(event.target.value as BooleanFilter)
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
                setSocial(event.target.value as BooleanFilter)
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
                setQuality(event.target.value as QualityFilter)
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
                setArchiveMode(event.target.value as ArchiveMode)
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

      {!hasAnyProjects ? (
        <EmptyState
          title="Проекты еще не импортированы"
          description="База данных и справочники готовы. После импорта здесь появятся карточки проектов с фильтрами и быстрым просмотром следующего шага."
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="По этим фильтрам ничего не найдено"
          description={
            hasActiveFilters
              ? "Попробуйте изменить поиск или выбранные фильтры."
              : "Проекты есть в базе, но текущий список пуст."
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
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </section>
  );
}
