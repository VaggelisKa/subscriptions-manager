import { cleanup, injectService } from "@ng-native/testing";
import { afterEach, expect, test, vi } from "vitest";
import { Auth, functionErrorCode, isFunctionsFetchError } from "./auth.ts";

const supabase = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
  functions: { invoke: vi.fn() },
}));

vi.mock("./supabase.ts", () => ({ supabase, supabaseConfigured: true }));

afterEach(cleanup);

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

test("falls back to the original response when the clone fails", async () => {
  const body = { code: "reauth_required" };
  const cloneThrows = { clone: () => { throw new TypeError("Body already used"); }, json: async () => body };
  expect(await functionErrorCode(httpError(cloneThrows))).toBe("reauth_required");
  const cloneUnreadable = { clone: () => ({ json: () => Promise.reject(new TypeError("locked")) }), json: async () => body };
  expect(await functionErrorCode(httpError(cloneUnreadable))).toBe("reauth_required");
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

test("deleteAccount clears the session even if signing out emits no auth event", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const session = { user: { id: "a" } };
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } });
  supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
  const auth = injectService(Auth);
  await auth.whenReady();
  expect(auth.session()).toBe(session);

  supabase.auth.signOut.mockResolvedValue({ error: new Error("storage unavailable") });
  expect(await auth.deleteAccount(async () => true)).toEqual({});
  expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(auth.session()).toBeNull();
});
