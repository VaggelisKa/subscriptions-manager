import { useRef } from "react";
import { View, Text, Pressable, type TextInputInstance } from "react-native";
import { Link } from "expo-router";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, spacing } from "@/lib/theme";
import { AppMark } from "@/components/auth/app-mark";
import { AuthHeading, FormError } from "@/components/auth/auth-heading";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/auth/button";

type Props = {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isSignUp: boolean;
  onToggleSignUp: () => void;
  /** Which request is running: the password sign-in/up, or "Email me a code". */
  loading: "password" | "code" | null;
  error: string | null;
  onSubmit: () => void;
  onEmailCode: () => void;
  /** Content is centred on the page (wide web), so the toggle follows the buttons. */
  centered?: boolean;
};

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  isSignUp,
  onToggleSignUp,
  loading,
  error,
  onSubmit,
  onEmailCode,
  centered = false,
}: Props) {
  const colors = useThemeColors();
  const passwordRef = useRef<TextInputInstance>(null);

  return (
    <View
      style={{
        flexGrow: centered ? 0 : 1,
        maxWidth: 420,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <AppMark />

      <View style={{ marginTop: 22 }}>
        <AuthHeading
          title={"Subscriptions\nManager"}
          subtitle={
            isSignUp
              ? "Create an account to start tracking."
              : "Sign in to see what's due next."
          }
        />
      </View>

      <View style={{ gap: 10, marginTop: spacing.xxl }}>
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          error={!!error}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          error={!!error}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          textContentType={isSignUp ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <FormError message={error} />
      </View>

      {isSignUp ? (
        <View style={{ height: spacing.lg }} />
      ) : (
        // Padding lives on the wrapper: `Link asChild` drops function styles.
        <View
          style={{
            alignItems: "flex-end",
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xs,
          }}
        >
          <Link
            href={{
              pathname: "/reset-password",
              params: email.trim() ? { email: email.trim() } : {},
            }}
            asChild
          >
            <Pressable hitSlop={12}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 14,
                  color: colors.primaryText,
                }}
              >
                Forgot password?
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      <View style={{ gap: 10, marginTop: 6 }}>
        <Button
          title={isSignUp ? "Sign up" : "Sign in"}
          onPress={onSubmit}
          loading={loading === "password"}
          disabled={loading === "code"}
        />
        {isSignUp ? null : (
          <Button
            title="Email me a code"
            variant="secondary"
            onPress={onEmailCode}
            loading={loading === "code"}
            disabled={loading === "password"}
          />
        )}
      </View>

      <View style={{ flexGrow: centered ? 0 : 1, minHeight: spacing.xl }} />

      <Pressable
        onPress={onToggleSignUp}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => ({
          alignSelf: "center",
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.mutedForeground,
            textAlign: "center",
          }}
        >
          {isSignUp ? "Already have an account? " : "New here? "}
          <Text style={{ fontFamily: fonts.bold, color: colors.primaryText }}>
            {isSignUp ? "Sign in" : "Create an account"}
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}
