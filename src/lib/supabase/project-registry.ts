import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ProjectDetail,
  ProjectChangeItem,
  ProjectEditReferences,
  ProjectFileItem,
  ProjectListItem,
  ProjectRegistryData,
  ProfileReference,
  ReferenceItem,
} from "@/types/project-registry";

type ProjectListRow = {
  id: string;
  external_id: string;
  client: string | null;
  project_name: string | null;
  essence: string | null;
  is_social: boolean;
  is_flagship: boolean;
  is_archived: boolean;
  flagship_description_uploaded: boolean | null;
  flagship_passport_uploaded: boolean | null;
  flagship_innovation_level: ProjectDetail["flagship_innovation_level"];
  flagship_uploaded_to_prbr: boolean | null;
  flagship_approved_by_ca: boolean | null;
  next_step: string | null;
  updated_at: string;
  status_id: string | null;
  csm_id: string | null;
  director_id: string | null;
  industry_unit_id: string | null;
  flagship_status_id: string | null;
  status: ReferenceItem | null;
  flagship_status: ReferenceItem | null;
  csm: ProjectDetail["csm"];
  director: ProjectDetail["director"];
  industry_unit: ProjectDetail["industry_unit"];
};

type ProjectDetailRow = ProjectListRow & {
  essence: string | null;
  progress: string | null;
  funding: string | null;
  funding_status: string | null;
  comment: string | null;
  flagship_problem_description: string | null;
  flagship_solution_description: string | null;
  flagship_ai_functionality: string | null;
  flagship_client_current_state: string | null;
  flagship_current_process: string | null;
  flagship_scope: string | null;
  flagship_client_usage: string | null;
  flagship_result_users: string | null;
  flagship_tech_stack: string | null;
  flagship_available_data: string | null;
  flagship_uncertain_data: string | null;
  flagship_out_of_scope: string | null;
  flagship_competitors: string | null;
  flagship_description_uploaded: boolean | null;
  flagship_passport_uploaded: boolean | null;
  flagship_innovation_level: ProjectDetail["flagship_innovation_level"];
  flagship_uploaded_to_prbr: boolean | null;
  flagship_approved_by_ca: boolean | null;
  csm_id: string | null;
  director_id: string | null;
  industry_unit_id: string | null;
  csm: ProjectDetail["csm"];
  director: ProjectDetail["director"];
  industry_unit: ProjectDetail["industry_unit"];
};

type ProjectChangeRow = Omit<ProjectChangeItem, "profile"> & {
  profile: ProfileReference | ProfileReference[] | null;
};

type ProjectFileRow = Omit<ProjectFileItem, "profile"> & {
  profile: ProfileReference | ProfileReference[] | null;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeProjectListItem(row: ProjectListRow): ProjectListItem {
  return {
    ...row,
    flagship_description_uploaded:
      row.flagship_description_uploaded ?? false,
    flagship_passport_uploaded: row.flagship_passport_uploaded ?? false,
    flagship_uploaded_to_prbr: row.flagship_uploaded_to_prbr ?? false,
    flagship_approved_by_ca: row.flagship_approved_by_ca ?? false,
    status: normalizeRelation(row.status),
    flagship_status: normalizeRelation(row.flagship_status),
    csm: normalizeRelation(row.csm),
    director: normalizeRelation(row.director),
    industry_unit: normalizeRelation(row.industry_unit),
  };
}

function normalizeProjectDetail(row: ProjectDetailRow): ProjectDetail {
  return {
    ...normalizeProjectListItem(row),
    essence: row.essence,
    progress: row.progress,
    funding: row.funding,
    funding_status: row.funding_status,
    comment: row.comment,
    flagship_problem_description: row.flagship_problem_description,
    flagship_solution_description: row.flagship_solution_description,
    flagship_ai_functionality: row.flagship_ai_functionality,
    flagship_client_current_state: row.flagship_client_current_state,
    flagship_current_process: row.flagship_current_process,
    flagship_scope: row.flagship_scope,
    flagship_client_usage: row.flagship_client_usage,
    flagship_result_users: row.flagship_result_users,
    flagship_tech_stack: row.flagship_tech_stack,
    flagship_available_data: row.flagship_available_data,
    flagship_uncertain_data: row.flagship_uncertain_data,
    flagship_out_of_scope: row.flagship_out_of_scope,
    flagship_competitors: row.flagship_competitors,
    flagship_description_uploaded:
      row.flagship_description_uploaded ?? false,
    flagship_passport_uploaded: row.flagship_passport_uploaded ?? false,
    flagship_innovation_level: row.flagship_innovation_level,
    flagship_uploaded_to_prbr: row.flagship_uploaded_to_prbr ?? false,
    flagship_approved_by_ca: row.flagship_approved_by_ca ?? false,
    csm_id: row.csm_id,
    director_id: row.director_id,
    industry_unit_id: row.industry_unit_id,
    csm: normalizeRelation(row.csm),
    director: normalizeRelation(row.director),
    industry_unit: normalizeRelation(row.industry_unit),
  };
}

function getSupabaseErrorMessage(error?: unknown) {
  if (error) {
    console.error("Supabase project registry query failed", error);
  }

  if (isMissingSchemaMigrationError(error)) {
    return "База данных не обновлена: не применена migration для флагманских полей. Обратитесь к администратору.";
  }

  const details =
    error && typeof error === "object" && "message" in error
      ? ` Причина: ${String(error.message)}`
      : "";

  return `Не удалось загрузить данные из Supabase. Проверьте RLS, профиль пользователя и доступ к таблицам.${details}`;
}

function isMissingSchemaMigrationError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  return (
    code === "42703" ||
    code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("schema cache") && message.includes("projects"))
  );
}

