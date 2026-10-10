import { use, useRef, useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  type TextInputInstance,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { resetStep } from "@/lib/password-reset";
import { spacing } from "@/lib/theme";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/auth/button";
import { CodeStep } from "@/components/auth/code-step";

const titles = {
  email: "Reset password",
  code: "Check your email",
  password: "Create new password",
} as const;

/**
 * Code-based password reset (spec §9.4): email → code → new password. The code signs the user
 * in; until the new password is saved (or the reset is cancelled) the layouts keep them here,
 * also across a restart or reload.
 */
export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const {
    user,
    passwordResetPending,
    requestPasswordReset,
    verifyPasswordResetCode,
    updatePassword,
    cancelPasswordReset,
  } = use(AuthContext);
  const confirmRef = useRef<TextInputInstance>(null);

  const [localStep, setLocalStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = resetStep(passwordResetPending, !!user, localStep);

  async function handleSendCode() {
    if (loading) return;
    if (!email.trim()) {
      setError("Please enter your email address");
      haptics.warning();
      return;
    }

    setLoading(true);
    setError(null);

    const result = await requestPasswordReset(email.trim());

    if (result.error) {
      setError(result.error);
      haptics.error();
    } else {
      haptics.success();
      setLocalStep("code");
    }

    setLoading(false);
  }

  async function handleUpdatePassword() {
    if (loading) return;
    if (!password.trim()) {
      setError("Please enter a new password");
      haptics.warning();
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      haptics.warning();
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      haptics.warning();
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updatePassword(password);

    if (result.error) {
      setError(result.error);
      haptics.error();
      setLoading(false);
    } else {
      haptics.success();
      router.replace("/");
    }
  }

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    await cancelPasswordReset();
    router.replace("/login");
  }

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Head>
        <title>{titles[step]}</title>
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
          {step === "code" ? (
            <CodeStep
              key={email}
              title="Check your email"
              subtitle={`We sent a code to ${email.trim()}. Enter it to choose a new password.`}
              submitTitle="Continue"
              onSubmit={async (code) =>
                (await verifyPasswordResetCode(email.trim(), code)).error
              }
              onResend={async () => (await requestPasswordReset(email.trim())).error}
              onChangeEmail={() => {
                setLocalStep("email");
                setError(null);
              }}
            />
          ) : (
            <View
              style={{
                gap: spacing.xxl,
                maxWidth: 420,
                alignSelf: "center",
                width: "100%",
              }}
            >
              {step === "email" ? (
                <>
                  <AuthHeading
                    title="Forgot password?"
                    subtitle="Enter your email and we'll send you a code to reset it."
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
                      onSubmitEditing={handleSendCode}
                    />
                    <FormError message={error} />
                  </View>

                  <Button title="Send code" onPress={handleSendCode} loading={loading} />
                </>
              ) : (
                <>
                  <AuthHeading
                    title="Create new password"
                    subtitle={
                      user?.email
                        ? `Choose a new password for ${user.email}, with at least 6 characters.`
                        : "Choose a password with at least 6 characters."
                    }
                  />

                  <View style={{ gap: 10 }}>
                    <TextField
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError(null);
                      }}
                      placeholder="New password"
                      error={!!error}
                      autoFocus
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                    />
                    <TextField
                      ref={confirmRef}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setError(null);
                      }}
                      placeholder="Confirm password"
                      error={!!error}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleUpdatePassword}
                    />
                    <FormError message={error} />
                  </View>

                  <View style={{ gap: spacing.xs }}>
                    <Button
                      title="Update password"
                      onPress={handleUpdatePassword}
                      loading={loading}
                      disabled={cancelling}
                    />
                    <Button
                      title="Cancel"
                      variant="plain"
                      onPress={handleCancel}
                      loading={cancelling}
                      disabled={loading}
                    />
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
