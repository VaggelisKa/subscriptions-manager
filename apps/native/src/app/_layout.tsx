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
import { ActivityIndicator, useColorScheme, View } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const colors = useThemeColors();
  const { colorScheme } = useTheme();
  const { user, loading, isPasswordRecovery, isProcessingResetLink } =
    use(AuthContext);
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
  const [initialThemeOverride, setInitialThemeOverride] =
    useState<ThemeOverride | undefined>(undefined);

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
