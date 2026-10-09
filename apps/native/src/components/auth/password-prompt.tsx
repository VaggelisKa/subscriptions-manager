import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { radius, spacing, type } from "@/lib/theme";
import { FormError } from "@/components/auth/auth-heading";
import { Button } from "@/components/auth/button";
import { TextField } from "@/components/auth/text-field";

type Props = {
  title: string;
  message: string;
  confirmTitle: string;
  /** Keeps the confirm button spinning after `onConfirm` succeeds, e.g. while a follow-up request runs. */
  busy?: boolean;
  /** Resolves with an error message to show under the field, or nothing on success. */
  onConfirm: (password: string) => Promise<string | undefined>;
  onCancel: () => void;
};

/**
 * Centered password dialog for re-authentication. A React Native Modal, so it looks and behaves the
 * same on iOS and Android (Alert.prompt is iOS-only). Mount it to show it; unmount it to dismiss.
 */
export function PasswordPrompt({
  title,
  message,
  confirmTitle,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const colors = useThemeColors();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loading = submitting || busy;

  async function submit() {
    if (!password || loading) return;
    setSubmitting(true);
    setError(null);
    let result: string | undefined;
    try {
      result = await onConfirm(password);
    } catch {
      result = "Something went wrong. Please try again.";
    }
    // On success the dialog stays locked until it unmounts.
    if (result) {
      setSubmitting(false);
      setError(result);
      setPassword("");
    }
  }

  // Cancelling is allowed while the password is being checked, not once the deletion has resumed.
  function cancel() {
    if (!busy) onCancel();
  }

  return (
    <Modal
      visible
      transparent
      presentationStyle="overFullScreen"
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={cancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: spacing.xl }}
      >
        <Pressable
          accessible={false}
          onPress={cancel}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
          }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 420,
            alignSelf: "center",
            gap: spacing.lg,
            padding: spacing.xl,
            borderRadius: radius.sheet,
            borderCurve: "continuous",
            backgroundColor: colors.background,
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
          }}
        >
          <View style={{ gap: spacing.sm }}>
            <Text
              accessibilityRole="header"
              style={{ ...type.title, color: colors.foreground }}
            >
              {title}
            </Text>
            <Text style={{ ...type.body, color: colors.mutedForeground }}>
              {message}
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <TextField
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              error={!!error}
              editable={!loading}
              autoFocus
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <FormError message={error} />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Button
              title={confirmTitle}
              variant="destructive"
              loading={loading}
              disabled={!password}
              onPress={submit}
            />
            <Button
              title="Cancel"
              variant="plain"
              disabled={busy}
              onPress={cancel}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
