import { use, useState } from "react";
import { KeyboardAvoidingView, ScrollView, useWindowDimensions } from "react-native";
import { Stack } from "expo-router/stack";
import Head from "expo-router/head";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { LoginForm } from "@/components/login-form";
import { CodeStep } from "@/components/auth/code-step";
import { haptics } from "@/lib/haptics";
import { spacing } from "@/lib/theme";

/** Waiting for an emailed code: to sign in, or to confirm a new account's email. */
type CodeRequest = { email: string; purpose: "sign-in" | "sign-up" };

export default function LoginScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    signIn,
    signUp,
    sendSignInCode,
    resendSignUpCode,
    verifyEmailCode,
  } = use(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState<"password" | "code" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeRequest, setCodeRequest] = useState<CodeRequest | null>(null);

  // Like apps/web's login page: centred from 640px (`sm:`) on web; iOS keeps its layout.
  const isWeb = process.env.EXPO_OS === "web";
  const centered = isWeb && width >= 640;

  async function handleSubmit() {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      haptics.warning();
      return;
    }

    setLoading("password");
    setError(null);

    const address = email.trim();
    const result = isSignUp
      ? await signUp(address, password)
      : await signIn(address, password);

    if (result.error) {
      setError(result.error);
      haptics.error();
    } else if (result.needsConfirmation) {
      setCodeRequest({ email: address, purpose: "sign-up" });
    }

    setLoading(null);
  }

  async function handleEmailCode() {
    if (loading) return;
    if (!email.trim()) {
      setError("Enter your email address");
      haptics.warning();
      return;
    }

    setLoading("code");
    setError(null);

    const address = email.trim();
    const result = await sendSignInCode(address);
    if (result.error) {
      setError(result.error);
      haptics.error();
    } else {
      setCodeRequest({ email: address, purpose: "sign-in" });
    }

    setLoading(null);
  }

  function handleToggleSignUp() {
    haptics.selection();
    setIsSignUp(!isSignUp);
    setError(null);
  }

  async function verifyCode(code: string) {
    if (!codeRequest) return;
    // On success the session lands and the (auth) layout sends you home.
    return (await verifyEmailCode(codeRequest.email, code)).error;
  }

  async function resendCode() {
    if (!codeRequest) return;
    const result =
      codeRequest.purpose === "sign-in"
        ? await sendSignInCode(codeRequest.email)
        : await resendSignUpCode(codeRequest.email);
    return result.error;
  }

  const title = codeRequest ? "Check your email" : "Sign in";

  return (
    <>
      <Stack.Screen options={{ title, headerShown: false }} />
      <Head>
        <title>{title}</title>
      </Head>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: centered ? "center" : "flex-start",
            paddingTop: centered ? 24 : Math.max(40, insets.top + 34),
            paddingBottom: isWeb ? 24 : insets.bottom + spacing.lg,
            paddingHorizontal: 22,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {codeRequest ? (
            <CodeStep
              key={`${codeRequest.purpose}:${codeRequest.email}`}
              title={codeRequest.purpose === "sign-in" ? "Check your email" : "Confirm your email"}
              subtitle={
                codeRequest.purpose === "sign-in"
                  ? `We sent a sign-in code to ${codeRequest.email}. Enter it to see your subscriptions.`
                  : `We sent a code to ${codeRequest.email}. Enter it to finish creating your account.`
              }
              submitTitle={codeRequest.purpose === "sign-in" ? "Sign in" : "Confirm email"}
              onSubmit={verifyCode}
              onResend={resendCode}
              onChangeEmail={() => {
                setCodeRequest(null);
                setError(null);
              }}
            />
          ) : (
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
              onEmailCode={handleEmailCode}
              centered={centered}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
