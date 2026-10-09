// Tells whether an Admin API `deleteUser` error means the user is already gone (a concurrent request
// deleted it), which is the outcome asked for. Shared by the delete-account Edge Function and the
// legacy web route (apps/web imports it through the `@supabase-functions/*` path alias), so it must
// stay free of imports and runtime-specific APIs.

/**
 * True only for Auth's `user_not_found` error code. Any other 404 (a misrouted URL, a proxy) or other
 * code is a real failure.
 */
export function isUserNotFound(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: unknown }).code === "user_not_found";
}
