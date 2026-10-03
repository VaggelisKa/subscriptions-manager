import { Text, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, spacing } from "@/lib/theme";

type HeadingProps = {
  title: string;
  subtitle?: string;
};

/** Left-aligned heavy title with a muted subtitle. */
export function AuthHeading({ title, subtitle }: HeadingProps) {
  const colors = useThemeColors();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.black,
          fontSize: 30,
          lineHeight: 33,
          letterSpacing: -0.75,
          color: colors.foreground,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 16,
            lineHeight: 22,
            color: colors.mutedForeground,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Inline form error, announced to screen readers. */
export function FormError({ message }: { message: string | null }) {
  const colors = useThemeColors();
  if (!message) return null;

  return (
    <Text
      selectable
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        fontFamily: fonts.semiBold,
        fontSize: 14,
        lineHeight: 19,
        paddingHorizontal: spacing.xs,
        color: colors.destructive,
      }}
    >
      {message}
    </Text>
  );
}
