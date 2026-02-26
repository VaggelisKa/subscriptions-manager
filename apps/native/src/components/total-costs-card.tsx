import { View, Text } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { numberFormatOptions } from "@subscriptions-manager/shared";
import { fonts, radius, spacing } from "@/lib/theme";

type Props = {
  total: number;
  monthlyTotal: number;
};

const styles = {
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
    borderCurve: "continuous" as const,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  },
  cardGap2: { gap: 2 },
  titleLarge: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  totalAmount: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontVariant: ["tabular-nums"] as const,
  },
  monthlyLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  monthlyLabelMuted: {
    fontFamily: fonts.regular,
  },
};

export function TotalCostsCard({ total, monthlyTotal }: Props) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardGap2}>
        <Text style={[styles.titleLarge, { color: colors.foreground }]}>
          Total costs
        </Text>
        <Text style={[styles.bodySm, { color: colors.mutedForeground }]}>
          Aggregation of all your subscriptions
        </Text>
      </View>
      <Text
        selectable
        style={[styles.totalAmount, { color: colors.primary }]}
      >
        {total.toLocaleString("en-DK", {
          ...numberFormatOptions,
          notation: "standard",
        })}
      </Text>
      {monthlyTotal > 0 && (
        <Text style={[styles.monthlyLabel, { color: colors.foreground }]}>
          {monthlyTotal.toLocaleString("en-DK", {
            ...numberFormatOptions,
            notation: "standard",
            minimumFractionDigits: 0,
          })}{" "}
          <Text
            style={[
              styles.monthlyLabelMuted,
              { color: colors.mutedForeground },
            ]}
          >
            of which is monthly
          </Text>
        </Text>
      )}
    </View>
  );
}
