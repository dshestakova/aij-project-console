"use client";

import { useMemo, useState } from "react";

import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectListItem, ReferenceItem } from "@/types/project-registry";

type ProjectsRegistryProps = {
  projects: ProjectListItem[];
  statuses: ReferenceItem[];
  clusters: ReferenceItem[];
};

export function ProjectsRegistry({
  clusters,
  projects,
  statuses,
}: ProjectsRegistryProps) {
  const [query, setQuery] = useState("");
  const [statusId, setStatusId] = useState("all");
  const [clusterId, setClusterId] = useState("all");
  const [flagship, setFlagship] = useState("all");
  const [archiveMode, setArchiveMode] = useState("active");

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      if (archiveMode === "active" && project.is_archived) {
        return false;
      }

      if (archiveMode === "archived" && !project.is_archived) {
        return false;
      }

      if (statusId !== "all" && project.status?.id !== statusId) {
        return false;
      }

      if (clusterId !== "all" && project.cluster?.id !== clusterId) {
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
        project.cluster?.name,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [archiveMode, clusterId, flagship, projects, query, statusId]);

  const hasAnyProjects = projects.length > 0;
  const hasActiveFilters =
    query.trim() ||
    statusId !== "all" ||
    clusterId !== "all" ||
    flagship !== "all" ||
    archiveMode !== "active";

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,auto))]">
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
            value={statusId}
          />
          <FilterSelect
            label="Кластер"
            onChange={setClusterId}
            options={clusters}
            value={clusterId}
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Флагман</span>
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
              ? "Попробуйте изменить поиск, статус, кластер или режим архива."
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

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReferenceItem[];
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
