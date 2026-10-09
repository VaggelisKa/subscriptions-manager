// Unit tests for _shared/recent-auth.ts (no stack needed).
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { CLOCK_SKEW_SECONDS, hasRecentSignIn, RECENT_SIGN_IN_SECONDS } from "../_shared/recent-auth.ts";

const NOW = 1_800_000_000;
const ago = (seconds: number) => NOW - seconds;

Deno.test("recent-auth: window is 10 minutes", () => {
  assertEquals(RECENT_SIGN_IN_SECONDS, 600);
});

Deno.test("recent-auth: fresh password or otp sign-in → true", () => {
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(5) }], NOW), true);
  assertEquals(hasRecentSignIn([{ method: "otp", timestamp: ago(60) }], NOW), true);
  assertEquals(hasRecentSignIn([{ method: "oauth", timestamp: ago(3600) }, { method: "otp", timestamp: ago(1) }], NOW), true);
});

Deno.test("recent-auth: boundary at exactly 600 s is accepted, 601 s is not", () => {
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(600) }], NOW), true);
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(601) }], NOW), false);
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(600) }], NOW + 0.5), false);
});

Deno.test("recent-auth: future timestamps are allowed only within the 60 s clock skew", () => {
  assertEquals(CLOCK_SKEW_SECONDS, 60);
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(-30) }], NOW), true);
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(-60) }], NOW), true);
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(-120) }], NOW), false);
});

Deno.test("recent-auth: millisecond timestamps → false", () => {
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: NOW * 1000 }], NOW), false);
  assertEquals(hasRecentSignIn([{ method: "otp", timestamp: ago(5) * 1000 }], NOW), false);
});

Deno.test("recent-auth: stale sign-in (> 10 min) → false", () => {
  assertEquals(hasRecentSignIn([{ method: "password", timestamp: ago(11 * 60) }], NOW), false);
  assertEquals(hasRecentSignIn([{ method: "otp", timestamp: ago(24 * 3600) }], NOW), false);
});

Deno.test("recent-auth: other methods never count, however fresh", () => {
  for (const method of ["oauth", "recovery", "invite", "magiclink", "email/signup", "sso/saml", "anonymous", "mfa/totp", "pwd"]) {
    assertEquals(hasRecentSignIn([{ method, timestamp: ago(1) }], NOW), false, method);
  }
});

Deno.test("recent-auth: fresh oauth plus stale password → false", () => {
  const amr = [{ method: "oauth", timestamp: ago(1) }, { method: "password", timestamp: ago(11 * 60) }];
  assertEquals(hasRecentSignIn(amr, NOW), false);
});

Deno.test("recent-auth: missing or non-numeric timestamps → false", () => {
  for (const timestamp of [undefined, null, "now", String(ago(1)), NaN, Infinity, -Infinity, {}, [ago(1)]]) {
    assertEquals(hasRecentSignIn([{ method: "password", timestamp }], NOW), false, String(timestamp));
  }
  assertEquals(hasRecentSignIn([{ method: "password" }], NOW), false);
});

Deno.test("recent-auth: non-array amr and malformed entries → false", () => {
  for (const amr of [undefined, null, "password", 42, { method: "password", timestamp: ago(1) }, []]) {
    assertEquals(hasRecentSignIn(amr, NOW), false, JSON.stringify(amr));
  }
  assertEquals(hasRecentSignIn(["password", "otp", null, 1], NOW), false);
});
