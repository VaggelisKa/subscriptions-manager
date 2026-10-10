import { useEffect, useState } from "react";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/providers/auth-provider";
import {
  ThemeProvider,
  useTheme,
  useThemeColors,
} from "@/providers/theme-provider";
import type { ThemePreference } from "@/lib/theme-preference";
import { loadThemePreference } from "@/lib/theme-storage";
import { useAppFonts } from "@/lib/fonts";
import { useColorScheme, View } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const colors = useThemeColors();
  const { colorScheme } = useTheme();

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      {/* Each group has its own Stack, header styling and auth redirect. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialTheme, setInitialTheme] = useState<
    ThemePreference | undefined
  >(undefined);

  const fontsReady = useAppFonts();

  useEffect(() => {
    let isMounted = true;

    async function loadTheme() {
      const stored = await loadThemePreference();
      if (isMounted) setInitialTheme(stored);
    }

    void loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const appIsReady = fontsReady && initialTheme !== undefined;

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
        initialTheme={initialTheme}
      >
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </View>
  );
}
