import { redirect } from "next/navigation";

import { UserHeader } from "@/components/auth/user-header";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UsersRoleList } from "@/components/admin/users-role-list";
import { getCurrentProfile, type AppProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/users");
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
                Управление пользователями доступно только администраторам. Если
                вам нужен доступ, попросите администратора изменить вашу роль.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at, updated_at")
    .order("created_at", { ascending: true });

  const users = (data ?? []) as AppProfile[];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <UserHeader
          activePath="/admin/users"
          email={user.email ?? "Пользователь"}
          role={currentProfile.role}
        />

        <section className="flex flex-col gap-5 py-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-slate-950">
                Пользователи
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Создавайте пользователей с временным паролем и управляйте
                ролями уже созданных профилей.
              </p>
            </div>
            <div className="self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-auto">
              Всего профилей:{" "}
              <span className="font-semibold text-slate-950">
                {users.length}
              </span>
            </div>
          </div>

          {error ? (
            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Не удалось загрузить пользователей. Проверьте RLS и права
              администратора.
            </section>
          ) : (
            <>
              <CreateUserForm />
              {users.length === 0 ? (
                <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                  <p className="text-base font-semibold text-slate-950">
                    Профили пользователей пока не найдены
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Создайте первого пользователя через форму выше. Его профиль
                    появится в списке после сохранения.
                  </p>
                </section>
              ) : (
                <UsersRoleList users={users} />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
