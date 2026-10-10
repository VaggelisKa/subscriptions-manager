import { describe, expect, test, vi } from "vitest";
import {
  PASSWORD_RESET_PENDING_KEY,
  canRedirectSignedIn,
  createPasswordReset,
  resetStep,
  type ResetAuthClient,
} from "./password-reset";

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: vi.fn(async (key: string) => items.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => void items.set(key, value)),
    removeItem: vi.fn(async (key: string) => void items.delete(key)),
  };
}

/** A fake auth client that records calls and what the flag was at each one. */
function setup({
  verifyError = null as { message: string; code?: string } | null,
  updateError = null as { message: string; code?: string } | null,
  stored = {} as Record<string, string>,
} = {}) {
  const storage = memoryStorage(stored);
  let pending = false;
  const calls: string[] = [];
  const auth: ResetAuthClient = {
    resetPasswordForEmail: vi.fn(async (email: string) => {
      calls.push(`reset ${email}`);
      return { error: null };
    }),
    verifyOtp: vi.fn(async ({ email, token, type }) => {
      calls.push(`verify ${email} ${token} ${type} pending=${pending}`);
      return { error: verifyError };
    }),
    updateUser: vi.fn(async () => {
      calls.push(`update pending=${pending}`);
      return { error: updateError };
    }),
    signOut: vi.fn(async ({ scope }) => {
      calls.push(`signOut ${scope} pending=${pending}`);
      return { error: null };
    }),
  };
  const reset = createPasswordReset({
    auth,
    storage,
    setPending: (value) => {
      pending = value;
    },
  });
  return { reset, auth, storage, calls, isPending: () => pending };
}

describe("password reset", () => {
  test("step 1 emails a code without a redirect URL", async () => {
    const { reset, auth } = setup();
    expect(await reset.requestCode("  someone@example.com ")).toEqual({});
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("someone@example.com");
  });

  test("step 2 holds the redirect before verifyOtp signs the user in, and persists it", async () => {
    const { reset, calls, storage, isPending } = setup();
    expect(await reset.verifyCode("someone@example.com", " 123456 ")).toEqual({});
    expect(calls).toEqual(["verify someone@example.com 123456 recovery pending=true"]);
    expect(isPending()).toBe(true);
    expect(storage.items.get(PASSWORD_RESET_PENDING_KEY)).toBe("1");
  });

  test("a wrong code releases the flag again", async () => {
    const { reset, storage, isPending } = setup({
      verifyError: { message: "Token has expired or is invalid", code: "otp_expired" },
    });
    expect(await reset.verifyCode("someone@example.com", "000000")).toEqual({
      error: "Token has expired or is invalid",
    });
    expect(isPending()).toBe(false);
    expect(storage.items.has(PASSWORD_RESET_PENDING_KEY)).toBe(false);
  });

  test("a failed verifyOtp request releases the flag and rethrows", async () => {
    const { reset, auth, isPending } = setup();
    vi.mocked(auth.verifyOtp).mockRejectedValueOnce(new Error("offline"));
    await expect(reset.verifyCode("someone@example.com", "123456")).rejects.toThrow("offline");
    expect(isPending()).toBe(false);
  });

  test("step 3 clears the flag only after the new password is saved", async () => {
    const { reset, calls, storage, isPending } = setup();
    await reset.verifyCode("someone@example.com", "123456");
    expect(await reset.setPassword("new-password")).toEqual({});
    expect(calls.at(-1)).toBe("update pending=true");
    expect(isPending()).toBe(false);
    expect(storage.items.has(PASSWORD_RESET_PENDING_KEY)).toBe(false);
  });

  test("a rejected password keeps the reset pending", async () => {
    const { reset, storage, isPending } = setup({
      updateError: { message: "Password should be at least 6 characters.", code: "weak_password" },
    });
    await reset.verifyCode("someone@example.com", "123456");
    expect(await reset.setPassword("123")).toEqual({ error: "Password should be at least 6 characters." });
    expect(isPending()).toBe(true);
    expect(storage.items.get(PASSWORD_RESET_PENDING_KEY)).toBe("1");
  });

  test("cancel signs out on this device while still held, then clears the flag", async () => {
    const { reset, calls, storage, isPending } = setup();
    await reset.verifyCode("someone@example.com", "123456");
    await reset.cancel();
    expect(calls.at(-1)).toBe("signOut local pending=true");
    expect(isPending()).toBe(false);
    expect(storage.items.has(PASSWORD_RESET_PENDING_KEY)).toBe(false);
  });

  test("cancel clears the flag even if signing out fails", async () => {
    const { reset, auth, isPending } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(auth.signOut).mockRejectedValueOnce(new Error("offline"));
    await reset.verifyCode("someone@example.com", "123456");
    await reset.cancel();
    expect(isPending()).toBe(false);
  });

  test("a restart mid-reset restores the pending flag", async () => {
    const { reset, isPending } = setup({ stored: { [PASSWORD_RESET_PENDING_KEY]: "1" } });
    expect(await reset.restore(true)).toBe(true);
    expect(isPending()).toBe(true);
  });

  test("a stored flag without a session is stale and removed", async () => {
    const { reset, storage, isPending } = setup({ stored: { [PASSWORD_RESET_PENDING_KEY]: "1" } });
    expect(await reset.restore(false)).toBe(false);
    expect(isPending()).toBe(false);
    expect(storage.items.has(PASSWORD_RESET_PENDING_KEY)).toBe(false);
  });

  test("nothing stored, nothing pending", async () => {
    const { reset, storage } = setup();
    expect(await reset.restore(true)).toBe(false);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  test("a recovery link marks the reset before it is verified; a failed one abandons it", async () => {
    const { reset, storage, isPending } = setup();
    await reset.begin();
    expect(isPending()).toBe(true);
    expect(storage.items.get(PASSWORD_RESET_PENDING_KEY)).toBe("1");
    await reset.abandon();
    expect(isPending()).toBe(false);
    expect(storage.items.has(PASSWORD_RESET_PENDING_KEY)).toBe(false);
  });

  test("a storage failure still holds the redirect for this run", async () => {
    const { reset, storage, isPending } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    storage.setItem.mockRejectedValueOnce(new Error("quota"));
    expect(await reset.verifyCode("someone@example.com", "123456")).toEqual({});
    expect(isPending()).toBe(true);
  });
});

describe("gate", () => {
  test("a pending reset holds the signed-in redirect", () => {
    expect(canRedirectSignedIn(true, false)).toBe(true);
    expect(canRedirectSignedIn(true, true)).toBe(false);
    expect(canRedirectSignedIn(false, false)).toBe(false);
  });

  test("the screen shows the password step for a signed-in pending reset, else its own step", () => {
    expect(resetStep(true, true, "email")).toBe("password");
    expect(resetStep(true, false, "code")).toBe("code");
    expect(resetStep(false, true, "code")).toBe("code");
    expect(resetStep(false, false, "email")).toBe("email");
  });
});
