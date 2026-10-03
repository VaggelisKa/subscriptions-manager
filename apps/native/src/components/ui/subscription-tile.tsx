import { Text, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";
import { fonts, withAlpha } from "@/lib/theme";

type Props = {
  name: string | null | undefined;
  /** Category colour (`#RRGGBB`); falls back to a neutral tile. */
  color: string | null | undefined;
  size?: number;
};

/** Monogram tile: the first letter on a tint of the category colour. */
export function SubscriptionTile({ name, color, size = 40 }: Props) {
  const { colors, colorScheme } = useTheme();
  const letter = name?.trim().charAt(0).toUpperCase() || "?";
  const hasColor = !!color && /^#[0-9a-f]{6}$/i.test(color);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: withAlpha(
          color,
          colorScheme === "dark" ? 0.24 : 0.14,
          colors.fill,
        ),
      }}
    >
      <Text
        style={{
          fontFamily: fonts.black,
          fontSize: Math.round(size * 0.44),
          color: hasColor ? color : colors.mutedForeground,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
