import { use } from "react";
import { PlatformColor } from "react-native";
import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { stackScreenOptions } from "@/lib/stack-options";
import { AuthLoading } from "@/components/auth/auth-loading";
import { BootstrapErrorView } from "@/components/auth/bootstrap-error-view";

/**
 * Signed-in screens. Without a session this group sends you to /login; mid password reset, to
 * /reset-password.
 */
export default function AppLayout() {
  const colors = useThemeColors();
  const {
    user,
    loading,
    bootstrapError,
    passwordResetPending,
    clearBootstrapError,
    retryBootstrap,
  } = use(AuthContext);

  if (loading) {
    return <AuthLoading />;
  }

  if (bootstrapError && !user) {
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

  if (!user) {
    return <Redirect href="/login" />;
  }

  // A password reset signed in with its code; the new password comes first (spec §9.4).
  if (passwordResetPending) {
    return <Redirect href="/reset-password" />;
  }

  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen
        name="index"
        options={{
          title: "",
          // Toolbar buttons float over the content with no bar or blur;
          // the screen renders its own title that scrolls away.
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          scrollEdgeEffects: { top: "hidden" },
        }}
      />
      <Stack.Screen
        name="subscription/[id]"
        options={{
          title: "",
          presentation: "formSheet",
          sheetGrabberVisible: true,
          headerTransparent: true,
          contentStyle: { backgroundColor: colors.background },
          sheetAllowedDetents: [0.8, 1],
        }}
      >
        <Stack.Header style={{ backgroundColor: "transparent" }} />
      </Stack.Screen>
      <Stack.Screen
        name="subscription-form"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          headerTransparent: true,
          // Solid from the first detent; a transparent background shows
          // the sheet's glass until it's dragged to full height.
          contentStyle: {
            backgroundColor:
              process.env.EXPO_OS === "ios"
                ? PlatformColor("systemGroupedBackground")
                : colors.background,
          },
          sheetAllowedDetents: [0.75, 1],
        }}
      >
        <Stack.Header style={{ backgroundColor: "transparent" }} />
      </Stack.Screen>
      <Stack.Screen
        name="insights"
        options={{
          title: "Insights",
          presentation: "formSheet",
          sheetGrabberVisible: true,
          headerTransparent: true,
          contentStyle: { backgroundColor: colors.background },
          sheetAllowedDetents: [0.8, 1],
        }}
      >
        <Stack.Header style={{ backgroundColor: "transparent" }} />
      </Stack.Screen>
    </Stack>
  );
}
