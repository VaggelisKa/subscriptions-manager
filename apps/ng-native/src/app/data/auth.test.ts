import { expect, test, vi } from "vitest";
import { functionErrorCode, isFunctionsFetchError } from "./auth.ts";

vi.mock("./supabase.ts", () => ({ supabase: {}, supabaseConfigured: true }));

/** Shaped like supabase-js's error, but built here, so `instanceof` checks against its classes fail. */
function httpError(context: unknown) {
  return { name: "FunctionsHttpError", message: "Edge Function returned a non-2xx status code", context };
}

test("reads the code from a look-alike error and response", async () => {
  const body = { code: "reauth_required" };
  const context = { clone: () => ({ json: async () => body }), json: async () => ({}) };
  expect(await functionErrorCode(httpError(context))).toBe("reauth_required");
});

test("reads the body directly when the response can't be cloned", async () => {
  const context = { json: async () => ({ code: "reauth_required" }) };
  expect(await functionErrorCode(httpError(context))).toBe("reauth_required");
});

test("a body that isn't JSON, or other errors, have no code", async () => {
  const notJson = { json: async () => JSON.parse("<html>") };
  expect(await functionErrorCode(httpError(notJson))).toBeUndefined();
  expect(await functionErrorCode(httpError(undefined))).toBeUndefined();
  expect(await functionErrorCode({ name: "FunctionsFetchError", context: notJson })).toBeUndefined();
  expect(await functionErrorCode(null)).toBeUndefined();
});

test("recognizes a look-alike FunctionsFetchError by name", () => {
  expect(isFunctionsFetchError({ name: "FunctionsFetchError", message: "Failed to send a request" })).toBe(true);
  expect(isFunctionsFetchError(httpError(undefined))).toBe(false);
  expect(isFunctionsFetchError(new Error("FunctionsFetchError"))).toBe(false);
  expect(isFunctionsFetchError(null)).toBe(false);
});
