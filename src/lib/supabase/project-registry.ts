import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ProjectDetail,
  ProjectChangeItem,
  ProjectEditReferences,
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
  is_flagship: boolean;
  is_archived: boolean;
  next_step: string | null;
  updated_at: string;
  cluster_id: string | null;
  status_id: string | null;
  flagship_status_id: string | null;
  cluster: ReferenceItem | null;
  status: ReferenceItem | null;
  flagship_status: ReferenceItem | null;
};

type ProjectDetailRow = ProjectListRow & {
  essence: string | null;
  progress: string | null;
  funding: string | null;
  funding_status: string | null;
  comment: string | null;
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

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeProjectListItem(row: ProjectListRow): ProjectListItem {
  return {
    ...row,
    cluster: normalizeRelation(row.cluster),
    status: normalizeRelation(row.status),
    flagship_status: normalizeRelation(row.flagship_status),
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

function getSupabaseErrorMessage() {
  return "Не удалось загрузить данные из Supabase. Проверьте RLS, профиль пользователя и доступ к таблицам.";
}

export async function getProjectRegistryData(): Promise<ProjectRegistryData> {
  const supabase = await createServerSupabaseClient();

  const [projectsResult, statusesResult, clustersResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `
          id,
          external_id,
          client,
          project_name,
          cluster_id,
          status_id,
          is_flagship,
          flagship_status_id,
          is_archived,
          next_step,
          updated_at,
          cluster:clusters(id, name, color_key, sort_order),
          status:project_statuses(id, name, color_key, sort_order),
          flagship_status:flagship_statuses(id, name, color_key, sort_order)
        `,
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_statuses")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("clusters")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const error =
    projectsResult.error ?? statusesResult.error ?? clustersResult.error;

  return {
    projects: ((projectsResult.data ?? []) as unknown as ProjectListRow[]).map(
      normalizeProjectListItem,
    ),
    statuses: (statusesResult.data ?? []) as ReferenceItem[],
    clusters: (clustersResult.data ?? []) as ReferenceItem[],
    errorMessage: error ? getSupabaseErrorMessage() : null,
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
        cluster_id,
        status_id,
        is_flagship,
        flagship_status_id,
        is_archived,
        essence,
        progress,
        next_step,
        funding,
        funding_status,
        comment,
        flagship_description_uploaded,
        flagship_passport_uploaded,
        flagship_innovation_level,
        flagship_uploaded_to_prbr,
        flagship_approved_by_ca,
        csm_id,
        director_id,
        industry_unit_id,
        updated_at,
        cluster:clusters(id, name, color_key, sort_order),
        status:project_statuses(id, name, color_key, sort_order),
        flagship_status:flagship_statuses(id, name, color_key, sort_order),
        csm:people!projects_csm_id_fkey(id, full_name, person_type, email),
        director:people!projects_director_id_fkey(id, full_name, person_type, email),
        industry_unit:industry_units(id, name)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  return {
    project: data
      ? normalizeProjectDetail(data as unknown as ProjectDetailRow)
      : null,
    errorMessage: error ? getSupabaseErrorMessage() : null,
  };
}

export async function getProjectDetailPageData(id: string): Promise<{
  project: ProjectDetail | null;
  references: ProjectEditReferences;
  changes: ProjectChangeItem[];
  currentProfile: ProfileReference | null;
  errorMessage: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    projectResult,
    statusesResult,
    clustersResult,
    flagshipStatusesResult,
    csmsResult,
    directorsResult,
    industryUnitsResult,
    changesResult,
    profileResult,
  ] = await Promise.all([
    getProjectDetail(id),
    supabase
      .from("project_statuses")
      .select("id, name, color_key, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("clusters")
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
      .select("id, name")
      .eq("is_active", true)
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
    clustersResult.error ??
    flagshipStatusesResult.error ??
    csmsResult.error ??
    directorsResult.error ??
    industryUnitsResult.error ??
    changesResult.error ??
    profileResult.error;

  return {
    project: projectResult.project,
    references: {
      statuses: (statusesResult.data ?? []) as ReferenceItem[],
      clusters: (clustersResult.data ?? []) as ReferenceItem[],
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
    currentProfile: (profileResult.data as ProfileReference | null) ?? null,
    errorMessage:
      projectResult.errorMessage || referenceError
        ? getSupabaseErrorMessage()
        : null,
  };
}