export async function getProjectRegistryData(): Promise<ProjectRegistryData> {
  const supabase = await createServerSupabaseClient();

  const [
    projectsResult,
    statusesResult,
    flagshipStatusesResult,
    csmsResult,
    directorsResult,
    industryUnitsResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `
          id,
          external_id,
          client,
          project_name,
          essence,
          status_id,
          csm_id,
          director_id,
          industry_unit_id,
          is_social,
          is_flagship,
          flagship_description_uploaded,
          flagship_passport_uploaded,
          flagship_innovation_level,
          flagship_uploaded_to_prbr,
          flagship_approved_by_ca,
          flagship_status_id,
          is_archived,
          next_step,
          updated_at,
          status:project_statuses(id, name, color_key, sort_order),
          flagship_status:flagship_statuses(id, name, color_key, sort_order),
          csm:people!projects_csm_id_fkey(id, full_name, person_type, email),
          director:people!projects_director_id_fkey(id, full_name, person_type, email),
          industry_unit:industry_units(id, name, color_key, sort_order)
        `,
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_statuses")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("flagship_statuses")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("people")
      .select("id, full_name, person_type, email")
      .eq("is_active", true)
      .eq("person_type", "csm")
      .order("full_name", { ascending: true }),
    supabase
      .from("people")
      .select("id, full_name, person_type, email")
      .eq("is_active", true)
      .eq("person_type", "director")
      .order("full_name", { ascending: true }),
    supabase
      .from("industry_units")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
  ]);

  const error =
    projectsResult.error ??
    statusesResult.error ??
    flagshipStatusesResult.error ??
    csmsResult.error ??
    directorsResult.error ??
    industryUnitsResult.error;

  return {
    projects: ((projectsResult.data ?? []) as unknown as ProjectListRow[]).map(
      normalizeProjectListItem,
    ),
    statuses: (statusesResult.data ?? []) as ReferenceItem[],
    flagshipStatuses: (flagshipStatusesResult.data ?? []) as ReferenceItem[],
    csms: (csmsResult.data ?? []) as ProjectEditReferences["csms"],
    directors: (directorsResult.data ??
      []) as ProjectEditReferences["directors"],
    industryUnits: (industryUnitsResult.data ??
      []) as ProjectEditReferences["industryUnits"],
    errorMessage: error ? getSupabaseErrorMessage(error) : null,
  };
}

