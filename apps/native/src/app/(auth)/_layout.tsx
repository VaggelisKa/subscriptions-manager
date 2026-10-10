import { use } from "react";
import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { stackScreenOptions } from "@/lib/stack-options";
import { AuthLoading } from "@/components/auth/auth-loading";
import { BootstrapErrorView } from "@/components/auth/bootstrap-error-view";

/**
 * Signed-out screens. With a session this group sends you home, except during a password
 * reset: the recovery link signs you in and only /reset-password stays open.
 */
export default function AuthLayout() {
  const colors = useThemeColors();
  const {
    user,
    loading,
    bootstrapError,
    isPasswordRecovery,
    isProcessingResetLink,
    clearBootstrapError,
    retryBootstrap,
  } = use(AuthContext);
  const isLoggedIn = !!user;

  if (loading || isProcessingResetLink) {
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

  if (isLoggedIn && !isPasswordRecovery) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "" }}
        />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen
          name="reset-password"
          options={{ title: "" }}
        />
      </Stack.Protected>
    </Stack>
  );
}
