import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import { afterEach, expect, test, vi } from "vitest";
import { supabaseAuthOptions } from "./supabase-auth-options";

const nativeStorage: SupportedStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

/** A browser as far as supabase-js can tell: `window`, `document` and a working `localStorage`. */
function stubBrowser() {
  const items = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
  vi.stubGlobal("window", { addEventListener() {}, removeEventListener() {}, localStorage });
  vi.stubGlobal("document", { visibilityState: "visible" });
  vi.stubGlobal("localStorage", localStorage);
  return localStorage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("native platforms keep the session in the native storage", () => {
  for (const os of ["ios", "android"]) {
    expect(supabaseAuthOptions(os, nativeStorage)).toEqual({
      storage: nativeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
  }
});

test("web leaves storage to supabase-js and never reads a session from the URL", () => {
  expect(supabaseAuthOptions("web", nativeStorage)).toEqual({
    storage: undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  });
});

test("on web the session lives in localStorage under sb-<host label>-auth-token", async () => {
  const localStorage = stubBrowser();
  // The parity suite's Supabase URL (e2e/parity/support/auth.ts writes this key).
  const client = createClient("http://127.0.0.1:54399", "publishable-key", {
    auth: { ...supabaseAuthOptions("web", nativeStorage), autoRefreshToken: false },
  });
  const auth = client.auth as unknown as { storage: unknown; storageKey: string };
  expect(auth.storage).toBe(localStorage);
  expect(auth.storageKey).toBe("sb-127-auth-token");

  const session = {
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "user-1", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
  };
  localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
  const { data } = await client.auth.getSession();
  expect(data.session?.access_token).toBe("access");
  expect(data.session?.user.id).toBe("user-1");
});