export async function getProjectDetail(
  id: string,
): Promise<{ project: ProjectDetail | null; errorMessage: string | null }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
        id,
        external_id,
        client,
        project_name,
        status_id,
        is_social,
        is_flagship,
        flagship_status_id,
        is_archived,
        essence,
        progress,
        next_step,
        funding,
        funding_status,
        comment,
        flagship_problem_description,
        flagship_solution_description,
        flagship_ai_functionality,
        flagship_client_current_state,
        flagship_current_process,
        flagship_scope,
        flagship_client_usage,
        flagship_result_users,
        flagship_tech_stack,
        flagship_available_data,
        flagship_uncertain_data,
        flagship_out_of_scope,
        flagship_competitors,
        flagship_description_uploaded,
        flagship_passport_uploaded,
        flagship_innovation_level,
        flagship_uploaded_to_prbr,
        flagship_approved_by_ca,
        csm_id,
        director_id,
        industry_unit_id,
        updated_at,
        status:project_statuses(id, name, color_key, sort_order),
        flagship_status:flagship_statuses(id, name, color_key, sort_order),
        csm:people!projects_csm_id_fkey(id, full_name, person_type, email),
        director:people!projects_director_id_fkey(id, full_name, person_type, email),
        industry_unit:industry_units(id, name, color_key, sort_order)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  return {
    project: data
      ? normalizeProjectDetail(data as unknown as ProjectDetailRow)
      : null,
    errorMessage: error ? getSupabaseErrorMessage(error) : null,
  };
}

export async function getProjectDetailPageData(id: string): Promise<{
  project: ProjectDetail | null;
  references: ProjectEditReferences;
  changes: ProjectChangeItem[];
  currentProfile: ProfileReference | null;
  currentPassport: ProjectFileItem | null;
  errorMessage: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    projectResult,
    statusesResult,
    flagshipStatusesResult,
    csmsResult,
    directorsResult,
    industryUnitsResult,
    changesResult,
    passportResult,
    profileResult,
  ] = await Promise.all([
    getProjectDetail(id),
    supabase
      .from("project_statuses")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("flagship_statuses")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("people")
      .select("id, full_name, person_type, email")
      .eq("is_active", true)
      .eq("person_type", "csm")
      .order("full_name", { ascending: true }),
    supabase
      .from("people")
      .select("id, full_name, person_type, email")
      .eq("is_active", true)
      .eq("person_type", "director")
      .order("full_name", { ascending: true }),
    supabase
      .from("industry_units")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("project_changes")
      .select(
        `
          id,
          changed_by,
          changed_at,
          field_name,
          old_value,
          new_value,
          source,
          profile:profiles(id, email, display_name, role)
        `,
      )
      .eq("project_id", id)
      .order("changed_at", { ascending: false })
      .limit(30),
    supabase
      .from("project_files")
      .select(
        `
          id,
          project_id,
          file_name,
          storage_path,
          mime_type,
          size_bytes,
          uploaded_by,
          uploaded_at,
          file_type,
          version_number,
          is_current,
          description,
          profile:profiles!project_files_uploaded_by_fkey(id, email, display_name, role)
        `,
      )
      .eq("project_id", id)
      .eq("file_type", "passport")
      .eq("is_current", true)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    user
      ? supabase
          .from("profiles")
          .select("id, email, display_name, role")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const referenceError =
    statusesResult.error ??
    flagshipStatusesResult.error ??
    csmsResult.error ??
    directorsResult.error ??
    industryUnitsResult.error ??
    changesResult.error ??
    passportResult.error ??
    profileResult.error;

  return {
    project: projectResult.project,
    references: {
      statuses: (statusesResult.data ?? []) as ReferenceItem[],
      flagshipStatuses: (flagshipStatusesResult.data ?? []) as ReferenceItem[],
      csms: (csmsResult.data ?? []) as ProjectEditReferences["csms"],
      directors: (directorsResult.data ??
        []) as ProjectEditReferences["directors"],
      industryUnits: (industryUnitsResult.data ??
        []) as ProjectEditReferences["industryUnits"],
    },
    changes: ((changesResult.data ?? []) as unknown as ProjectChangeRow[]).map(
      (change) => ({
        ...change,
        profile: normalizeRelation(change.profile),
      }),
    ),
    currentPassport: passportResult.data
      ? {
          ...((passportResult.data as unknown as ProjectFileRow) ?? null),
          profile: normalizeRelation(
            (passportResult.data as unknown as ProjectFileRow).profile,
          ),
        }
      : null,
    currentProfile: (profileResult.data as ProfileReference | null) ?? null,
    errorMessage:
      projectResult.errorMessage || referenceError
        ? projectResult.errorMessage ?? getSupabaseErrorMessage(referenceError)
        : null,
  };
}
