import {
  type CookieOptions,
  createServerClient,
  CookieMethods,
} from "@supabase/ssr";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export function getSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: getCookieMethods(cookieStore),
    },
  );
}

export function getCookieMethods(
  cookieStore: ReadonlyRequestCookies,
): CookieMethods {
  return {
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      cookieStore.set({ name, value, ...options });
    },
    remove(name: string, options: CookieOptions) {
      cookieStore.set({ name, value: "", ...options });
    },
  };
}
