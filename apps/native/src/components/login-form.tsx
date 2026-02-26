import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";

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
}: Props) {
  const colors = useThemeColors();

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
    <View style={{ gap: spacing.xl, maxWidth: 340, alignSelf: "center", width: "100%" }}>
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
