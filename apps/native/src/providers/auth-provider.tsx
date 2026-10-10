import { Platform } from "react-native";
import React, { createContext, useState, useEffect } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { type Session, type User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  bootstrapError: string | null;
  isPasswordRecovery: boolean;
  isProcessingResetLink: boolean;
  clearBootstrapError: () => void;
  clearPasswordRecovery: () => void;
  retryBootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  reauthenticate: (password: string) => Promise<{ error?: string }>;
  deleteAccount: (
    confirmIdentity: () => Promise<boolean>,
  ) => Promise<{ error?: string; cancelled?: boolean }>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  bootstrapError: null,
  isPasswordRecovery: false,
  isProcessingResetLink: false,
  clearBootstrapError: () => {},
  clearPasswordRecovery: () => {},
  retryBootstrap: async () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  reauthenticate: async () => ({}),
  deleteAccount: async () => ({}),
});

function parseHashParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return params;

  const hash = url.substring(hashIndex + 1);
  hash.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });
  return params;
}

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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isProcessingResetLink, setIsProcessingResetLink] = useState(false);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    function getBootstrapErrorMessage(error: unknown) {
      if (error instanceof Error && error.message.trim()) {
        return error.message;
      }

      return "Could not reconnect to Supabase. Check your connection or backend status and try again.";
    }

    async function processResetUrl(url: string) {
      if (!url.includes("reset-password")) return;

      const params = parseHashParams(url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (!accessToken || !refreshToken) return;

      // On web the tokens arrive in the address bar: drop them from the URL and history.
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }

      if (isMounted) {
        setIsProcessingResetLink(true);
      }

      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.warn(
            "Failed to restore password recovery session:",
            error.message,
          );
          return;
        }

        if (isMounted) {
          setIsPasswordRecovery(true);
        }
      } catch (error) {
        console.warn("Failed to process password recovery link:", error);
      } finally {
        if (isMounted) {
          setIsProcessingResetLink(false);
        }
      }
    }

    async function hydrateSession() {
      if (isMounted) {
        setLoading(true);
        setBootstrapError(null);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
        if (isMounted) {
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
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    void Linking.getInitialURL().then((url) => {
      if (url) processResetUrl(url);
    });

    const linkingSub = Linking.addEventListener("url", ({ url }) => {
      void processResetUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, [bootstrapAttempt]);

  function clearBootstrapError() {
    setBootstrapError(null);
  }

  function clearPasswordRecovery() {
    setIsPasswordRecovery(false);
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
    if (error) return { error: error.message };
    return {};
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const redirectTo = Linking.createURL("reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) return { error: error.message };

    return {};
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return {};
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
        loading,
        bootstrapError,
        isPasswordRecovery,
        isProcessingResetLink,
        clearBootstrapError,
        clearPasswordRecovery,
        retryBootstrap,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        reauthenticate,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
