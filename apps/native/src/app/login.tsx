import { use, useState } from "react";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { Stack } from "expo-router/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { LoginForm } from "@/components/login-form";
import { haptics } from "@/lib/haptics";
import { spacing } from "@/lib/theme";

export default function LoginScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = use(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      haptics.warning();
      return;
    }

    setLoading(true);
    setError(null);

    const result = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    if (result.error) {
      setError(result.error);
      haptics.error();
    }

    setLoading(false);
  }

  function handleToggleSignUp() {
    haptics.selection();
    setIsSignUp(!isSignUp);
    setError(null);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign in", headerShown: false }} />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 34,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: 22,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
