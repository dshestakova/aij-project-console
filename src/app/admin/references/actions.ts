"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ColorKey } from "@/types/project-registry";

export type ReferenceActionResult = {
  ok: boolean;
  message: string;
};

export type PersonInput = {
  id?: string;
  full_name: string;
  person_type: "csm" | "director";
  email?: string;
  is_active: boolean;
};

export type ReferenceInput = {
  id?: string;
  name: string;
  color_key?: ColorKey | "";
  sort_order?: string | number;
  is_active: boolean;
};

export type AssignmentInput = {
  id?: string;
  director_id: string;
  industry_unit_id: string;
  csm_id: string;
  is_active: boolean;
  comment?: string;
  sort_order?: string | number;
};

type AdminContext = {
  profileId: string;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
};

type AdminContextResult =
  | (AdminContext & { ok: true })
  | { ok: false; message: string };

export async function savePersonAction(
  input: PersonInput,
): Promise<ReferenceActionResult> {
  const context = await getAdminContext();

  if (!context.ok) {
    return context;
  }

  const fullName = input.full_name.trim();

  if (!fullName) {
    return { ok: false, message: "Укажите ФИО." };
  }

  if (input.person_type !== "csm" && input.person_type !== "director") {
    return { ok: false, message: "Выберите роль человека." };
  }

  const payload = {
    full_name: fullName,
    person_type: input.person_type,
    email: nullableText(input.email),
    is_active: input.is_active,
  };
  const query = input.id
    ? context.supabase.from("people").update(payload).eq("id", input.id)
    : context.supabase.from("people").insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: "Не удалось сохранить человека." };
  }

  revalidateReferencePaths();
  return { ok: true, message: "Человек сохранен." };
}

export async function saveIndustryUnitAction(
  input: ReferenceInput,
): Promise<ReferenceActionResult> {
  return saveNamedReference({
    input,
    message: "Отраслевое управление сохранено.",
    table: "industry_units",
    withColor: true,
  });
}

export async function saveProjectStatusAction(
  input: ReferenceInput,
): Promise<ReferenceActionResult> {
  return saveNamedReference({
    input,
    message: "Статус проекта сохранен.",
    table: "project_statuses",
    withColor: true,
  });
}

export async function saveFlagshipStatusAction(
  input: ReferenceInput,
): Promise<ReferenceActionResult> {
  return saveNamedReference({
    input,
    message: "Статус флагмана сохранен.",
    table: "flagship_statuses",
    withColor: true,
  });
}

export async function saveAssignmentAction(
  input: AssignmentInput,
): Promise<ReferenceActionResult> {
  const context = await getAdminContext();

  if (!context.ok) {
    return context;
  }

  if (!input.director_id || !input.industry_unit_id || !input.csm_id) {
    return {
      ok: false,
      message: "Выберите директора, отраслевое управление и CSM.",
    };
  }

  const [directorResult, industryUnitResult, csmResult] = await Promise.all([
    context.supabase
      .from("people")
      .select("id, full_name")
      .eq("id", input.director_id)
      .eq("person_type", "director")
      .maybeSingle(),
    context.supabase
      .from("industry_units")
      .select("id, name")
      .eq("id", input.industry_unit_id)
      .maybeSingle(),
    context.supabase
      .from("people")
      .select("id, full_name")
      .eq("id", input.csm_id)
      .eq("person_type", "csm")
      .maybeSingle(),
  ]);

  if (!directorResult.data || !industryUnitResult.data || !csmResult.data) {
    return {
      ok: false,
      message: "Не удалось найти выбранные значения справочников.",
    };
  }

  const payload = {
    director_id: directorResult.data.id,
    director_name: directorResult.data.full_name,
    industry_unit_id: industryUnitResult.data.id,
    industry_unit_name: industryUnitResult.data.name,
    csm_id: csmResult.data.id,
    csm_name: csmResult.data.full_name,
    is_active: input.is_active,
    comment: nullableText(input.comment),
    sort_order: nullableNumber(input.sort_order),
    updated_by: context.profileId,
  };
  const query = input.id
    ? context.supabase
        .from("director_csm_assignments")
        .update(payload)
        .eq("id", input.id)
    : context.supabase.from("director_csm_assignments").insert({
        ...payload,
        external_id: `manual-${randomUUID()}`,
      });
  const { error } = await query;

  if (error) {
    return { ok: false, message: "Не удалось сохранить закрепление." };
  }

  revalidateReferencePaths();
  return { ok: true, message: "Закрепление сохранено." };
}

async function saveNamedReference({
  input,
  message,
  table,
  withColor,
}: {
  input: ReferenceInput;
  message: string;
  table: "industry_units" | "project_statuses" | "flagship_statuses";
  withColor: boolean;
}): Promise<ReferenceActionResult> {
  const context = await getAdminContext();

  if (!context.ok) {
    return context;
  }

  const name = input.name.trim();

  if (!name) {
    return { ok: false, message: "Укажите название." };
  }

  const payload = {
    name,
    color_key: withColor ? input.color_key?.trim() || "gray" : null,
    sort_order: nullableNumber(input.sort_order),
    is_active: input.is_active,
  };
  const query = input.id
    ? context.supabase.from(table).update(payload).eq("id", input.id)
    : context.supabase.from(table).insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: "Не удалось сохранить справочник." };
  }

  revalidateReferencePaths();
  return { ok: true, message };
}

async function getAdminContext(): Promise<AdminContextResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Нужно войти в систему." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    return { ok: false, message: "У вас нет прав на управление справочниками." };
  }

  return { ok: true, profileId: profile.id, supabase };
}

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function nullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function revalidateReferencePaths() {
  revalidatePath("/admin/references");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}
