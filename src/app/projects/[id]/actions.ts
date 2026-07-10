"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProjectDetail } from "@/types/project-registry";

export type ProjectEditInput = {
  external_id: string;
  client: string;
  project_name: string;
  status_id: string;
  csm_id: string;
  director_id: string;
  industry_unit_id: string;
  essence: string;
  progress: string;
  next_step: string;
  funding_status: string;
  funding: string;
  is_social: boolean;
  comment: string;
  is_archived: boolean;
  is_flagship: boolean;
  flagship_status_id: string;
  flagship_problem_description: string;
  flagship_solution_description: string;
  flagship_ai_functionality: string;
  flagship_passport_uploaded: boolean;
  flagship_innovation_level: string;
  flagship_uploaded_to_prbr: boolean;
  flagship_approved_by_ca: boolean;
};

export type ProjectEditResult = {
  ok: boolean;
  message: string;
};

export type PassportUploadInput = {
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
};

export type PassportUploadResult = ProjectEditResult;

export type PassportDownloadResult = {
  ok: boolean;
  message: string;
  url?: string;
  fileName?: string;
};

type EditableProjectRow = {
  id: string;
  external_id: string;
  client: string | null;
  project_name: string | null;
  status_id: string | null;
  csm_id: string | null;
  director_id: string | null;
  industry_unit_id: string | null;
  essence: string | null;
  progress: string | null;
  next_step: string | null;
  funding_status: string | null;
  funding: string | null;
  is_social: boolean;
  comment: string | null;
  is_archived: boolean;
  is_flagship: boolean;
  flagship_status_id: string | null;
  flagship_problem_description: string | null;
  flagship_solution_description: string | null;
  flagship_ai_functionality: string | null;
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
        csm_id,
        director_id,
        industry_unit_id,
        essence,
        progress,
        next_step,
        funding_status,
        funding,
        is_social,
        comment,
        is_archived,
        is_flagship,
        flagship_status_id,
        flagship_problem_description,
        flagship_solution_description,
        flagship_ai_functionality,
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
    fieldName: string,
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
  addChange("is_social", "is_social", normalized.is_social);
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
    "flagship_problem_description",
    "flagship_problem_description",
    normalized.flagship_problem_description,
  );
  addChange(
    "flagship_solution_description",
    "flagship_solution_description",
    normalized.flagship_solution_description,
  );
  addChange(
    "flagship_ai_functionality",
    "flagship_ai_functionality",
    normalized.flagship_ai_functionality,
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

export async function registerPassportUploadAction(
  projectId: string,
  input: PassportUploadInput,
): Promise<PassportUploadResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Нужно войти в систему, чтобы загрузить паспорт.",
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
      message: "У вас нет прав на загрузку паспорта проекта.",
    };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, flagship_passport_uploaded")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return {
      ok: false,
      message: "Не удалось найти проект для загрузки паспорта.",
    };
  }

  const { data: currentFiles, error: currentFilesError } = await supabase
    .from("project_files")
    .select("version_number")
    .eq("project_id", projectId)
    .eq("file_type", "passport")
    .order("version_number", { ascending: false, nullsFirst: false })
    .limit(1);

  if (currentFilesError) {
    return {
      ok: false,
      message: `Не удалось проверить текущую версию паспорта: ${getActionErrorMessage(
        currentFilesError,
      )}`,
    };
  }

  const latestVersion = currentFiles?.[0]?.version_number ?? 0;
  const nextVersion = latestVersion + 1;

  const { error: previousUpdateError } = await supabase
    .from("project_files")
    .update({ is_current: false })
    .eq("project_id", projectId)
    .eq("file_type", "passport")
    .eq("is_current", true);

  if (previousUpdateError) {
    return {
      ok: false,
      message: `Не удалось обновить предыдущую версию паспорта: ${getActionErrorMessage(
        previousUpdateError,
      )}`,
    };
  }

  const { error: fileInsertError } = await supabase.from("project_files").insert({
    project_id: projectId,
    file_type: "passport",
    file_name: input.file_name,
    storage_path: input.storage_path,
    mime_type: input.mime_type,
    size_bytes: input.size_bytes,
    uploaded_by: profile.id,
    version_number: nextVersion,
    is_current: true,
    description: "Паспорт проекта",
  });

  if (fileInsertError) {
    return {
      ok: false,
      message: `Файл загружен, но метаданные паспорта сохранить не удалось: ${getActionErrorMessage(
        fileInsertError,
      )}`,
    };
  }

  const wasUploaded = Boolean(project.flagship_passport_uploaded);
  const { error: projectUpdateError } = await supabase
    .from("projects")
    .update({ flagship_passport_uploaded: true })
    .eq("id", projectId);

  if (projectUpdateError) {
    return {
      ok: false,
      message: `Паспорт загружен, но статус проекта обновить не удалось: ${getActionErrorMessage(
        projectUpdateError,
      )}`,
    };
  }

  const { error: changeInsertError } = await supabase
    .from("project_changes")
    .insert({
      project_id: projectId,
      changed_by: profile.id,
      field_name: "flagship_passport_uploaded",
      old_value: wasUploaded ? "Паспорт загружен" : "Паспорт не загружен",
      new_value: wasUploaded ? "Паспорт обновлен" : "Паспорт загружен",
      source: "web",
    });

  if (changeInsertError) {
    return {
      ok: false,
      message: `Паспорт загружен, но историю изменений записать не удалось: ${getActionErrorMessage(
        changeInsertError,
      )}`,
    };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: wasUploaded ? "Паспорт обновлен." : "Паспорт загружен.",
  };
}

