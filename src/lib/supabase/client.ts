"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = getClientEnv();

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
