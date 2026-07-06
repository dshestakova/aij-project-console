import { createClient } from "@supabase/supabase-js";

import { assertPublicSupabaseEnv } from "@/lib/env";

export function createServerSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = assertPublicSupabaseEnv();

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
    },
  });
}
