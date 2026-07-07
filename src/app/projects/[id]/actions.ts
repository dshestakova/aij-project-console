"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProjectDetail } from "@/types/project-registry";

export type ProjectEditInput = {
  external_id: string;
  client: string;
  project_name: string;
  status_id: string;
  cluster_id: string;
  csm_id: string;
  director_id: string;
  industry_unit_id: string;
  essence: string;
  progress: string;
  next_step: string;
  funding_status: string;
  funding: string;
  comment: string;
  is_archived: boolean;
  is_flagship: boolean;
  flagship_status_id: string;
  flagship_description_uploaded: boolean;
  flagship_passport_uploaded: boolean;
  flagship_innovation_level: string;
  flagship_uploaded_to_prbr: boolean;
  flagship_approved_by_ca: boolean;
};

export type ProjectEditResult = {
  ok: boolean;
  message: string;
};

type EditableProjectRow = {
  id: string;
  external_id: string;
  client: string | null;
  project_name: string | null;
  status_id: string | null;
  cluster_id: string | null;
  csm_id: string | null;
  director_id: string | null;
  industry_unit_id: string | null;
  essence: string | null;
  progress: string | null;
  next_step: string | null;
  funding_status: string | null;
  funding: string | null;
  comment: string | null;
  is_archived: boolean;
  is_flagship: boolean;
  flagship_status_id: string | null;
  flagship_description_uploaded: boolean | null;
  flagship_passport_uploaded: boolean | null;
  flagship_innovation_level: ProjectDetail["flagship_innovation_level"];
  flagship_uploaded_to_prbr: boolean | null;
  flagship_approved_by_ca: boolean | null;
};

type ChangeDraft = {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
};

export async function updateProjectAction(
  projectId: string,
  input: ProjectEditInput,
): Promise<ProjectEditResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Нужно войти в систему, чтобы редактировать проект.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !["admin", "editor"].includes(profile.role)) {
    return {
      ok: false,
      message: "У вас нет прав на редактирование проекта.",
    };
  }

  const { data: original, error: originalError } = await supabase
    .from("projects")
    .select(
      `
        id,
        external_id,
        client,
        project_name,
        status_id,
        cluster_id,
        csm_id,
        director_id,
        industry_unit_id,
        essence,
        progress,
        next_step,
        funding_status,
        funding,
        comment,
        is_archived,
        is_flagship,
        flagship_status_id,
        flagship_description_uploaded,
        flagship_passport_uploaded,
        flagship_innovation_level,
        flagship_uploaded_to_prbr,
        flagship_approved_by_ca
      `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (originalError || !original) {
    return {
      ok: false,
      message: "Не удалось загрузить исходные данные проекта для сохранения.",
    };
  }

  const normalized = normalizeInput(input);

  if (!normalized.external_id) {
    return {
      ok: false,
      message: "Внешний ID обязателен.",
    };
  }

  const referenceLabels = await getReferenceLabels();
  const updatePayload: Partial<EditableProjectRow> = {};
  const changes: ChangeDraft[] = [];
  const row = original as EditableProjectRow;

  function addChange<K extends keyof EditableProjectRow>(
    fieldName: keyof ProjectEditInput,
    column: K,
    newValue: EditableProjectRow[K],
    oldDisplay = displayValue(row[column]),
    newDisplay = displayValue(newValue),
  ) {
    if (isSameValue(row[column], newValue)) {
      return;
    }

    updatePayload[column] = newValue;
    changes.push({
      field_name: fieldName,
      old_value: oldDisplay,
      new_value: newDisplay,
    });
  }

  addChange("external_id", "external_id", normalized.external_id);
  addChange("client", "client", normalized.client);
  addChange("project_name", "project_name", normalized.project_name);
  addChange(
    "status_id",
    "status_id",
    normalized.status_id,
    displayReference(row.status_id, referenceLabels.statuses),
    displayReference(normalized.status_id, referenceLabels.statuses),
  );
  addChange(
    "cluster_id",
    "cluster_id",
    normalized.cluster_id,
    displayReference(row.cluster_id, referenceLabels.clusters),
    displayReference(normalized.cluster_id, referenceLabels.clusters),
  );
  addChange(
    "csm_id",
    "csm_id",
    normalized.csm_id,
    displayReference(row.csm_id, referenceLabels.people),
    displayReference(normalized.csm_id, referenceLabels.people),
  );
  addChange(
    "director_id",
    "director_id",
    normalized.director_id,
    displayReference(row.director_id, referenceLabels.people),
    displayReference(normalized.director_id, referenceLabels.people),
  );
  addChange(
    "industry_unit_id",
    "industry_unit_id",
    normalized.industry_unit_id,
    displayReference(row.industry_unit_id, referenceLabels.industryUnits),
    displayReference(normalized.industry_unit_id, referenceLabels.industryUnits),
  );
  addChange("essence", "essence", normalized.essence);
  addChange("funding_status", "funding_status", normalized.funding_status);
  addChange("funding", "funding", normalized.funding);
  addChange("comment", "comment", normalized.comment);
  addChange("is_archived", "is_archived", normalized.is_archived);
  addChange("is_flagship", "is_flagship", normalized.is_flagship);

  const nextFlagshipStatusId = normalized.is_flagship
    ? normalized.flagship_status_id
    : null;

  addChange(
    "flagship_status_id",
    "flagship_status_id",
    nextFlagshipStatusId,
    displayReference(row.flagship_status_id, referenceLabels.flagshipStatuses),
    displayReference(nextFlagshipStatusId, referenceLabels.flagshipStatuses),
  );
  addChange(
    "flagship_description_uploaded",
    "flagship_description_uploaded",
    normalized.flagship_description_uploaded,
  );
  addChange(
    "flagship_passport_uploaded",
    "flagship_passport_uploaded",
    normalized.flagship_passport_uploaded,
  );
  addChange(
    "flagship_innovation_level",
    "flagship_innovation_level",
    normalized.flagship_innovation_level,
  );
  addChange(
    "flagship_uploaded_to_prbr",
    "flagship_uploaded_to_prbr",
    normalized.flagship_uploaded_to_prbr,
  );
  addChange(
    "flagship_approved_by_ca",
    "flagship_approved_by_ca",
    normalized.flagship_approved_by_ca,
  );

  const progressWithHistory = getProgressWithNextStepHistory(
    normalized.progress,
    row.next_step,
    normalized.next_step,
  );

  addChange("progress", "progress", progressWithHistory);
  addChange("next_step", "next_step", normalized.next_step);

  if (changes.length === 0) {
    return {
      ok: true,
      message: "Изменений для сохранения нет.",
    };
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId);

  if (updateError) {
    return {
      ok: false,
      message:
        "Не удалось сохранить проект. Проверьте права доступа и заполнение полей.",
    };
  }

  const { error: changesError } = await supabase.from("project_changes").insert(
    changes.map((change) => ({
      project_id: projectId,
      changed_by: profile.id,
      field_name: change.field_name,
      old_value: change.old_value,
      new_value: change.new_value,
      source: "web",
    })),
  );

  if (changesError) {
    return {
      ok: false,
      message:
        "Проект сохранен, но историю изменений записать не удалось. Проверьте RLS для project_changes.",
    };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "Проект сохранен.",
  };
}

