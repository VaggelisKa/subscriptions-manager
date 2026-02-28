import { use, useState } from "react";
import { Stack } from "expo-router/stack";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { AuthContext } from "@/providers/auth-provider";
import { LoginForm } from "@/components/login-form";

export default function LoginScreen() {
  const { signIn, signUp } = use(AuthContext);

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

  function handleForgotPassword() {
    router.push("/forgot-password");
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign In", headerShown: false }} />
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
        onForgotPassword={handleForgotPassword}
      />
    </>
  );
}
