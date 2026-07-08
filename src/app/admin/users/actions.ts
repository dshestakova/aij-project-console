"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUserRole } from "@/lib/supabase/profiles";
import type { UserRole } from "@/types/project-registry";

export type UpdateUserRoleResult = {
  ok: boolean;
  message: string;
};

export async function updateUserRoleAction(
  profileId: string,
  nextRole: UserRole,
): Promise<UpdateUserRoleResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Нужно войти в систему, чтобы управлять ролями.",
    };
  }

  if (!isUserRole(nextRole)) {
    return {
      ok: false,
      message: "Выбрана неизвестная роль.",
    };
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    currentProfileError ||
    !currentProfile ||
    currentProfile.role !== "admin"
  ) {
    return {
      ok: false,
      message: "У вас нет прав на управление пользователями.",
    };
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();

  if (targetProfileError || !targetProfile) {
    return {
      ok: false,
      message: "Профиль пользователя не найден.",
    };
  }

  if (targetProfile.role === nextRole) {
    return {
      ok: true,
      message: "Роль уже сохранена.",
    };
  }

  if (targetProfile.role === "admin" && nextRole !== "admin") {
    const { count, error: adminCountError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (adminCountError) {
      return {
        ok: false,
        message: "Не удалось проверить количество администраторов.",
      };
    }

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        message: "Нельзя убрать роль у последнего администратора.",
      };
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", profileId);

  if (updateError) {
    return {
      ok: false,
      message: "Не удалось сохранить роль. Проверьте RLS и права доступа.",
    };
  }

  revalidatePath("/admin/users");

  return {
    ok: true,
    message: "Роль пользователя сохранена.",
  };
}
