import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/providers/theme-provider";
import { findBrand } from "@subscriptions-manager/shared/brands";
import { brandIcons } from "@/lib/icons";
import { fonts, withAlpha } from "@/lib/theme";

type Props = {
  name: string | null | undefined;
  /** Category colour (`#RRGGBB`); falls back to a neutral tile. */
  color: string | null | undefined;
  size?: number;
};

/**
 * The logo for well-known subscriptions (see `findBrand`), otherwise a
 * monogram tile: the first letter on a tint of the category colour.
 */
export function SubscriptionTile({ name, color, size = 40 }: Props) {
  const { colors, colorScheme } = useTheme();
  const brand = findBrand(name);
  const tile = {
    width: size,
    height: size,
    borderRadius: size * 0.3,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (brand) {
    return (
      <View
        style={[
          tile,
          { backgroundColor: brand.color },
          // Black logos would melt into dark surfaces without an edge.
          colorScheme === "dark" && {
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255, 255, 255, 0.18)",
          },
        ]}
      >
        <Image
          source={brandIcons[brand.slug]}
          contentFit="contain"
          style={{ width: size * 0.55, height: size * 0.55 }}
        />
      </View>
    );
  }

  const letter = name?.trim().charAt(0).toUpperCase() || "?";
  const hasColor = !!color && /^#[0-9a-f]{6}$/i.test(color);

  return (
    <View
      style={[
        tile,
        {
          backgroundColor: withAlpha(
            color,
            colorScheme === "dark" ? 0.24 : 0.14,
            colors.fill,
          ),
        },
      ]}
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
