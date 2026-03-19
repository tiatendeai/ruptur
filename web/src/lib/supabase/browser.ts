import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("supabase_not_configured");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl(), supabasePublishableKey());
  }

  return browserClient;
}
