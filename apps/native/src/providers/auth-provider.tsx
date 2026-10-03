import React, { createContext, useState, useEffect } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

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
  deleteAccount: () => Promise<{ error?: string }>;
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

  async function deleteAccount() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      return { error: "Not signed in" };
    }

    try {
      const { getApiUrl } = await import("@/lib/api-config");
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/account/delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      const data = (await response.json().catch(() => ({}))) as
        | { success?: boolean }
        | { error?: string };

      if (!response.ok) {
        return {
          error:
            (data && "error" in data && data.error) ||
            `Request failed (${response.status})`,
        };
      }

      await supabase.auth.signOut();
      return {};
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account";
      return { error: message };
    }
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
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
