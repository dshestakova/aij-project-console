import { redirect } from "next/navigation";

import {
  AdminReferencesPanel,
  type AdminAssignmentReference,
  type AdminNamedReference,
  type AdminPersonReference,
} from "@/components/admin/references/admin-references-panel";
import { UserHeader } from "@/components/auth/user-header";
import { getCurrentProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ColorKey } from "@/types/project-registry";

export const dynamic = "force-dynamic";

type PersonRow = {
  id: string;
  full_name: string;
  person_type: "csm" | "director";
  email: string | null;
  is_active: boolean | null;
};

type NamedReferenceRow = {
  id: string;
  name: string;
  color_key: ColorKey | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type AssignmentRow = {
  id: string;
  external_id: string;
  director_id: string | null;
  director_name: string | null;
  industry_unit_id: string | null;
  industry_unit_name: string | null;
  csm_id: string | null;
  csm_name: string | null;
  is_active: boolean | null;
  comment: string | null;
  sort_order: number | null;
};

type ProjectCountRow = {
  id: string;
  status_id: string | null;
  flagship_status_id: string | null;
  industry_unit_id: string | null;
  csm_id: string | null;
  director_id: string | null;
  is_archived: boolean | null;
};

export default async function AdminReferencesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/references");
  }

  const currentProfile = await getCurrentProfile();

  if (currentProfile?.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <UserHeader
            email={user.email ?? "Пользователь"}
            role={currentProfile?.role}
          />

          <section className="py-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <h2 className="text-lg font-semibold">Доступ ограничен</h2>
              <p className="mt-2 text-sm leading-6">
                Управление справочниками доступно только администраторам. Если
                вам нужен доступ, попросите администратора изменить вашу роль.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const [
    peopleResult,
    industryUnitsResult,
    projectStatusesResult,
    flagshipStatusesResult,
    assignmentsResult,
    projectsResult,
  ] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, person_type, email, is_active")
      .order("full_name", { ascending: true }),
    supabase
      .from("industry_units")
      .select("id, name, color_key, sort_order, is_active")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("project_statuses")
      .select("id, name, color_key, sort_order, is_active")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("flagship_statuses")
      .select("id, name, color_key, sort_order, is_active")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("director_csm_assignments")
      .select(
        `
          id,
          external_id,
          director_id,
          director_name,
          industry_unit_id,
          industry_unit_name,
          csm_id,
          csm_name,
          is_active,
          comment,
          sort_order
        `,
      )
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("industry_unit_name", { ascending: true }),
    supabase
      .from("projects")
      .select(
        "id, status_id, flagship_status_id, industry_unit_id, csm_id, director_id, is_archived",
      ),
  ]);

  const error =
    peopleResult.error ??
    industryUnitsResult.error ??
    projectStatusesResult.error ??
    flagshipStatusesResult.error ??
    assignmentsResult.error ??
    projectsResult.error;

  const activeProjects = ((projectsResult.data ?? []) as ProjectCountRow[])
    .filter((project) => project.is_archived !== true);
  const people = mapPeople(
    (peopleResult.data ?? []) as PersonRow[],
    activeProjects,
  );
  const industryUnits = mapNamedReferences(
    (industryUnitsResult.data ?? []) as NamedReferenceRow[],
    activeProjects,
    "industry_unit_id",
  );
  const projectStatuses = mapNamedReferences(
    (projectStatusesResult.data ?? []) as NamedReferenceRow[],
    activeProjects,
    "status_id",
  );
  const flagshipStatuses = mapNamedReferences(
    (flagshipStatusesResult.data ?? []) as NamedReferenceRow[],
    activeProjects,
    "flagship_status_id",
  );
  const assignments = mapAssignments(
    (assignmentsResult.data ?? []) as AssignmentRow[],
    activeProjects,
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/admin/references"
          email={user.email ?? "Пользователь"}
          role={currentProfile.role}
        />

        <section className="flex flex-col gap-5 py-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-slate-950">
                Справочники
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Управление людьми, статусами, отраслевыми управлениями и
                закреплениями. Удаление не используется: старые значения можно
                выключить.
              </p>
            </div>
            <div className="self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-auto">
              Активных проектов:{" "}
              <span className="font-semibold text-slate-950">
                {activeProjects.length}
              </span>
            </div>
          </div>

          {error ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Не удалось загрузить справочники. Проверьте RLS и применённые
              миграции.
            </section>
          ) : (
            <AdminReferencesPanel
              assignments={assignments}
              flagshipStatuses={flagshipStatuses}
              industryUnits={industryUnits}
              people={people}
              projectStatuses={projectStatuses}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function mapPeople(
  rows: PersonRow[],
  activeProjects: ProjectCountRow[],
): AdminPersonReference[] {
  return rows.map((person) => ({
    id: person.id,
    full_name: person.full_name,
    person_type: person.person_type,
    email: person.email,
    is_active: person.is_active !== false,
    project_count: activeProjects.filter(
      (project) =>
        project.csm_id === person.id || project.director_id === person.id,
    ).length,
  }));
}

function mapNamedReferences(
  rows: NamedReferenceRow[],
  activeProjects: ProjectCountRow[],
  projectKey: "status_id" | "flagship_status_id" | "industry_unit_id",
): AdminNamedReference[] {
  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    color_key: item.color_key,
    sort_order: item.sort_order,
    is_active: item.is_active !== false,
    project_count: activeProjects.filter(
      (project) => project[projectKey] === item.id,
    ).length,
  }));
}

function mapAssignments(
  rows: AssignmentRow[],
  activeProjects: ProjectCountRow[],
): AdminAssignmentReference[] {
  return rows
    .filter(
      (assignment) =>
        assignment.director_id &&
        assignment.industry_unit_id &&
        assignment.csm_id,
    )
    .map((assignment) => ({
      id: assignment.id,
      external_id: assignment.external_id,
      director_id: assignment.director_id ?? "",
      director_name: assignment.director_name ?? "Без директора",
      industry_unit_id: assignment.industry_unit_id ?? "",
      industry_unit_name:
        assignment.industry_unit_name ?? "Без отраслевого управления",
      csm_id: assignment.csm_id ?? "",
      csm_name: assignment.csm_name ?? "Без CSM",
      is_active: assignment.is_active !== false,
      comment: assignment.comment,
      sort_order: assignment.sort_order,
      project_count: activeProjects.filter(
        (project) =>
          project.director_id === assignment.director_id &&
          project.industry_unit_id === assignment.industry_unit_id &&
          project.csm_id === assignment.csm_id,
      ).length,
    }));
}
