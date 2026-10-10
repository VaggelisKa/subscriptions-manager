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
import { loadThemeOverride, type ThemeOverride } from "@/lib/user-options";
import { useFonts } from "expo-font";
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
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </View>
  );
}
