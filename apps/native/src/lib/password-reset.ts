/**
 * Code-based password reset (spec §9.4): email → code → new password.
 *
 * `verifyOtp({ type: "recovery" })` signs the user in before the new password is set, so a
 * `passwordResetPending` flag holds the signed-in redirect in the group layouts until the reset
 * finishes. The flag is set just before `verifyOtp`, cleared once `updateUser({ password })`
 * succeeds or the user cancels (which also signs out on this device), and persisted, so a restart
 * or web reload mid-reset returns to the "new password" step.
 *
 * Free of React and React Native: the auth provider passes in its Supabase auth client, the
 * storage (AsyncStorage, which is localStorage on web) and a setter for its React state.
 */

/** The parts of `supabase.auth` the reset uses. */
export type ResetAuthClient = {
  resetPasswordForEmail: (email: string) => Promise<{ error: { message: string; code?: string } | null }>;
  verifyOtp: (params: {
    email: string;
    token: string;
    type: "recovery";
  }) => Promise<{ error: { message: string; code?: string } | null }>;
  updateUser: (attributes: { password: string }) => Promise<{ error: { message: string; code?: string } | null }>;
  signOut: (options: { scope: "local" }) => Promise<{ error: unknown }>;
};

export type ResetStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export const PASSWORD_RESET_PENDING_KEY = "@subscriptions-manager/auth/password-reset-pending";

export type ResetStep = "email" | "code" | "password";

/**
 * Which step the reset screen shows. A pending reset with a session is always the password step
 * (also after a restart); otherwise the screen's own email/code step.
 */
export function resetStep(pending: boolean, signedIn: boolean, localStep: "email" | "code"): ResetStep {
  return pending && signedIn ? "password" : localStep;
}

/** Whether a group layout may send a signed-in user home (the reset holds it). */
export function canRedirectSignedIn(signedIn: boolean, pending: boolean) {
  return signedIn && !pending;
}

type Result = { error?: string };

export function createPasswordReset({
  auth,
  storage,
  setPending,
  errorMessage = (error) => error.message,
}: {
  auth: ResetAuthClient;
  storage: ResetStorage;
  /** Mirrors the flag into React state. Called before any request that changes the session. */
  setPending: (pending: boolean) => void;
  errorMessage?: (error: { message: string; code?: string }) => string;
}) {
  async function persist(pending: boolean) {
    setPending(pending);
    try {
      if (pending) await storage.setItem(PASSWORD_RESET_PENDING_KEY, "1");
      else await storage.removeItem(PASSWORD_RESET_PENDING_KEY);
    } catch (error) {
      // Still held for this run through React state; only a restart would lose it.
      console.warn("Couldn't persist the password reset state:", error);
    }
  }

  return {
    /**
     * The persisted flag on launch. A flag without a session (it expired, or the app was killed
     * between setting the flag and `verifyOtp`) is stale and cleared.
     */
    async restore(hasSession: boolean) {
      let stored: string | null = null;
      try {
        stored = await storage.getItem(PASSWORD_RESET_PENDING_KEY);
      } catch {
        stored = null;
      }
      const pending = stored === "1" && hasSession;
      if (stored !== null && !pending) await persist(false);
      else setPending(pending);
      return pending;
    },

    /** Step 1: emails a code. No `redirectTo`; the email's link is only for old builds. */
    async requestCode(email: string): Promise<Result> {
      const { error } = await auth.resetPasswordForEmail(email.trim());
      if (error) return { error: errorMessage(error) };
      return {};
    },

    /** Step 2: the code signs the user in, so the redirect is held first. */
    async verifyCode(email: string, code: string): Promise<Result> {
      await persist(true);
      try {
        const { error } = await auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
        if (error) {
          await persist(false);
          return { error: errorMessage(error) };
        }
        return {};
      } catch (error) {
        await persist(false);
        throw error;
      }
    },

    /** Marks a reset as pending before a recovery `token_hash` link is verified (/auth/confirm). */
    begin() {
      return persist(true);
    },

    /** Clears the flag after a recovery link failed to verify. */
    abandon() {
      return persist(false);
    },

    /** Step 3: the flag is cleared only once the new password is saved. */
    async setPassword(password: string): Promise<Result> {
      const { error } = await auth.updateUser({ password });
      if (error) return { error: errorMessage(error) };
      await persist(false);
      return {};
    },

    /**
     * Leaves the reset: signs out on this device (the old password stays), then clears the flag.
     * Signing out first keeps the layouts from sending the still-signed-in user home in between.
     */
    async cancel() {
      try {
        const { error } = await auth.signOut({ scope: "local" });
        if (error) console.warn("Sign-out after cancelling the password reset failed:", error);
      } catch (error) {
        console.warn("Sign-out after cancelling the password reset failed:", error);
      }
      await persist(false);
    },
  };
}

export type PasswordReset = ReturnType<typeof createPasswordReset>;
