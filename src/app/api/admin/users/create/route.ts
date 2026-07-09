import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { isUserRole } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/project-registry";

type CreateUserRequest = {
  email?: string;
  display_name?: string;
  role?: string;
  temporary_password?: string;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Нужно войти в систему, чтобы создавать пользователей.", 401);
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
    return jsonError("У вас нет прав на создание пользователей.", 403);
  }

  let payload: CreateUserRequest;

  try {
    payload = (await request.json()) as CreateUserRequest;
  } catch {
    return jsonError("Не удалось прочитать данные формы.", 400);
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  const displayName = payload.display_name?.trim() || null;
  const role = payload.role;
  const temporaryPassword = payload.temporary_password?.trim()
    ? payload.temporary_password
    : generateTemporaryPassword();

  if (!isValidEmail(email)) {
    return jsonError("Укажите корректный email пользователя.", 400);
  }

  if (!role || !isUserRole(role)) {
    return jsonError("Выберите корректную роль пользователя.", 400);
  }

  if (!isStrongTemporaryPassword(temporaryPassword)) {
    return jsonError(
      "Временный пароль должен быть не короче 14 символов и содержать буквы, цифры и символы.",
      400,
    );
  }

  let adminClient: ReturnType<typeof createSupabaseAdminClient>;

  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return jsonError(
      "Не настроен серверный ключ Supabase. Добавьте SUPABASE_SERVICE_ROLE_KEY на сервере.",
      500,
    );
  }

  const { data: createdUserData, error: createUserError } =
    await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

  if (createUserError || !createdUserData.user) {
    return jsonError(getCreateUserErrorMessage(createUserError), 400);
  }

  const createdUser = createdUserData.user;
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: createdUser.id,
      email,
      display_name: displayName,
      role: role as UserRole,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return jsonError(
      "Пользователь создан в Auth, но профиль приложения сохранить не удалось. Проверьте таблицу public.profiles.",
      500,
    );
  }

  await adminClient.from("audit_log").insert({
    user_id: currentProfile.id,
    action: "create_user",
    entity_type: "profile",
    entity_id: createdUser.id,
    metadata: {
      role,
      email,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: createdUser.id,
      email,
      display_name: displayName,
      role,
    },
    temporary_password: temporaryPassword,
  });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongTemporaryPassword(value: string) {
  return (
    value.length >= 14 &&
    /[a-zA-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^a-zA-Z\d]/.test(value)
  );
}

function getCreateUserErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  if (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")
  ) {
    return "Пользователь с таким email уже существует.";
  }

  if (message.includes("password")) {
    return "Supabase отклонил временный пароль. Сгенерируйте новый пароль и попробуйте еще раз.";
  }

  return "Не удалось создать пользователя в Supabase Auth.";
}

function generateTemporaryPassword() {
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*_-+=";
  const allCharacters = lowercase + uppercase + digits + symbols;
  const requiredCharacters = [
    getRandomCharacter(lowercase),
    getRandomCharacter(uppercase),
    getRandomCharacter(digits),
    getRandomCharacter(symbols),
  ];
  const remainingCharacters = Array.from({ length: 12 }, () =>
    getRandomCharacter(allCharacters),
  );

  return shuffleCharacters([...requiredCharacters, ...remainingCharacters]).join(
    "",
  );
}

function getRandomCharacter(characters: string) {
  return characters[randomInt(characters.length)];
}

function shuffleCharacters(characters: string[]) {
  return characters
    .map((character) => ({
      character,
      sort: randomInt(1_000_000),
    }))
    .sort((first, second) => first.sort - second.sort)
    .map((item) => item.character);
}
