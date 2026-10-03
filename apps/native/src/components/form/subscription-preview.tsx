import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { IntervalEnum } from "@subscriptions-manager/shared";
import { useThemeColors } from "@/providers/theme-provider";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { monthlyEquivalent, yearlyEquivalent } from "@/lib/billing";
import { formatNumber, formatWholeKr, intervalSuffix } from "@/lib/format";
import { fonts, spacing } from "@/lib/theme";

type Props = {
  name: string;
  /** Parsed price, or `null` while the field is empty or invalid. */
  price: number | null;
  interval: IntervalEnum;
  color: string | null | undefined;
};

/** What the subscription will look like in the list, updated as the form is filled in. */
export function SubscriptionPreview({ name, price, interval, color }: Props) {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
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
    // RNHostView sizes to the content's natural width, so a long name would
    // push the price off-screen. Pin it to the row: window minus form margins.
    <View style={[styles.row, { width: windowWidth - FORM_MARGIN * 2 }]}>
      <SubscriptionTile name={trimmed || null} color={color} size={44} />
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: trimmed ? colors.foreground : colors.faint },
          ]}
        >
          {trimmed || "New subscription"}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.meta, { color: colors.mutedForeground }]}
        >
          {meta}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: price === null ? colors.faint : colors.foreground },
        ]}
      >
        {formatNumber(price ?? 0)} kr
        <Text style={[styles.suffix, { color: colors.mutedForeground }]}>
          {intervalSuffix[interval]}
        </Text>
      </Text>
    </View>
  );
}

/** Horizontal margin of an inset-grouped SwiftUI Form section on iPhone. */
const FORM_MARGIN = 16;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    minHeight: 72,
  },
  main: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  meta: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  amount: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  suffix: { fontFamily: fonts.semiBold, fontSize: 13 },
});
