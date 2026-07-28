import Link from "next/link";
import { redirect } from "next/navigation";

import { UserHeader } from "@/components/auth/user-header";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { getCurrentProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PersonReference,
  ProjectEditReferences,
  ReferenceItem,
} from "@/types/project-registry";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/projects/new");
  }

  const currentProfile = await getCurrentProfile();
  const canCreate =
    currentProfile?.role === "admin" || currentProfile?.role === "editor";

  if (!canCreate) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <UserHeader
            activePath="/projects"
            email={user.email ?? "Пользователь"}
            role={currentProfile?.role}
          />

          <section className="flex flex-col gap-5 py-6">
            <Link
              className="w-fit text-sm font-medium text-slate-600 transition hover:text-slate-950"
              href="/projects"
            >
              Назад к проектам
            </Link>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <h2 className="text-lg font-semibold">Доступ ограничен</h2>
              <p className="mt-2 text-sm leading-6">
                Создание проектов доступно только администраторам и редакторам.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { references, errorMessage } = await getCreateProjectReferences();

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/projects"
          email={user.email ?? "Пользователь"}
          role={currentProfile.role}
        />

        <section className="flex flex-col gap-5 py-6">
          <Link
            className="w-fit text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href="/projects"
          >
            Назад к проектам
          </Link>

          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-slate-950">
              Добавить проект
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Создайте карточку проекта вручную. После сохранения откроется
              страница проекта, где можно будет загрузить паспорт.
            </p>
          </div>

          {errorMessage ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {errorMessage}
            </section>
          ) : (
            <ProjectCreateForm
              draftOwnerKey={currentProfile.id ?? user.email ?? "anonymous"}
              references={references}
            />
          )}
        </section>
      </div>
    </main>
  );
}

async function getCreateProjectReferences(): Promise<{
  references: ProjectEditReferences;
  errorMessage: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const [
    statusesResult,
    flagshipStatusesResult,
    csmsResult,
    directorsResult,
    industryUnitsResult,
  ] = await Promise.all([
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
    statusesResult.error ??
    flagshipStatusesResult.error ??
    csmsResult.error ??
    directorsResult.error ??
    industryUnitsResult.error;

  return {
    references: {
      statuses: (statusesResult.data ?? []) as ReferenceItem[],
      flagshipStatuses: (flagshipStatusesResult.data ?? []) as ReferenceItem[],
      csms: (csmsResult.data ?? []) as PersonReference[],
      directors: (directorsResult.data ?? []) as PersonReference[],
      industryUnits: (industryUnitsResult.data ?? []) as ReferenceItem[],
    },
    errorMessage: error
      ? "Не удалось загрузить справочники для создания проекта. Проверьте RLS и доступ к справочникам."
      : null,
  };
}
