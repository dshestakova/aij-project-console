import { createClient } from "@supabase/supabase-js";

import { assertPublicSupabaseEnv } from "@/lib/env";

type BrowserSupabaseClient = ReturnType<typeof createClient>;

let browserSupabaseClient: BrowserSupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (browserSupabaseClient) {
    return browserSupabaseClient;
  }

  const { supabaseUrl, supabasePublishableKey } = assertPublicSupabaseEnv();

  browserSupabaseClient = createClient(supabaseUrl, supabasePublishableKey);

  return browserSupabaseClient;
}
