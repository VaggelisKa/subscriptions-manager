import { use, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

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

export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const { updatePassword } = use(AuthContext);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function handleDeepLink() {
      const url = await Linking.getInitialURL();
      if (!url || !url.includes("reset-password")) {
        setInitializing(false);
        return;
      }

      const params = parseHashParams(url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setError(error.message);
        } else {
          setSessionReady(true);
        }
      }

      setInitializing(false);
    }

    handleDeepLink();
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (!url.includes("reset-password")) return;

      const params = parseHashParams(url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (!error) setSessionReady(true);
        });
      }
    });

    return () => subscription.remove();
  }, []);

  async function handleSubmit() {
    if (!password.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updatePassword(password);

    if (result.error) {
      setError(result.error);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/");
    }

    setLoading(false);
  }

  const inputStyle = {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: error ? colors.destructive : colors.input,
    borderRadius: radius.md,
    padding: spacing.md,
    borderCurve: "continuous" as const,
  };

  if (initializing) {
    return (
      <>
        <Stack.Screen options={{ title: "Create New Password" }} />
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
      </>
    );
  }

  if (!sessionReady && !error) {
    return (
      <>
        <Stack.Screen options={{ title: "Create New Password" }} />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: spacing.xl,
          }}
        >
          <View
            style={{
              gap: spacing.xl,
              maxWidth: 340,
              alignSelf: "center",
              width: "100%",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.mutedForeground,
                textAlign: "center",
              }}
            >
              Open the password reset link from your email to create a new
              password.
            </Text>
          </View>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Create New Password" }} />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              gap: spacing.xl,
              maxWidth: 340,
              alignSelf: "center",
              width: "100%",
            }}
          >
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 28,
                  color: colors.foreground,
                  textAlign: "center",
                }}
              >
                Create new password
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 15,
                  color: colors.mutedForeground,
                  textAlign: "center",
                }}
              >
                Enter your new password below.
              </Text>
            </View>

            <View style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 14,
                    color: error ? colors.destructive : colors.foreground,
                  }}
                >
                  New Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError(null);
                  }}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  style={inputStyle}
                />
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 14,
                    color: error ? colors.destructive : colors.foreground,
                  }}
                >
                  Confirm Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError(null);
                  }}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType="newPassword"
                  style={inputStyle}
                />
              </View>

              {error && (
                <Text
                  selectable
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 13,
                    color: colors.destructive,
                  }}
                >
                  {error}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                padding: spacing.md,
                alignItems: "center",
                opacity: pressed || loading ? 0.7 : 1,
                borderCurve: "continuous",
              })}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.semiBold,
                    fontSize: 15,
                    color: colors.primaryForeground,
                  }}
                >
                  Update Password
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
