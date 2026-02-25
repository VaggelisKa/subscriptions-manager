"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./supabase-config";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabasePublicEnv();

  return createBrowserClient<Database>(url, publishableKey);
}

export const supabaseClient = createSupabaseBrowserClient();
