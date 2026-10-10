import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * Session storage per platform (spec §9.6). Native keeps the session in AsyncStorage; web
 * leaves `storage` unset so supabase-js uses `window.localStorage` under its default key,
 * `sb-<first host label>-auth-token`. supabase-js never reads a session from the URL
 * (`detectSessionInUrl: false`): the password-reset link is handled explicitly by the auth
 * provider, which also removes its tokens from the address bar on web.
 */
export function supabaseAuthOptions(os: string, nativeStorage: SupportedStorage) {
  return {
    storage: os === "web" ? undefined : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  };
}
