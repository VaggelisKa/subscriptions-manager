import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { createPasswordReset } from "@/lib/password-reset";
import { type EmailOtpType, type Session, type User } from "@supabase/supabase-js";

type Result = { error?: string };
/** `needsConfirmation`: the account exists but its email isn't confirmed; a code was sent. */
type ConfirmableResult = Result & { needsConfirmation?: boolean };

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  bootstrapError: string | null;
  /** A code-based password reset has signed the user in but no new password is set yet (§9.4). */
  passwordResetPending: boolean;
  clearBootstrapError: () => void;
  retryBootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<ConfirmableResult>;
  signUp: (email: string, password: string) => Promise<ConfirmableResult>;
  /** Emails a sign-in code to an existing account (never creates one). */
  sendSignInCode: (email: string) => Promise<Result>;
  /** Emails a new sign-up confirmation code. */
  resendSignUpCode: (email: string) => Promise<Result>;
  /** Verifies a sign-in or sign-up confirmation code; signs the user in. */
  verifyEmailCode: (email: string, code: string) => Promise<Result>;
  /** Verifies a `token_hash` from an email link (/auth/confirm). */
  verifyEmailLink: (tokenHash: string, type: EmailOtpType) => Promise<Result>;
  /** Signs out on this device, or with `"global"` on every device. */
  signOut: (scope?: "local" | "global") => Promise<void>;
  requestPasswordReset: (email: string) => Promise<Result>;
  verifyPasswordResetCode: (email: string, code: string) => Promise<Result>;
  /** Sets the new password; ends a pending reset. */
  updatePassword: (password: string) => Promise<Result>;
  /** Leaves a pending reset and signs out on this device. */
  cancelPasswordReset: () => Promise<void>;
  reauthenticate: (password: string) => Promise<Result>;
  deleteAccount: (
    confirmIdentity: () => Promise<boolean>,
  ) => Promise<{ error?: string; cancelled?: boolean }>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  bootstrapError: null,
  passwordResetPending: false,
  clearBootstrapError: () => {},
  retryBootstrap: async () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
  sendSignInCode: async () => ({}),
  resendSignUpCode: async () => ({}),
  verifyEmailCode: async () => ({}),
  verifyEmailLink: async () => ({}),
  signOut: async () => {},
  requestPasswordReset: async () => ({}),
  verifyPasswordResetCode: async () => ({}),
  updatePassword: async () => ({}),
  cancelPasswordReset: async () => {},
  reauthenticate: async () => ({}),
  deleteAccount: async () => ({}),
});

/** True if `invoke` couldn't reach the function at all. Checked by shape, like `functionErrorCode`. */
function isFunctionsFetchError(error: unknown) {
  return !!error && typeof error === "object" && "name" in error && error.name === "FunctionsFetchError";
}

