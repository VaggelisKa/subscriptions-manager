import { ActivityIndicator, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";

/** Shown while the stored session is restored, or a password reset link is processed. */
export function AuthLoading() {
  const colors = useThemeColors();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
