"use client";

import { useMemo, useState } from "react";

import { ProjectCard } from "@/components/projects/project-card";
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
  initialFilters?: {
    statusId?: string;
    csmId?: string;
    directorId?: string;
    industryUnitId?: string;
    flagshipStatusId?: string;
    flagship?: string;
    archiveMode?: string;
  };
};

export function ProjectsRegistry({
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      if (archiveMode === "active" && project.is_archived) {
        return false;
      }

      if (archiveMode === "archived" && !project.is_archived) {
        return false;
      }

      if (statusId === "__none" && project.status) {
        return false;
      }

      if (
        statusId !== "all" &&
        statusId !== "__none" &&
        project.status?.id !== statusId
      ) {
        return false;
      }

      if (csmId === "__none" && project.csm) {
        return false;
      }

      if (csmId !== "all" && csmId !== "__none" && project.csm?.id !== csmId) {
        return false;
      }

      if (directorId === "__none" && project.director) {
        return false;
      }

      if (
        directorId !== "all" &&
        directorId !== "__none" &&
        project.director?.id !== directorId
      ) {
        return false;
      }

      if (industryUnitId === "__none" && project.industry_unit) {
        return false;
      }

      if (
        industryUnitId !== "all" &&
        industryUnitId !== "__none" &&
        project.industry_unit?.id !== industryUnitId
      ) {
        return false;
      }

      if (flagshipStatusId === "__none" && project.flagship_status) {
        return false;
      }

      if (
        flagshipStatusId !== "all" &&
        flagshipStatusId !== "__none" &&
        project.flagship_status?.id !== flagshipStatusId
      ) {
        return false;
      }

      if (flagship === "yes" && !project.is_flagship) {
        return false;
      }

      if (flagship === "no" && project.is_flagship) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        project.external_id,
        project.client,
        project.project_name,
        project.next_step,
        project.status?.name,
        project.csm?.full_name,
        project.director?.full_name,
        project.industry_unit?.name,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [
    archiveMode,
    csmId,
    directorId,
    flagship,
    flagshipStatusId,
    industryUnitId,
    projects,
    query,
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid flex-1 gap-3 lg:grid-cols-4 xl:grid-cols-[minmax(220px,1.4fr)_repeat(6,minmax(140px,1fr))]">
            <label className="block">
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
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Флагман
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                onChange={(event) => setFlagship(event.target.value)}
                value={flagship}
              >
                <option value="all">Все</option>
                <option value="yes">Да</option>
                <option value="no">Нет</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Архив</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                onChange={(event) => setArchiveMode(event.target.value)}
                value={archiveMode}
              >
                <option value="active">Скрыт</option>
                <option value="all">Показать все</option>
                <option value="archived">Только архив</option>
              </select>
            </label>
          </div>

          <button
            className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 xl:mb-0"
            disabled={isExporting}
            onClick={handleExport}
            type="button"
          >
            {isExporting ? "Готовим файл..." : "Скачать реестр"}
          </button>
        </div>

        {exportError ? (
          <p className="mt-3 text-sm text-rose-700">{exportError}</p>
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
    <label className="block">
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
