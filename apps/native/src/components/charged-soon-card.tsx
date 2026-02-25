import { View, Text } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import {
  numberFormatOptions,
  getRelativeDateFromTimestamp,
} from "@subscriptions-manager/shared";
import { fonts, radius, spacing } from "@/lib/theme";

type Props = {
  name: string;
  price: number;
  billedAt: string;
};

const styles = {
  chargedSoonCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minWidth: 140,
    gap: spacing.sm,
    borderCurve: "continuous" as const,
  },
  cardGap2: { gap: 2 },
  chargedSoonTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  chargedSoonPrice: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    fontVariant: ["tabular-nums"] as const,
  },
};

export function ChargedSoonCard({ name, price, billedAt }: Props) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.chargedSoonCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardGap2}>
        <Text
          numberOfLines={1}
          style={[styles.chargedSoonTitle, { color: colors.foreground }]}
        >
          {name}
        </Text>
        <Text style={[styles.bodySm, { color: colors.mutedForeground }]}>
          {getRelativeDateFromTimestamp(billedAt)}
        </Text>
      </View>
      <Text
        selectable
        style={[styles.chargedSoonPrice, { color: colors.foreground }]}
      >
        {price.toLocaleString("en-DK", {
          ...numberFormatOptions,
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        })}
      </Text>
    </View>
  );
}
