// Recent sign-in check for account deletion. Shared by the delete-account Edge Function and the
// legacy web route (apps/web imports it through the `@supabase-functions/*` path alias), so it
// must stay free of imports and runtime-specific APIs.

/** How recent a password/OTP sign-in must be, in seconds. */
export const RECENT_SIGN_IN_SECONDS = 10 * 60;

/** `amr` methods that prove the user just entered a credential (not oauth, recovery, invite, …). */
const RECENT_SIGN_IN_METHODS: readonly unknown[] = ["password", "otp"];

/**
 * True if the token's `amr` claim has a `password` or `otp` entry with a numeric `timestamp`
 * (unix seconds) at most `RECENT_SIGN_IN_SECONDS` before `nowSeconds`.
 */
export function hasRecentSignIn(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return (
      RECENT_SIGN_IN_METHODS.includes(method) &&
      typeof timestamp === "number" &&
      Number.isFinite(timestamp) &&
      nowSeconds - timestamp <= RECENT_SIGN_IN_SECONDS
    );
  });
}
