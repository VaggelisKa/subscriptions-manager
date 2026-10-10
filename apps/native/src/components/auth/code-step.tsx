import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { fonts, spacing } from "@/lib/theme";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { Button } from "@/components/auth/button";
import { SuccessBadge } from "@/components/auth/success-badge";
import { TextField } from "@/components/auth/text-field";

type Props = {
  title: string;
  subtitle: string;
  submitTitle: string;
  /** Resolves with an error message, or nothing once the code is accepted. */
  onSubmit: (code: string) => Promise<string | undefined>;
  /** Emails a new code; resolves with an error message, or nothing once sent. */
  onResend: () => Promise<string | undefined>;
  onChangeEmail: () => void;
};

/**
 * "Check your email" step for an emailed one-time code (sign-in, sign-up confirmation, password
 * reset). Looks like apps/web's /login/confirmation, with the code field and a resend.
 */
export function CodeStep({ title, subtitle, submitTitle, onSubmit, onResend, onChangeEmail }: Props) {
  const colors = useThemeColors();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit() {
    if (loading) return;
    if (!code.trim()) {
      setError("Enter the code from the email.");
      haptics.warning();
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    let result: string | undefined;
    try {
      result = await onSubmit(code);
    } catch {
      result = "Something went wrong. Please try again.";
    }
    if (result) {
      setError(result);
      haptics.error();
      setLoading(false);
    } else {
      // Stays busy: the screen navigates away once the session lands.
      haptics.success();
    }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    let result: string | undefined;
    try {
      result = await onResend();
    } catch {
      result = "Something went wrong. Please try again.";
    }
    if (result) {
      setError(result);
      haptics.error();
    } else {
      setCode("");
      setNotice("We sent you a new code.");
      haptics.success();
    }
    setResending(false);
  }

  return (
    <View style={{ maxWidth: 420, width: "100%", alignSelf: "center" }}>
      <SuccessBadge />
      <View style={{ marginTop: 22 }}>
        <AuthHeading title={title} subtitle={subtitle} />
      </View>

      <View style={{ gap: 10, marginTop: spacing.xxl }}>
        <TextField
          value={code}
          onChangeText={(text) => {
            // Codes are digits; drop spaces and dashes from a pasted one.
            setCode(text.replace(/[^0-9]/g, ""));
            setError(null);
          }}
          placeholder="Code"
          error={!!error}
          autoFocus
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={10}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <FormError message={error} />
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              fontFamily: fonts.semiBold,
              fontSize: 14,
              lineHeight: 19,
              paddingHorizontal: spacing.xs,
              color: colors.mutedForeground,
            }}
          >
            {notice}
          </Text>
        ) : null}
        <Button title={submitTitle} onPress={submit} loading={loading} style={{ marginTop: 6 }} />
        <Button title="Send a new code" variant="plain" onPress={resend} loading={resending} />
      </View>

      <Pressable
        onPress={onChangeEmail}
        accessibilityRole="link"
        hitSlop={8}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          marginTop: spacing.lg,
          paddingHorizontal: spacing.xs,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.primaryText }}>
          Use a different email
        </Text>
      </Pressable>
    </View>
  );
}
