// Unit tests for _shared/user-not-found.ts (no stack needed).
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { AuthApiError, AuthRetryableFetchError } from "npm:@supabase/supabase-js@2.97.0";
import { isUserNotFound } from "../_shared/user-not-found.ts";

Deno.test("user-not-found: the user_not_found code means the user is already deleted", () => {
  assertEquals(isUserNotFound(new AuthApiError("User not found", 404, "user_not_found")), true);
  assertEquals(isUserNotFound({ code: "user_not_found" }), true);
});

Deno.test("user-not-found: other 404s and other codes are failures", () => {
  assertEquals(isUserNotFound(new AuthApiError("Not Found", 404, undefined)), false);
  assertEquals(isUserNotFound(new AuthApiError("Not Found", 404, "not_found")), false);
  assertEquals(isUserNotFound(new AuthApiError("Internal Server Error", 500, "unexpected_failure")), false);
  assertEquals(isUserNotFound(new AuthApiError("forbidden", 403, "not_admin")), false);
  assertEquals(isUserNotFound(new AuthRetryableFetchError("fetch failed", 0)), false);
  for (const value of [undefined, null, "user_not_found", 404, {}, { status: 404 }]) {
    assertEquals(isUserNotFound(value), false, String(value));
  }
});
