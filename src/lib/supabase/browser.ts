import { createBrowserClient } from "@supabase/ssr";

import { assertPublicSupabaseEnv } from "@/lib/env";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserSupabaseClient: BrowserSupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (browserSupabaseClient) {
    return browserSupabaseClient;
  }

  const { supabaseUrl, supabasePublishableKey } = assertPublicSupabaseEnv();

  browserSupabaseClient = createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
  );

  return browserSupabaseClient;
}
