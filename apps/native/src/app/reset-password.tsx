import { use, useRef, useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  type TextInputInstance,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { spacing } from "@/lib/theme";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/auth/button";

export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const { updatePassword, clearPasswordRecovery } = use(AuthContext);
  const router = useRouter();
  const confirmRef = useRef<TextInputInstance>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
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
    } else {
      haptics.success();
      clearPasswordRecovery();
      router.replace("/");
    }

    setLoading(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
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
            <AuthHeading
              title="Create new password"
              subtitle="Choose a password with at least 6 characters."
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
                onSubmitEditing={handleSubmit}
              />
              <FormError message={error} />
            </View>

            <Button
              title="Update password"
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