/** The `code` from an Edge Function's JSON error body, if there is one. */
async function functionErrorCode(error: unknown) {
  // Checked by shape, not `instanceof`: a second copy of supabase-js (or a polyfilled `Response`)
  // makes the class checks fail even for a real `reauth_required` reply.
  if (!error || typeof error !== "object") return undefined;
  if (!("name" in error) || error.name !== "FunctionsHttpError") return undefined;
  const context: unknown = "context" in error ? error.context : undefined;
  if (!context || typeof context !== "object" || !("json" in context)) return undefined;
  if (typeof context.json !== "function") return undefined;
  type Body = { json: () => Promise<unknown> };
  const response = context as Body & { clone: () => Body };
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    // No `clone`, or the clone couldn't be read: read the original response instead.
    try {
      body = await response.json();
    } catch {
      return undefined; // Not JSON (e.g. a gateway error page).
    }
  }
  if (body && typeof body === "object" && "code" in body) {
    return typeof body.code === "string" ? body.code : undefined;
  }
  return undefined;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [passwordResetPending, setPasswordResetPending] = useState(false);
  // The persisted reset flag is read with the session, so no layout redirects before it's known.
  const [resetRestored, setResetRestored] = useState(false);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const passwordReset = createPasswordReset({
    auth: supabase.auth,
    storage: AsyncStorage,
    setPending: setPasswordResetPending,
    errorMessage: authErrorMessage,
  });

  useEffect(() => {
    let isMounted = true;

    function getBootstrapErrorMessage(error: unknown) {
      if (error instanceof Error && error.message.trim()) {
        return error.message;
      }

      return "Could not reconnect to Supabase. Check your connection or backend status and try again.";
    }

    async function hydrateSession() {
      if (isMounted) {
        setLoading(true);
        setBootstrapError(null);
      }

      // Unknown if restoring failed: then the flag is kept until a later attempt can tell.
      let hasSession = true;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        hasSession = !!session;

        if (isMounted) {
          setSession(session);
          setBootstrapError(null);
        }
      } catch (error) {
        console.warn("Failed to restore Supabase session:", error);

        if (isMounted) {
          setSession(null);
          setBootstrapError(getBootstrapErrorMessage(error));
        }
      } finally {
        await passwordReset.restore(hasSession);
        if (isMounted) {
          setResetRestored(true);
          setLoading(false);
        }
      }
    }

    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setSession(session);
      setLoading(false);
      setBootstrapError(null);
      // A reset can't continue without its session (e.g. it expired or was revoked).
      if (event === "SIGNED_OUT") void passwordReset.abandon();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [bootstrapAttempt]);

  function clearBootstrapError() {
    setBootstrapError(null);
  }

  async function retryBootstrap() {
    setBootstrapAttempt((attempt) => attempt + 1);
  }

  async function signIn(email: string, password: string) {
    setBootstrapError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error?.code === "email_not_confirmed") {
      // Signed up but never entered the code: send a fresh one and continue there.
      const resent = await resendSignUpCode(email);
      if (resent.error) return resent;
      return { needsConfirmation: true };
    }
    if (error) return { error: authErrorMessage(error) };
    return {};
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: authErrorMessage(error) };
    if (data.session) return {}; // Confirmations are off: already signed in.
    // With confirmations on, an address that already has an account gets a user without
    // identities and no email.
    if (data.user && data.user.identities?.length === 0) {
      return { error: "There's already an account for this email. Sign in instead." };
    }
    return { needsConfirmation: true };
  }

  async function sendSignInCode(email: string) {
    setBootstrapError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) return { error: authErrorMessage(error) };
    return {};
  }

  async function resendSignUpCode(email: string) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return { error: authErrorMessage(error) };
    return {};
  }

  async function verifyEmailCode(email: string, code: string) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) return { error: authErrorMessage(error) };
    return {};
  }

  async function verifyEmailLink(tokenHash: string, type: EmailOtpType) {
    // A recovery link signs the user in too; hold the redirect like the code does.
    if (type === "recovery") await passwordReset.begin();
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        if (type === "recovery") await passwordReset.abandon();
        return { error: authErrorMessage(error) };
      }
      return {};
    } catch (error) {
      if (type === "recovery") await passwordReset.abandon();
      throw error;
    }
  }

  async function signOut(scope: "local" | "global" = "local") {
    const { error } = await supabase.auth.signOut({ scope });
    if (error) console.warn(`Sign-out (${scope}) failed:`, error);
  }

  async function requestPasswordReset(email: string) {
    return passwordReset.requestCode(email);
  }

  async function verifyPasswordResetCode(email: string, code: string) {
    return passwordReset.verifyCode(email, code);
  }

  async function updatePassword(password: string) {
    return passwordReset.setPassword(password);
  }

  async function cancelPasswordReset() {
    await passwordReset.cancel();
  }

  /** Confirms the current user's password, which also counts as a fresh sign-in. */
  async function reauthenticate(password: string) {
    // The stored session, not React state, which can lag behind a token refresh or sign-in.
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    const email = current?.user.email ?? session?.user.email;
    if (!email) return { error: "Not signed in" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  /**
   * Deletes the account through the `delete-account` Edge Function. It needs a sign-in from the
   * last 10 minutes; if the session is older, `confirmIdentity` asks for the password (resolving
   * false when the user cancels) and the request is retried once.
   */
  async function deleteAccount(confirmIdentity: () => Promise<boolean>) {
    try {
      let { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      if (error && (await functionErrorCode(error)) === "reauth_required") {
        if (!(await confirmIdentity())) return { cancelled: true };
        ({ error } = await supabase.functions.invoke("delete-account", {
          method: "POST",
        }));
      }
      if (error) {
        console.warn("Account deletion failed:", error);
        return {
          error:
            isFunctionsFetchError(error)
              ? "Couldn't reach the server. Check your connection and try again."
              : "Couldn't delete your account. Try again.",
        };
      }
    } catch (error) {
      console.warn("Account deletion failed:", error);
      return { error: "Couldn't delete your account. Try again." };
    }

    // The user and all their sessions are gone server-side; just clear this device.
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.warn("Local sign-out after account deletion failed:", error);
    } catch (error) {
      console.warn("Local sign-out after account deletion failed:", error);
    }
    setSession(null);
    return {};
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading: loading || !resetRestored,
        bootstrapError,
        passwordResetPending,
        clearBootstrapError,
        retryBootstrap,
        signIn,
        signUp,
        sendSignInCode,
        resendSignUpCode,
        verifyEmailCode,
        verifyEmailLink,
        signOut,
        requestPasswordReset,
        verifyPasswordResetCode,
        updatePassword,
        cancelPasswordReset,
        reauthenticate,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
