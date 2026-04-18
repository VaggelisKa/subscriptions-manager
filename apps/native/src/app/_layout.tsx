import { use, useEffect, useState } from "react";
import { Stack } from "expo-router/stack";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AuthContext, AuthProvider } from "@/providers/auth-provider";
import {
  ThemeProvider,
  useTheme,
  useThemeColors,
} from "@/providers/theme-provider";
import { loadThemeOverride, type ThemeOverride } from "@/lib/user-options";
import { useFonts } from "expo-font";
import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { fonts, radius, spacing } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const colors = useThemeColors();
  const { colorScheme } = useTheme();
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

  useEffect(() => {
    if (isPasswordRecovery && !loading) {
      router.replace("/reset-password");
    }
  }, [isPasswordRecovery, loading]);

  if (loading || isProcessingResetLink) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (bootstrapError && !isLoggedIn) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: spacing.xl,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            gap: spacing.lg,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            backgroundColor: colors.card,
          }}
        >
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 24,
                color: colors.foreground,
              }}
            >
              Couldn&apos;t restore your session
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 22,
                color: colors.mutedForeground,
              }}
            >
              {bootstrapError}
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            <Pressable
              onPress={() => {
                void retryBootstrap();
              }}
              style={({ pressed }) => ({
                alignItems: "center",
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.semiBold,
                  fontSize: 15,
                  color: colors.primaryForeground,
                }}
              >
                Try Again
              </Text>
            </Pressable>

            <Pressable
              onPress={clearBootstrapError}
              style={({ pressed }) => ({
                alignItems: "center",
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 15,
                  color: colors.foreground,
                }}
              >
                Continue to Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: {
            fontFamily: "Nunito-Bold",
            color: colors.foreground,
          },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="index" options={{ title: "Subscriptions" }} />
          <Stack.Screen
            name="reset-password"
            options={{ title: "Create New Password" }}
          />
          <Stack.Screen
            name="subscription-form"
            options={{
              presentation: "formSheet",
              sheetGrabberVisible: true,
              headerTransparent: true,
              contentStyle: { backgroundColor: "transparent" },
              sheetAllowedDetents: [0.65, 1],
            }}
          >
            <Stack.Header style={{ backgroundColor: "transparent" }} />
          </Stack.Screen>
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password"
            options={{ title: "Reset Password" }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialThemeOverride, setInitialThemeOverride] = useState<
    ThemeOverride | undefined
  >(undefined);

  const [fontsLoaded, fontsError] = useFonts({
    "Nunito-Regular": require("../../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Medium": require("../../assets/fonts/Nunito-Medium.ttf"),
    "Nunito-SemiBold": require("../../assets/fonts/Nunito-SemiBold.ttf"),
    "Nunito-Bold": require("../../assets/fonts/Nunito-Bold.ttf"),
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTheme() {
      const stored = await loadThemeOverride();
      if (isMounted) setInitialThemeOverride(stored);
    }

    void loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const appIsReady =
    (fontsLoaded || !!fontsError) && initialThemeOverride !== undefined;

  function onLayoutRootView() {
    if (appIsReady) {
      void SplashScreen.hideAsync();
    }
  }

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider
        colorScheme={colorScheme}
        initialOverride={initialThemeOverride}
      >
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </ThemeProvider>
    </View>
  );
}
