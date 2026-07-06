import { createClient } from "@supabase/supabase-js";

import { assertPublicSupabaseEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = assertPublicSupabaseEnv();

  return createClient(supabaseUrl, supabasePublishableKey);
}
