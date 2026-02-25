import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router/stack";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

export default function LoginScreen() {
  const colors = useThemeColors();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    const result = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    if (result.error) {
      console.log(result.error);
      setError(result.error);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    setLoading(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign In", headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                Subscriptions Manager
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 15,
                  color: colors.mutedForeground,
                  textAlign: "center",
                }}
              >
                {isSignUp
                  ? "Create an account to get started"
                  : "Sign in to manage your subscriptions"}
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
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your-email@some.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 15,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: error ? colors.destructive : colors.input,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    borderCurve: "continuous",
                  }}
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
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                  textContentType={isSignUp ? "newPassword" : "password"}
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 15,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: error ? colors.destructive : colors.input,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    borderCurve: "continuous",
                  }}
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

            <View style={{ gap: spacing.md }}>
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
                    {isSignUp ? "Sign Up" : "Sign In"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                style={{ alignItems: "center", padding: spacing.sm }}
              >
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 14,
                    color: colors.mutedForeground,
                  }}
                >
                  {isSignUp
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
