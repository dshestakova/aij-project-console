import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileReference, UserRole } from "@/types/project-registry";

export type AppProfile = ProfileReference & {
  created_at: string;
  updated_at: string;
};

export async function getCurrentProfile(): Promise<ProfileReference | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (data as ProfileReference | null) ?? null;
}

export function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "editor" || value === "viewer";
}
