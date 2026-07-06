const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const publicEnv = {
  supabaseUrl: publicSupabaseUrl ?? "",
  supabasePublishableKey: publicSupabasePublishableKey ?? "",
};

export const publicEnvStatus = {
  hasSupabaseUrl: Boolean(publicSupabaseUrl),
  hasSupabasePublishableKey: Boolean(publicSupabasePublishableKey),
  isSupabaseConfigured: Boolean(
    publicSupabaseUrl && publicSupabasePublishableKey,
  ),
};

export function assertPublicSupabaseEnv() {
  if (!publicSupabaseUrl || !publicSupabasePublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    supabaseUrl: publicSupabaseUrl,
    supabasePublishableKey: publicSupabasePublishableKey,
  };
}
