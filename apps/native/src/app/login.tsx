import { useState } from "react";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { Stack } from "expo-router/stack";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { LoginForm } from "@/components/login-form";
import { spacing } from "@/lib/theme";

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
      setError(result.error);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    setLoading(false);
  }

  function handleToggleSignUp() {
    setIsSignUp(!isSignUp);
    setError(null);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign In", headerShown: false }} />
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
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            isSignUp={isSignUp}
            onToggleSignUp={handleToggleSignUp}
            loading={loading}
            error={error}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
