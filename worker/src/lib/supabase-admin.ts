import { createClient } from "@supabase/supabase-js";

import { getWorkerEnv } from "@/env";

export function createWorkerSupabaseAdmin() {
  const env = getWorkerEnv();

  if (!env.supabaseUrl || !env.serviceRoleKey) {
    throw new Error("Worker env is missing Supabase credentials.");
  }

  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
