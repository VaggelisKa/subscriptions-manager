import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import {
  ThemeProvider,
  useTheme,
  useThemeColors,
} from "@/providers/theme-provider";
import { useFonts } from "expo-font";
import { ActivityIndicator, useColorScheme, View } from "react-native";

function RootLayoutInner() {
  const colors = useThemeColors();
  const { colorScheme } = useTheme();
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;

  if (loading) {
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
            name="subscription-form"
            options={{
              presentation: "formSheet",
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.75, 1],
              headerTransparent: true,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            <Stack.Header style={{ backgroundColor: "transparent" }} />
          </Stack.Screen>
        </Stack.Protected>

        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontsError] = useFonts({
    "Nunito-Regular": require("../../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Medium": require("../../assets/fonts/Nunito-Medium.ttf"),
    "Nunito-SemiBold": require("../../assets/fonts/Nunito-SemiBold.ttf"),
    "Nunito-Bold": require("../../assets/fonts/Nunito-Bold.ttf"),
  });

  if (!fontsLoaded && !fontsError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colorScheme === "dark" ? "#0f0f0f" : "#ffffff",
        }}
      >
        <ActivityIndicator
          size="large"
          color={colorScheme === "dark" ? "#f97316" : "#ea580c"}
        />
      </View>
    );
  }

  return (
    <ThemeProvider colorScheme={colorScheme}>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
