import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useAuth } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const { resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await resetPassword(email.trim());

    if (result.error) {
      setError(result.error);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else {
      setSent(true);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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

  return (
    <>
      <Stack.Screen options={{ title: "Reset Password" }} />
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
            {sent ? (
              <>
                <View style={{ gap: spacing.sm }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 28,
                      color: colors.foreground,
                      textAlign: "center",
                    }}
                  >
                    Check your email
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 15,
                      color: colors.mutedForeground,
                      textAlign: "center",
                    }}
                  >
                    We've sent a password reset link to {email}. Click the link
                    in the email to create a new password.
                  </Text>
                </View>

                <Link href="/login" asChild>
                  <Pressable
                    style={({ pressed }) => ({
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      alignItems: "center",
                      opacity: pressed ? 0.7 : 1,
                      borderCurve: "continuous",
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.semiBold,
                        fontSize: 15,
                        color: colors.primaryForeground,
                      }}
                    >
                      Back to Sign In
                    </Text>
                  </Pressable>
                </Link>
              </>
            ) : (
              <>
                <View style={{ gap: spacing.sm }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 28,
                      color: colors.foreground,
                      textAlign: "center",
                    }}
                  >
                    Forgot your password?
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 15,
                      color: colors.mutedForeground,
                      textAlign: "center",
                    }}
                  >
                    Enter your email and we'll send you a link to reset your
                    password.
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
                      onChangeText={(text) => {
                        setEmail(text);
                        setError(null);
                      }}
                      placeholder="your-email@some.com"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
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
                        Send Reset Link
                      </Text>
                    )}
                  </Pressable>

                  <Link href="/login" asChild>
                    <Pressable
                      style={{ alignItems: "center", padding: spacing.sm }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.regular,
                          fontSize: 14,
                          color: colors.mutedForeground,
                        }}
                      >
                        Back to Sign In
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
