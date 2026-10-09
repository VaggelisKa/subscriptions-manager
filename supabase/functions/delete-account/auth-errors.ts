// Tells a rejected token apart from an Auth outage, for errors returned or thrown by `getClaims` and
// `getUser`. Checked by shape, not `instanceof`, like the apps' `functionErrorCode`. Shared by the
// delete-account Edge Function and the legacy web route (apps/web imports it through the
// `@supabase-functions/*` path alias), so it must stay free of imports and runtime-specific APIs.

/** HTTP statuses with which Auth rejects the token or its user, as opposed to failing itself. */
const REJECTION_STATUSES: readonly unknown[] = [400, 401, 403, 404];

/** Plain `Error`s that auth-js throws while decoding a token locally, before any request. */
const TOKEN_DECODE_ERROR =
  /^(JWT has expired|Missing exp claim|Invalid UTF-8 sequence|Invalid Base64-URL character|Unrecognized Unicode codepoint)/;

/**
 * True if `error` means the token is invalid (→ 401): an `AuthInvalidJwtError`, an auth error with
 * status 400/401/403/404, or a decoding failure. False for network failures, 5xx and anything else
 * unexpected (→ 500), including a generic `SyntaxError` (see `isGetClaimsThrowRejection`).
 */
export function isAuthRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, status, message } = error as { name?: unknown; status?: unknown; message?: unknown };
  if (name === "AuthInvalidJwtError") return true;
  if (typeof name === "string" && name.startsWith("Auth")) return REJECTION_STATUSES.includes(status);
  return typeof message === "string" && TOKEN_DECODE_ERROR.test(message);
}

/**
 * `isAuthRejection` for an error *thrown* by `getClaims`. auth-js wraps unparseable upstream bodies
 * in Auth errors, so a `SyntaxError` thrown there can only come from `JSON.parse` of the token's own
 * header or payload: a malformed token, not an outage.
 */
export function isGetClaimsThrowRejection(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === "SyntaxError" || isAuthRejection(error);
}
