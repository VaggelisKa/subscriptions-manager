// Unit tests for delete-account/auth-errors.ts (no stack needed).
import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  AuthApiError,
  AuthInvalidJwtError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
} from "npm:@supabase/supabase-js@2.97.0";
import { isAuthRejection, isGetClaimsThrowRejection } from "../delete-account/auth-errors.ts";

Deno.test("auth-errors: invalid JWTs and 400/401/403/404 auth errors are rejections", () => {
  assertEquals(isAuthRejection(new AuthInvalidJwtError("Invalid JWT signature")), true);
  assertEquals(isAuthRejection(new AuthSessionMissingError()), true);
  for (const status of [400, 401, 403, 404]) {
    assertEquals(isAuthRejection(new AuthApiError("rejected", status, "bad_jwt")), true, String(status));
  }
});

Deno.test("auth-errors: token decoding failures are rejections", () => {
  for (const message of ["JWT has expired", "Missing exp claim", "Invalid UTF-8 sequence", 'Invalid Base64-URL character "!"']) {
    assertEquals(isAuthRejection(new Error(message)), true, message);
  }
});

Deno.test("auth-errors: a SyntaxError is a rejection only when getClaims threw it", () => {
  assertEquals(isAuthRejection(new SyntaxError("Unexpected token '<'")), false);
  assertEquals(isGetClaimsThrowRejection(new SyntaxError("Unexpected token")), true);
  assertEquals(isGetClaimsThrowRejection(new AuthInvalidJwtError("Invalid JWT structure")), true);
  assertEquals(isGetClaimsThrowRejection(new AuthRetryableFetchError("fetch failed", 0)), false);
  assertEquals(isGetClaimsThrowRejection(new TypeError("fetch failed")), false);
  for (const value of [undefined, null, {}]) {
    assertEquals(isGetClaimsThrowRejection(value), false, String(value));
  }
});

Deno.test("auth-errors: network failures, 5xx and unexpected errors are outages", () => {
  assertEquals(isAuthRejection(new AuthRetryableFetchError("fetch failed", 0)), false);
  assertEquals(isAuthRejection(new AuthRetryableFetchError("Bad Gateway", 502)), false);
  assertEquals(isAuthRejection(new AuthApiError("Internal Server Error", 500, "unexpected_failure")), false);
  assertEquals(isAuthRejection(new AuthApiError("Too Many Requests", 429, "over_request_rate_limit")), false);
  assertEquals(isAuthRejection(new AuthUnknownError("boom", new Error("boom"))), false);
  assertEquals(isAuthRejection(new TypeError("fetch failed")), false);
  assertEquals(isAuthRejection(new Error("boom")), false);
  for (const value of [undefined, null, "AuthInvalidJwtError", 401, {}]) {
    assertEquals(isAuthRejection(value), false, String(value));
  }
});
