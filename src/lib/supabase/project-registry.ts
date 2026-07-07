import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ProjectDetail,
  ProjectListItem,
  ProjectRegistryData,
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
  csm: ProjectDetail["csm"];
  director: ProjectDetail["director"];
  industry_unit: ProjectDetail["industry_unit"];
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
          is_flagship,
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
        is_flagship,
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
