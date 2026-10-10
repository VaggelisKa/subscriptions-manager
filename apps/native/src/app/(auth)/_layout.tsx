import { use } from "react";
import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { stackScreenOptions } from "@/lib/stack-options";
import { AuthLoading } from "@/components/auth/auth-loading";
import { BootstrapErrorView } from "@/components/auth/bootstrap-error-view";
import { canRedirectSignedIn } from "@/lib/password-reset";

/**
 * Signed-out screens. With a session this group sends you home, except during a password
 * reset: the recovery code signs you in, and /reset-password stays open until the new password
 * is set or the reset is cancelled.
 */
export default function AuthLayout() {
  const colors = useThemeColors();
  const {
    user,
    loading,
    bootstrapError,
    passwordResetPending,
    clearBootstrapError,
    retryBootstrap,
  } = use(AuthContext);
  const isLoggedIn = !!user;

  if (loading) {
    return <AuthLoading />;
  }

  if (bootstrapError && !isLoggedIn) {
    return (
      <BootstrapErrorView
        message={bootstrapError}
        onRetry={() => {
          void retryBootstrap();
        }}
        onContinue={clearBootstrapError}
      />
    );
  }

  if (canRedirectSignedIn(isLoggedIn, passwordResetPending)) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Signed out for the email and code steps, signed in for the new password. */}
      <Stack.Screen name="reset-password" options={{ title: "" }} />
      {/* Email links (token_hash); a recovery link continues at /reset-password. */}
      <Stack.Screen name="auth/confirm" options={{ headerShown: false }} />
    </Stack>
  );
}
