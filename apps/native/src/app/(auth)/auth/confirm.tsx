import { use, useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { spacing } from "@/lib/theme";
import { AppMark } from "@/components/auth/app-mark";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthLoading } from "@/components/auth/auth-loading";
import { Button } from "@/components/auth/button";

const linkTypes: readonly EmailOtpType[] = [
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

function isLinkType(value: unknown): value is EmailOtpType {
  return typeof value === "string" && (linkTypes as readonly string[]).includes(value);
}

// A token_hash works once; a remounted screen (or a re-run effect) waits for the same request.
const verifications = new Map<string, Promise<{ error?: string }>>();

/**
 * /auth/confirm?token_hash=…&type=…: the link in transitional emails (spec §9.3). Web-only in
 * practice; at cutover `/api/auth/confirm` redirects here with its query. Removed in Phase 7.
 */
export default function ConfirmEmailLinkScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token_hash: tokenHash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();
  const { verifyEmailLink } = use(AuthContext);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (typeof tokenHash !== "string" || !tokenHash || !isLinkType(type)) {
        setFailed(true);
        return;
      }
      let verification = verifications.get(tokenHash);
      if (!verification) {
        verification = verifyEmailLink(tokenHash, type).catch(() => ({
          error: "Couldn't verify the link.",
        }));
        verifications.set(tokenHash, verification);
      }
      const { error } = await verification;
      if (cancelled) return;
      if (error) setFailed(true);
      else router.replace(type === "recovery" ? "/reset-password" : "/");
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type]);

  if (!failed) {
    return (
      <>
        <Head>
          <title>Signing in…</title>
        </Head>
        <AuthLoading />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Link expired</title>
      </Head>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: Math.max(40, insets.top + 34),
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: 22,
        }}
      >
        <View style={{ gap: 22, maxWidth: 420, width: "100%", alignSelf: "center" }}>
          <AppMark />
          <AuthHeading
            title="Link expired"
            subtitle="This link has expired or was already used. Sign in with a code instead: we'll email you a new one."
          />
          <Button
            title="Sign in with a code"
            onPress={() => router.replace("/login")}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </>
  );
}
