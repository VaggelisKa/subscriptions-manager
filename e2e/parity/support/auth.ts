import fs from "node:fs";
import path from "node:path";
import { createClient, type Session } from "@supabase/supabase-js";
import { createChunks, DEFAULT_COOKIE_OPTIONS, stringToBase64URL } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";
import {
  AUTH_DIR,
  BASE_URL,
  FIXED_TIME,
  PASSWORD,
  PROXY_URL,
  SUPABASE_URL,
  TARGET,
  publishableKey,
  type FixtureUser,
  type UserKey,
  USERS,
} from "./env";

/** Password sign-in against the local stack (no cookies, no persistence). */
export async function signIn(user: FixtureUser): Promise<Session> {
  const client = createClient(SUPABASE_URL, publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email: user.email, password: PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${user.email}: ${error?.message}`);
  return data.session;
}

/**
 * GoTrue allows 30 sign-ins per 5 minutes per IP, so globalSetup signs every fixture user in
 * once and the tests share those sessions. Nothing refreshes them (see `pinExpiry`) and only
 * the sign-out flow, with its own user, ends one.
 */
export async function createSessions() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  for (const [key, user] of Object.entries(USERS)) {
    const file = path.join(AUTH_DIR, `${key}.json`);
    // Back-to-back runs reuse a session that's still good for a run (real clock).
    if (fs.existsSync(file) && (await stillValid(file))) continue;
    fs.writeFileSync(file, JSON.stringify(await signIn(user)));
  }
}

/** A cached session that can't be read or checked counts as stale (it's signed in again). */
async function stillValid(file: string) {
  try {
    const session: Session = JSON.parse(fs.readFileSync(file, "utf8"));
    if ((session.expires_at ?? 0) * 1000 - Date.now() < 30 * 60_000) return false;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: publishableKey(), authorization: `Bearer ${session.access_token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function cachedSession(key: UserKey): Session {
  return JSON.parse(fs.readFileSync(path.join(AUTH_DIR, `${key}.json`), "utf8"));
}

/**
 * The browser runs on the fixed clock (and so does the Next server), while GoTrue issues
 * tokens on the real one. supabase-js decides whether to refresh from the session's
 * `expires_at`, so it's moved past the fixed time; otherwise every page load would refresh
 * (and rotate) the shared session. GoTrue still validates the JWT itself on the real clock
 * (1 h), which covers a run.
 */
function pinExpiry(session: Session): Session {
  const fixedPlus30Days = Math.floor(Date.parse(FIXED_TIME) / 1000) + 30 * 86400;
  return { ...session, expires_at: Math.max(session.expires_at ?? 0, fixedPlus30Days) };
}

/** supabase-js' default storage key for a project URL: `sb-<first host label>-auth-token`. */
export function storageKey(url: string) {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

/**
 * The `@supabase/ssr` cookies the Next app reads (`apps/web/src/lib/supabase-server.ts`,
 * `supabase-middleware.ts`): `sb-127-auth-token` (chunked as `.0`, `.1`, … past 3180 chars),
 * value `base64-` + base64url(JSON session), path `/`, SameSite=Lax, not HttpOnly.
 */
export function ssrCookies(session: Session, appSupabaseUrl = PROXY_URL) {
  const value = `base64-${stringToBase64URL(JSON.stringify(pinExpiry(session)))}`;
  return createChunks(storageKey(appSupabaseUrl), value).map(({ name, value }) => ({
    name,
    value,
    url: BASE_URL,
    sameSite: "Lax" as const,
    httpOnly: DEFAULT_COOKIE_OPTIONS.httpOnly ?? false,
    expires: Math.floor(Date.now() / 1000) + 3600,
  }));
}

/**
 * Signs `user` in for the next navigation, hiding how each target stores the session:
 * - next: `@supabase/ssr` cookies (the server renders the signed-in page).
 * - expo: supabase-js' localStorage entry, written before any page script runs. STUB until
 *   the Expo web app exists (Phase 5): the key assumes the app keeps supabase-js' default
 *   storage key for its Supabase URL; adjust when its client is configured.
 */
export async function loginAs(context: BrowserContext, key: UserKey, options: { fresh?: boolean } = {}) {
  const session = options.fresh ? await signIn(USERS[key]) : cachedSession(key);
  if (TARGET === "next") {
    await context.addCookies(ssrCookies(session));
  } else {
    const entry = { key: storageKey(PROXY_URL), value: JSON.stringify(pinExpiry(session)) };
    await context.addInitScript(({ key, value }) => {
      // Once per tab, so a sign-out isn't undone by the next navigation.
      if (window.sessionStorage.getItem("parity-login")) return;
      window.sessionStorage.setItem("parity-login", "1");
      window.localStorage.setItem(key, value);
    }, entry);
  }
  return session;
}
