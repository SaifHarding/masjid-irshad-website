import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Returns a browser client for Lovable Cloud.
 *
 * We prefer Vite env vars, but include a safe fallback to prevent hard crashes
 * in environments where `import.meta.env` isn't injected as expected.
 */
export function getBackendClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    "https://vmracacpxlpnpsxfokty.supabase.co";

  const anonKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcmFjYWNweGxwbnBzeGZva3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Njg4NTksImV4cCI6MjA3OTE0NDg1OX0.70pyjqZghxiEXJTfYLNGoq8ELIvEIdwpSbNaAVk8XKg";

  // If BOTH are missing (shouldn't happen), surface a clear error.
  if (!url || !anonKey) {
    throw new Error(
      "Backend configuration is missing (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  cached = createClient<Database>(url, anonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cached;
}
