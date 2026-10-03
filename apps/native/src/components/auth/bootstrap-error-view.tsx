import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { spacing } from "@/lib/theme";
import { AppMark } from "@/components/auth/app-mark";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/auth/button";

type Props = {
  message: string;
  onRetry: () => void;
  onContinue: () => void;
};

/** Shown when the stored session couldn't be restored on launch. */
export function BootstrapErrorView({ message, onRetry, onContinue }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 34,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: 22,
      }}
    >
      <View style={{ flex: 1, gap: 22, maxWidth: 420, width: "100%", alignSelf: "center" }}>
        <AppMark />
        <AuthHeading title="Couldn't restore your session" subtitle={message} />
      </View>

      <View style={{ gap: 10, maxWidth: 420, width: "100%", alignSelf: "center" }}>
        <Button
          title="Try again"
          onPress={() => {
            haptics.light();
            onRetry();
          }}
        />
        <Button title="Continue to sign in" variant="secondary" onPress={onContinue} />
      </View>
    </View>
  );
}
