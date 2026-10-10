import { use, useState } from "react";
import { View, KeyboardAvoidingView, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import Head from "expo-router/head";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { spacing } from "@/lib/theme";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/auth/button";
import { SuccessBadge } from "@/components/auth/success-badge";

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { resetPassword } = use(AuthContext);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      setError("Please enter your email address");
      haptics.warning();
      return;
    }

    setLoading(true);
    setError(null);

    const result = await resetPassword(email.trim());

    if (result.error) {
      setError(result.error);
      haptics.error();
    } else {
      setSent(true);
      haptics.success();
    }

    setLoading(false);
  }

  function handleBackToSignIn() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Head>
        <title>Forgot password</title>
      </Head>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View
            style={{
              gap: spacing.xxl,
              maxWidth: 420,
              alignSelf: "center",
              width: "100%",
            }}
          >
            {sent ? (
              <>
                <View style={{ gap: 22 }}>
                  <SuccessBadge />
                  <AuthHeading
                    title="Check your email"
                    subtitle={`We sent a reset link to ${email.trim()}. Open it on this device to choose a new password.`}
                  />
                </View>
                <Button title="Back to sign in" onPress={handleBackToSignIn} />
              </>
            ) : (
              <>
                <AuthHeading
                  title="Forgot password?"
                  subtitle="Enter your email and we'll send you a link to reset it."
                />

                <View style={{ gap: 10 }}>
                  <TextField
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    placeholder="Email"
                    error={!!error}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                  />
                  <FormError message={error} />
                </View>

                <Button
                  title="Send reset link"
                  onPress={handleSubmit}
                  loading={loading}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