function normalizeInput(input: ProjectEditInput): EditableProjectRow {
  const isFlagship = input.is_flagship;

  return {
    id: "",
    external_id: input.external_id.trim(),
    client: nullableText(input.client),
    project_name: nullableText(input.project_name),
    status_id: nullableId(input.status_id),
    cluster_id: nullableId(input.cluster_id),
    csm_id: nullableId(input.csm_id),
    director_id: nullableId(input.director_id),
    industry_unit_id: nullableId(input.industry_unit_id),
    essence: nullableText(input.essence),
    progress: nullableText(input.progress),
    next_step: nullableText(input.next_step),
    funding_status: nullableText(input.funding_status),
    funding: nullableText(input.funding),
    comment: nullableText(input.comment),
    is_archived: input.is_archived,
    is_flagship: isFlagship,
    flagship_status_id: isFlagship ? nullableId(input.flagship_status_id) : null,
    flagship_description_uploaded: input.flagship_description_uploaded,
    flagship_passport_uploaded: input.flagship_passport_uploaded,
    flagship_innovation_level: normalizeInnovationLevel(
      input.flagship_innovation_level,
    ),
    flagship_uploaded_to_prbr: input.flagship_uploaded_to_prbr,
    flagship_approved_by_ca: input.flagship_approved_by_ca,
  };
}

function nullableText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function nullableId(value: string) {
  return value.trim() ? value : null;
}

function normalizeInnovationLevel(value: string) {
  return value === "высокий" || value === "средний" || value === "низкий"
    ? value
    : null;
}

function isSameValue(first: unknown, second: unknown) {
  return (first ?? null) === (second ?? null);
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "да" : "нет";
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function displayReference(
  id: string | null | undefined,
  labels: Map<string, string>,
) {
  if (!id) {
    return null;
  }

  return labels.get(id) ?? id;
}

function getProgressWithNextStepHistory(
  submittedProgress: string | null,
  oldNextStep: string | null,
  newNextStep: string | null,
) {
  if (isSameValue(oldNextStep?.trim() || null, newNextStep?.trim() || null)) {
    return submittedProgress;
  }

  const oldNextStepValue = oldNextStep?.trim();

  if (!oldNextStepValue) {
    return submittedProgress;
  }

  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(new Date());
  const entry = `[${dateLabel}] Предыдущий следующий шаг: ${oldNextStepValue}`;

  return [submittedProgress?.trim(), entry].filter(Boolean).join("\n\n");
}

async function getReferenceLabels() {
  const supabase = await createServerSupabaseClient();
  const [
    statusesResult,
    clustersResult,
    flagshipStatusesResult,
    peopleResult,
    industryUnitsResult,
  ] = await Promise.all([
    supabase.from("project_statuses").select("id, name"),
    supabase.from("clusters").select("id, name"),
    supabase.from("flagship_statuses").select("id, name"),
    supabase.from("people").select("id, full_name"),
    supabase.from("industry_units").select("id, name"),
  ]);

  return {
    statuses: toLabelMap(statusesResult.data ?? [], "name"),
    clusters: toLabelMap(clustersResult.data ?? [], "name"),
    flagshipStatuses: toLabelMap(flagshipStatusesResult.data ?? [], "name"),
    people: toLabelMap(peopleResult.data ?? [], "full_name"),
    industryUnits: toLabelMap(industryUnitsResult.data ?? [], "name"),
  };
}

function toLabelMap<T extends { id: string }>(
  items: T[],
  labelKey: keyof T,
) {
  return new Map(
    items.map((item) => [item.id, String(item[labelKey] ?? item.id)]),
  );
}
