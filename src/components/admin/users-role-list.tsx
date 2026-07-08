"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateUserRoleAction } from "@/app/admin/users/actions";
import type { AppProfile } from "@/lib/supabase/profiles";
import type { UserRole } from "@/types/project-registry";

type UsersRoleListProps = {
  users: AppProfile[];
};

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Администратор" },
  { value: "editor", label: "Редактор" },
  { value: "viewer", label: "Наблюдатель" },
];

const roleLabels: Record<UserRole, string> = {
  admin: "Администратор",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

export function UsersRoleList({ users }: UsersRoleListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>(
    () => Object.fromEntries(users.map((user) => [user.id, user.role])),
  );
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  function handleRoleChange(profileId: string, role: UserRole) {
    setSelectedRoles((current) => ({
      ...current,
      [profileId]: role,
    }));
  }

  function handleSave(profileId: string) {
    const role = selectedRoles[profileId];

    setMessage(null);
    startTransition(async () => {
      const result = await updateUserRoleAction(profileId, role);

      setMessage({
        ok: result.ok,
        text: result.message,
      });

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-4">
      {message ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-3">
        {users.map((user) => {
          const selectedRole = selectedRoles[user.id] ?? user.role;
          const hasChanges = selectedRole !== user.role;

          return (
            <article
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={user.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">
                    {user.email || "Email не указан"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {user.display_name || "Имя не указано"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-md bg-slate-100 px-2 py-1">
                      Сейчас: {roleLabels[user.role]}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1">
                      Создан: {formatDateTime(user.created_at)}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1">
                      Обновлен: {formatDateTime(user.updated_at)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="block min-w-48">
                    <span className="sr-only">Роль пользователя</span>
                    <select
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                      disabled={isPending}
                      onChange={(event) =>
                        handleRoleChange(user.id, event.target.value as UserRole)
                      }
                      value={selectedRole}
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isPending || !hasChanges}
                    onClick={() => handleSave(user.id)}
                    type="button"
                  >
                    {isPending ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
