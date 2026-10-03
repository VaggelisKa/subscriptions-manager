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
import { fonts } from "@/lib/theme";
import { BootstrapErrorView } from "@/components/auth/bootstrap-error-view";

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
      <BootstrapErrorView
        message={bootstrapError}
        onRetry={() => {
          void retryBootstrap();
        }}
        onContinue={clearBootstrapError}
      />
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
            fontFamily: fonts.extraBold,
            color: colors.foreground,
          },
          headerLargeTitleStyle: {
            fontFamily: fonts.black,
            color: colors.foreground,
          },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Protected guard={isLoggedIn}>
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
            name="reset-password"
            options={{ title: "" }}
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
              contentStyle: { backgroundColor: "transparent" },
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
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password"
            options={{ title: "" }}
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
    "Nunito-ExtraBold": require("../../assets/fonts/Nunito-ExtraBold.ttf"),
    "Nunito-Black": require("../../assets/fonts/Nunito-Black.ttf"),
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
