import { useRef } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import {
  Button,
  Form,
  Host,
  SecureField,
  Section,
  Text as SwiftText,
  TextField,
  type SecureFieldRef,
  type TextFieldRef,
} from "@expo/ui/swift-ui";
import {
  buttonStyle,
  disabled,
  onTapGesture,
  scrollDismissesKeyboard,
  submitLabel,
} from "@expo/ui/swift-ui/modifiers";
import { fonts, radius, spacing } from "@/lib/theme";
import { useTheme, useThemeColors } from "@/providers/theme-provider";

type Props = {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isSignUp: boolean;
  onToggleSignUp: () => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
  onForgotPassword: () => void;
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
  onForgotPassword,
}: Props) {
  const { colorScheme } = useTheme();
  const colors = useThemeColors();
  const emailInputRef = useRef<TextFieldRef>(null);
  const passwordInputRef = useRef<SecureFieldRef>(null);

  function dismissFormKeyboard() {
    void emailInputRef.current?.blur();
    void passwordInputRef.current?.blur();
  }

  if (process.env.EXPO_OS !== "ios" && process.env.EXPO_OS !== "tvos") {
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
      <View
        style={{
          gap: spacing.xl,
          maxWidth: 340,
          alignSelf: "center",
          width: "100%",
          justifyContent: "center",
          flex: 1,
          padding: spacing.xl,
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
              style={inputStyle}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 14,
                  color: error ? colors.destructive : colors.foreground,
                }}
              >
                Password
              </Text>
              {!isSignUp && (
                <Pressable
                  onPress={onForgotPassword}
                  style={{ paddingVertical: spacing.xs }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13,
                      color: colors.mutedForeground,
                    }}
                  >
                    Forgot your password?
                  </Text>
                </Pressable>
              )}
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              textContentType={isSignUp ? "newPassword" : "password"}
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
            onPress={onSubmit}
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

          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 14,
              color: colors.mutedForeground,
              textAlign: "center",
            }}
          >
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text
              onPress={onToggleSignUp}
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 14,
                color: colors.primary,
              }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </Text>
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Host
      style={{ flex: 1 }}
      colorScheme={colorScheme}
      modifiers={[onTapGesture(dismissFormKeyboard)]}
    >
      <Form
        modifiers={[
          scrollDismissesKeyboard("immediately"),
          onTapGesture(dismissFormKeyboard),
        ]}
      >
        <Section title="Subscriptions Manager">
          <SwiftText>
            {isSignUp
              ? "Create an account to get started."
              : "Sign in to manage your subscriptions."}
          </SwiftText>
        </Section>
        <Section title="Account">
          <TextField
            ref={emailInputRef}
            key={`email-${isSignUp ? "signup" : "signin"}`}
            defaultValue={email}
            placeholder="your-email@some.com"
            keyboardType="email-address"
            autocorrection={false}
            onChangeText={setEmail}
            onSubmit={() => {
              void passwordInputRef.current?.focus();
            }}
            modifiers={[submitLabel("next")]}
          />
          <SecureField
            ref={passwordInputRef}
            key={`password-${isSignUp ? "signup" : "signin"}`}
            defaultValue={password}
            placeholder="Password"
            onChangeText={setPassword}
            onSubmit={onSubmit}
            modifiers={[submitLabel("done")]}
          />
          {!isSignUp && (
            <Button
              label="Forgot your password?"
              onPress={onForgotPassword}
              modifiers={[buttonStyle("plain"), disabled(loading)]}
            />
          )}
        </Section>
        {error && (
          <Section title="Error">
            <SwiftText>{error}</SwiftText>
          </Section>
        )}
        <Section>
          <Button
            label={loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            onPress={onSubmit}
            modifiers={[buttonStyle("borderedProminent"), disabled(loading)]}
          />
          <Button
            label={
              isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"
            }
            onPress={onToggleSignUp}
            modifiers={[buttonStyle("plain"), disabled(loading)]}
          />
        </Section>
      </Form>
    </Host>
  );
}
