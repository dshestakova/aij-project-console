import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileReference } from "@/types/project-registry";

export type ProjectActivityKind =
  | "project_created"
  | "project_updated"
  | "passport_uploaded"
  | "passport_generated"
  | "autofill_started"
  | "autofill_completed";

export type ActivityProject = {
  id: string;
  externalId: string;
  client: string | null;
  projectName: string | null;
  isArchived: boolean;
};

export type ProjectActivityEvent = {
  id: string;
  kind: ProjectActivityKind;
  occurredAt: string;
  actor: ProfileReference | null;
  project: ActivityProject;
  title: string;
  detail: string;
  changedFieldsCount: number;
};

export type RecentActivityProject = ActivityProject & {
  updatedAt: string;
};

type ProjectRelation = {
  id: string;
  external_id: string;
  client: string | null;
  project_name: string | null;
  is_archived: boolean;
};

type ProjectChangeRow = {
  id: string;
  project_id: string;
  changed_by: string | null;
  changed_at: string;
  field_name: string;
  source: string | null;
  project: ProjectRelation | ProjectRelation[] | null;
  profile: ProfileReference | ProfileReference[] | null;
};

type RecentProjectRow = ProjectRelation & {
  updated_at: string;
};

export async function getAdminProjectActivityData(): Promise<{
  events: ProjectActivityEvent[];
  recentProjects: RecentActivityProject[];
  errorMessage: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const [changesResult, projectsResult] = await Promise.all([
    supabase
      .from("project_changes")
      .select(
        `
          id,
          project_id,
          changed_by,
          changed_at,
          field_name,
          source,
          project:projects(id, external_id, client, project_name, is_archived),
          profile:profiles(id, email, display_name, role)
        `,
      )
      .order("changed_at", { ascending: false })
      .limit(500),
    supabase
      .from("projects")
      .select("id, external_id, client, project_name, is_archived, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (changesResult.error || projectsResult.error) {
    console.error(
      "Admin project activity query failed",
      changesResult.error ?? projectsResult.error,
    );

    return {
      events: [],
      recentProjects: [],
      errorMessage:
        "Не удалось загрузить активность проектов. Проверьте права администратора и доступ к истории изменений.",
    };
  }

  return {
    events: buildActivityEvents(
      (changesResult.data ?? []) as unknown as ProjectChangeRow[],
    ),
    recentProjects: ((projectsResult.data ?? []) as RecentProjectRow[]).map(
      (project) => ({
        ...normalizeProject(project),
        updatedAt: project.updated_at,
      }),
    ),
    errorMessage: null,
  };
}

function buildActivityEvents(rows: ProjectChangeRow[]) {
  const groups = new Map<
    string,
    {
      id: string;
      occurredAt: string;
      actor: ProfileReference | null;
      project: ActivityProject;
      source: string | null;
      fieldNames: string[];
    }
  >();

  for (const row of rows) {
    const project = normalizeRelation(row.project);

    if (!project) {
      continue;
    }

    const key = [
      row.project_id,
      row.changed_by ?? "system",
      row.changed_at,
      row.source ?? "unknown",
    ].join(":");
    const existing = groups.get(key);

    if (existing) {
      if (!existing.fieldNames.includes(row.field_name)) {
        existing.fieldNames.push(row.field_name);
      }
      continue;
    }

    groups.set(key, {
      id: row.id,
      occurredAt: row.changed_at,
      actor: normalizeRelation(row.profile),
      project: normalizeProject(project),
      source: row.source,
      fieldNames: [row.field_name],
    });
  }

  return Array.from(groups.values())
    .map((group) => {
      const kind = getActivityKind(group.fieldNames, group.source);

      return {
        id: group.id,
        kind,
        occurredAt: group.occurredAt,
        actor: group.actor,
        project: group.project,
        title: getActivityTitle(kind),
        detail: getActivityDetail(kind, group.fieldNames.length),
        changedFieldsCount: group.fieldNames.length,
      } satisfies ProjectActivityEvent;
    })
    .sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() -
        new Date(first.occurredAt).getTime(),
    );
}

function getActivityKind(
  fieldNames: string[],
  source: string | null,
): ProjectActivityKind {
  if (fieldNames.includes("Создан проект")) {
    return "project_created";
  }

  if (fieldNames.includes("passport_autofill_started")) {
    return "autofill_started";
  }

  if (fieldNames.includes("flagship_passport_uploaded")) {
    return source === "passport_filler"
      ? "passport_generated"
      : "passport_uploaded";
  }

  if (source === "passport_filler") {
    return "autofill_completed";
  }

  return "project_updated";
}

function getActivityTitle(kind: ProjectActivityKind) {
  const titles: Record<ProjectActivityKind, string> = {
    project_created: "Создан новый проект",
    project_updated: "Обновлена информация по проекту",
    passport_uploaded: "Загружена новая версия паспорта",
    passport_generated: "Паспорт сгенерирован автоматически",
    autofill_started: "Запущено автозаполнение паспорта",
    autofill_completed: "Данные проекта заполнены автоматически",
  };

  return titles[kind];
}

function getActivityDetail(kind: ProjectActivityKind, fieldCount: number) {
  if (kind === "project_updated" || kind === "autofill_completed") {
    return `Изменено полей: ${fieldCount}.`;
  }

  if (kind === "project_created") {
    return "Проект добавлен в реестр.";
  }

  if (kind === "autofill_started") {
    return "Внешний сервис начал обработку проекта.";
  }

  return "Файл сохранен в карточке проекта.";
}

function normalizeProject(project: ProjectRelation): ActivityProject {
  return {
    id: project.id,
    externalId: project.external_id,
    client: project.client,
    projectName: project.project_name,
    isArchived: project.is_archived,
  };
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
