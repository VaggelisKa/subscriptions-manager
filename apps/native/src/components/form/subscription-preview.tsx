import { StyleSheet, Text, View } from "react-native";
import type { IntervalEnum } from "@subscriptions-manager/shared/types";
import { useThemeColors } from "@/providers/theme-provider";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { monthlyEquivalent, yearlyEquivalent } from "@subscriptions-manager/shared/billing";
import { formatNumber, formatWholeKr, intervalSuffix } from "@subscriptions-manager/shared/format";
import { fonts, radius, spacing } from "@/lib/theme";

type Props = {
  name: string;
  /** Parsed price, or `null` while the field is empty or invalid. */
  price: number | null;
  interval: IntervalEnum;
  color: string | null | undefined;
};

/**
 * What the subscription will look like in the list, updated as the form is
 * filled in. A card of its own here; on iOS (`.ios.tsx`) a SwiftUI form row.
 */
export function SubscriptionPreview({ name, price, interval, color }: Props) {
  const colors = useThemeColors();
  const trimmed = name.trim();

  const perMonth = `≈ ${formatWholeKr(monthlyEquivalent(price ?? 0, interval))} a month`;
  const perYear = `${formatWholeKr(yearlyEquivalent(price ?? 0, interval))} a year`;
  const meta =
    price === null
      ? "Add a price to see the yearly cost"
      : interval === "month"
        ? perYear
        : interval === "year"
          ? perMonth
          : `${perMonth} · ${perYear}`;

  return (
    // Decorative: the fields below say the same thing.
    <View aria-hidden style={[styles.card, { backgroundColor: colors.surface }]}>
      <SubscriptionTile name={trimmed} color={color} size={44} />
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: trimmed ? colors.foreground : colors.faint }]}
        >
          {trimmed || "New subscription"}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.mutedForeground }]}>
          {meta}
        </Text>
      </View>
      <Text style={[styles.price, { color: price === null ? colors.faint : colors.foreground }]}>
        {`${formatNumber(price ?? 0)} kr`}
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {intervalSuffix[interval]}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderCurve: "continuous",
  },
  main: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  meta: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  price: {
    flexShrink: 0,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
});
