"use client";

import { useMemo, useState, type ReactNode } from "react";

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

const innovationOptions = [
  { value: "all", label: "Все" },
  { value: "высокий", label: "Высокий" },
  { value: "средний", label: "Средний" },
  { value: "низкий", label: "Низкий" },
  { value: "__none", label: "Не указано" },
] as const;

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
  const [innovationLevel, setInnovationLevel] = useState("all");
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

      if (innovationLevel === "__none" && project.flagship_innovation_level) {
        return false;
      }

      if (
        innovationLevel !== "all" &&
        innovationLevel !== "__none" &&
        project.flagship_innovation_level !== innovationLevel
      ) {
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
    innovationLevel,
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
    innovationLevel !== "all" ||
    flagship !== "all" ||
    archiveMode !== "active";

  function resetFilters() {
    setQuery("");
    setStatusId("all");
    setCsmId("all");
    setDirectorId("all");
    setIndustryUnitId("all");
    setFlagshipStatusId("all");
    setInnovationLevel("all");
    setFlagship("all");
    setArchiveMode("active");
  }

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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block md:col-span-2 xl:col-span-4">
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
            label="Отраслевое управление"
            onChange={setIndustryUnitId}
            options={industryUnits}
            missingLabel="Без отраслевого управления"
            value={industryUnitId}
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
            label="Статус флагмана"
            onChange={setFlagshipStatusId}
            options={flagshipStatuses}
            missingLabel="Без статуса"
            value={flagshipStatusId}
          />
          <FilterSelect
            label="Инновационность"
            onChange={setInnovationLevel}
            options={innovationOptions.map((option) => ({
              id: option.value,
              name: option.label,
            }))}
            value={innovationLevel}
          />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Флагман
                </p>
                <SegmentedControl
                  className="mt-2"
                  onChange={setFlagship}
                  options={[
                    { value: "all", label: "Все" },
                    { value: "yes", label: "Да" },
                    { value: "no", label: "Нет" },
                  ]}
                  value={flagship}
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Архив
                </p>
                <SegmentedControl
                  className="mt-2"
                  onChange={setArchiveMode}
                  options={[
                    { value: "active", label: "Активные" },
                    { value: "all", label: "Все" },
                    { value: "archived", label: "Архив" },
                  ]}
                  value={archiveMode}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasActiveFilters ? (
                <ToolbarButton onClick={resetFilters} variant="secondary">
                  Сбросить
                </ToolbarButton>
              ) : null}
              <ToolbarButton
                disabled={isExporting}
                onClick={handleExport}
                variant="primary"
              >
                {isExporting ? "Готовим файл..." : "Скачать реестр"}
              </ToolbarButton>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Показано{" "}
            <span className="font-semibold text-slate-950">
              {filteredProjects.length}
            </span>{" "}
            из {projects.length}
          </p>
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

function ToolbarButton({
  children,
  disabled,
  onClick,
  variant,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant: "primary" | "secondary";
}) {
  const baseClassName =
    "h-11 rounded-md px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed";
  const variantClassName =
    variant === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300"
      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950";

  return (
    <button
      className={`${baseClassName} ${variantClassName}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SegmentedControl({
  className,
  onChange,
  options,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div
      className={`grid h-11 w-80 grid-cols-3 rounded-md border border-slate-200 bg-slate-50 p-1 ${className ?? ""}`}
      role="group"
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            aria-pressed={isActive}
            className={`rounded-[5px] text-sm font-medium transition ${
              isActive
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
