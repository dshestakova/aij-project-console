import Link from "next/link";

import { Badge } from "@/components/projects/badge";
import { getAccentTone } from "@/lib/project-registry/colors";
import { formatDateTime, getDisplayValue, getPreview } from "@/lib/project-registry/format";
import type { ProjectListItem } from "@/types/project-registry";

type ProjectCardProps = {
  project: ProjectListItem;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      className={`group block rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 ${getAccentTone(
        project.cluster?.color_key,
      )}`}
      href={`/projects/${project.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 transition group-hover:text-slate-600">
            {project.external_id}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            {getDisplayValue(project.project_name)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {getDisplayValue(project.client)}
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-500">
          обновлено {formatDateTime(project.updated_at)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.cluster ? (
          <Badge colorKey={project.cluster.color_key}>{project.cluster.name}</Badge>
        ) : (
          <Badge>Кластер не указан</Badge>
        )}
        {project.status ? (
          <Badge colorKey={project.status.color_key}>{project.status.name}</Badge>
        ) : (
          <Badge>Статус не указан</Badge>
        )}
        {project.is_flagship ? <Badge colorKey="indigo">Флагман</Badge> : null}
        {project.flagship_status ? (
          <Badge colorKey={project.flagship_status.color_key}>
            {project.flagship_status.name}
          </Badge>
        ) : null}
        {project.is_archived ? <Badge colorKey="gray">Архив</Badge> : null}
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase text-slate-400">
          Следующий шаг
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          {getPreview(project.next_step)}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
        <span>Открыть проект</span>
        <span aria-hidden="true" className="transition group-hover:translate-x-1">
          -&gt;
        </span>
      </div>
    </Link>
  );
}