export async function getPassportDownloadUrlAction(
  projectId: string,
): Promise<PassportDownloadResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Нужно войти в систему, чтобы скачать паспорт.",
    };
  }

  const { data: passport, error: passportError } = await supabase
    .from("project_files")
    .select("file_name, storage_path")
    .eq("project_id", projectId)
    .eq("file_type", "passport")
    .eq("is_current", true)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (passportError || !passport) {
    return {
      ok: false,
      message: passportError
        ? `Не удалось прочитать метаданные паспорта: ${getActionErrorMessage(
            passportError,
          )}`
        : "Паспорт проекта пока не загружен.",
    };
  }

  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(passport.storage_path, 60, {
      download: passport.file_name,
    });

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      message: `Не удалось подготовить ссылку на скачивание паспорта: ${getActionErrorMessage(
        error,
      )}`,
    };
  }

  return {
    ok: true,
    message: "Ссылка на скачивание готова.",
    url: data.signedUrl,
    fileName: passport.file_name,
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
    csm_id: nullableId(input.csm_id),
    director_id: nullableId(input.director_id),
    industry_unit_id: nullableId(input.industry_unit_id),
    essence: nullableText(input.essence),
    progress: nullableText(input.progress),
    next_step: nullableText(input.next_step),
    funding_status: nullableText(input.funding_status),
    funding: nullableText(input.funding),
    is_social: input.is_social,
    comment: nullableText(input.comment),
    is_archived: input.is_archived,
    is_flagship: isFlagship,
    flagship_status_id: isFlagship ? nullableId(input.flagship_status_id) : null,
    flagship_problem_description: nullableText(
      input.flagship_problem_description,
    ),
    flagship_solution_description: nullableText(
      input.flagship_solution_description,
    ),
    flagship_ai_functionality: nullableText(input.flagship_ai_functionality),
    flagship_description_uploaded:
      isFlagship &&
      Boolean(input.flagship_problem_description.trim()) &&
      Boolean(input.flagship_solution_description.trim()) &&
      Boolean(input.flagship_ai_functionality.trim()),
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

function getActionErrorMessage(error: unknown) {
  if (!error) {
    return "неизвестная ошибка";
  }

  if (typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return String(error);
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
    flagshipStatusesResult,
    peopleResult,
    industryUnitsResult,
  ] = await Promise.all([
    supabase.from("project_statuses").select("id, name"),
    supabase.from("flagship_statuses").select("id, name"),
    supabase.from("people").select("id, full_name"),
    supabase.from("industry_units").select("id, name"),
  ]);

  return {
    statuses: toLabelMap(statusesResult.data ?? [], "name"),
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
