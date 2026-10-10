import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * Session storage per platform (spec §9.6). Native keeps the session in AsyncStorage; web
 * leaves `storage` unset so supabase-js uses `window.localStorage` under its default key,
 * `sb-<first host label>-auth-token`. No platform reads a session from the URL: email links
 * carry codes that the app verifies explicitly.
 */
export function supabaseAuthOptions(os: string, nativeStorage: SupportedStorage) {
  return {
    storage: os === "web" ? undefined : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  };
}
