import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius } from "@/lib/theme";

type Variant = "primary" | "secondary" | "plain";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-width 52pt button.
 * - primary: orange fill, white text
 * - secondary: translucent fill, foreground text
 * - plain: no fill, orange text
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const colors = useThemeColors();
  const inactive = disabled || loading;

  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.fill
        : "transparent";
  const color =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "secondary"
        ? colors.foreground
        : colors.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor,
          opacity: disabled && !loading ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text
          style={{
            fontFamily: variant === "primary" ? fonts.extraBold : fonts.bold,
            fontSize: 16.5,
            color,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
