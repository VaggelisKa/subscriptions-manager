import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "8d0fbd2c-6b55-4ac4-9d27-9e2d1b9c5f10";
const NOW = 1_800_000_000;

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  getClaims: vi.fn(),
  deleteUser: vi.fn(),
  deleteSubscriptions: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: auth.getUser,
      getClaims: auth.getClaims,
      admin: { deleteUser: auth.deleteUser },
    },
    from: () => ({ delete: () => ({ eq: auth.deleteSubscriptions }) }),
  }),
}));

const { POST } = await import("./route");

const request = (token?: string) =>
  new Request("http://localhost/api/account/delete", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const signedIn = (method: string, ageSeconds: number) => ({
  data: {
    claims: { sub: USER_ID, amr: [{ method, timestamp: NOW - ageSeconds }] },
  },
  error: null,
});

// supabase-js is mocked, so auth errors are built by shape (the classifier checks name/status).
const authError = (name: string, message: string, status?: number) =>
  Object.assign(new Error(message), { name, status });

const REAUTH = {
  error: "Please sign in again or update the app to delete your account.",
  code: "reauth_required",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
  auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  auth.deleteSubscriptions.mockResolvedValue({ error: null });
  auth.deleteUser.mockResolvedValue({ data: {}, error: null });
});

describe("POST /api/account/delete", () => {
  it("missing token → 401, unchanged", async () => {
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Missing authorization token" });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it.each([
    ["password signed in 11 minutes ago", "password", 11 * 60],
    ["fresh oauth only", "oauth", 5],
    ["fresh recovery only", "recovery", 5],
  ])("%s → 403 reauth_required, nothing deleted", async (_, method, age) => {
    auth.getClaims.mockResolvedValue(signedIn(method, age));
    const res = await POST(request("token"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(REAUTH);
    expect(auth.getClaims).toHaveBeenCalledWith("token");
    expect(auth.deleteSubscriptions).not.toHaveBeenCalled();
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it("claims for a different user → 403", async () => {
    const fresh = signedIn("password", 5);
    fresh.data.claims.sub = "someone-else";
    auth.getClaims.mockResolvedValue(fresh);
    const res = await POST(request("token"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(REAUTH);
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid JWT", authError("AuthInvalidJwtError", "Invalid JWT signature")],
    ["401 from Auth", authError("AuthApiError", "bad_jwt", 401)],
  ])("rejected claims (%s) → 403", async (_, error) => {
    auth.getClaims.mockResolvedValue({ data: null, error });
    const res = await POST(request("token"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(REAUTH);
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it("missing claims without an error → 403", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    const res = await POST(request("token"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(REAUTH);
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    ["network failure", authError("AuthRetryableFetchError", "fetch failed", 0)],
    ["500 from Auth", authError("AuthApiError", "unexpected_failure", 500)],
    ["unexpected error", new Error("boom")],
  ])("claims lookup outage (%s) → 500 delete_failed, nothing deleted", async (_, error) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.getClaims.mockResolvedValue({ data: null, error });
    const res = await POST(request("token"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to delete account",
      code: "delete_failed",
    });
    expect(auth.deleteSubscriptions).not.toHaveBeenCalled();
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    ["password", "password"],
    ["otp", "otp"],
    ["magiclink", "magiclink"],
    ["totp", "totp"],
  ])("fresh %s sign-in → 200 and deletes the account", async (_, method) => {
    auth.getClaims.mockResolvedValue(signedIn(method, 5));
    const res = await POST(request("token"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(auth.deleteSubscriptions).toHaveBeenCalledWith("user_id", USER_ID);
    expect(auth.deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it("user already deleted by a concurrent request (user_not_found) → 200", async () => {
    auth.getClaims.mockResolvedValue(signedIn("password", 5));
    auth.deleteUser.mockResolvedValue({
      data: { user: null },
      error: Object.assign(authError("AuthApiError", "User not found", 404), { code: "user_not_found" }),
    });
    const res = await POST(request("token"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it.each([
    ["404 without user_not_found", authError("AuthApiError", "Not Found", 404)],
    ["500 from Auth", Object.assign(authError("AuthApiError", "Database error", 500), { code: "unexpected_failure" })],
  ])("deleteUser error (%s) → 500", async (_, error) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.getClaims.mockResolvedValue(signedIn("password", 5));
    auth.deleteUser.mockResolvedValue({ data: { user: null }, error });
    const res = await POST(request("token"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: error.message });
  });
});
