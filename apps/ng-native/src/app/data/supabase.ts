import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "@subscriptions-manager/shared";
import { optional } from "@ng-native/expo";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False when the `.env` is missing; the login screen says so instead of failing on sign-in. */
export const supabaseConfigured = Boolean(url && key);

// Reached through `require` inside `optional()` rather than imported: React Native's JavaScript
// is Flow, which Node cannot parse, and the tests import this module through `Auth`. Metro still
// resolves the string literals at build time, so both are bundled; in Node they are null.
const asyncStorage = optional(
  () =>
    (require("@react-native-async-storage/async-storage") as { default: SupportedStorage })
      .default,
);
const reactNative = optional(() => require("react-native") as typeof import("react-native"));

/**
 * The same client as apps/native: supabase-js is plain JavaScript with no React in it, so it
 * runs unchanged. The session is persisted in AsyncStorage and refreshed while the app is active.
 */
export const supabase = createClient<Database>(
  url ?? "https://unconfigured.supabase.co",
  key ?? "unconfigured",
  {
    auth: {
      ...(asyncStorage ? { storage: asyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

reactNative?.AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
