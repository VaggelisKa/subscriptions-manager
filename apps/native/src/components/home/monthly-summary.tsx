import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Easing,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { endOfMonth, format } from "date-fns";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { useThemeColors } from "@/providers/theme-provider";
import { Amount } from "@/components/ui/amount";
import { chargesBetween, today, totalPerMonth } from "@/lib/billing";
import { formatWholeKr } from "@/lib/format";
import { fonts, spacing } from "@/lib/theme";

type Props = {
  subscriptions: SubscriptionWithCategory[];
};

/** Sum of every charge from today to the end of the month (weekly ones count each time). */
function stillToPayThisMonth(subscriptions: SubscriptionWithCategory[]) {
  const start = today();
  const end = endOfMonth(start);
  return subscriptions.reduce(
    (acc, s) =>
      acc +
      chargesBetween(s.billed_at, s.interval, start, end).length * (s.price ?? 0),
    0,
  );
}

/**
 * The headline: what everything costs per month, and what's left to pay this
 * month. The amount counts up once when the screen first mounts.
 */
export function MonthlySummary({ subscriptions }: Props) {
  const colors = useThemeColors();
  const reduceMotion = useReducedMotion();
  const total = totalPerMonth(subscriptions);
  const remaining = stillToPayThisMonth(subscriptions);
  const month = format(today(), "MMMM");

  // `null` once the count-up is done (or skipped): show the live total.
  const [counting, setCounting] = useState<number | null>(
    reduceMotion ? null : 0,
  );
  const count = useSharedValue(0);
  const active = useSharedValue(!reduceMotion);

  // Only on mount: later changes show the new total directly.
  useEffect(() => {
    if (reduceMotion) return;
    count.value = withTiming(
      total,
      { duration: 900, easing: Easing.out(Easing.cubic) },
      () => {
        active.value = false;
        scheduleOnRN(setCounting, null);
      },
    );
  }, []);

  useAnimatedReaction(
    () => (active.value ? Math.round(count.value) : -1),
    (value, previous) => {
      if (value >= 0 && value !== previous) scheduleOnRN(setCounting, value);
    },
  );

  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityLabel={`${formatWholeKr(total)} per month`}
      >
        <Amount value={counting ?? total} whole trailing="/ month" />
      </View>
      <Text style={[styles.line, { color: colors.mutedForeground }]}>
        <Text style={[styles.lineStrong, { color: colors.foreground }]}>
          {formatWholeKr(remaining)}
        </Text>
        {` still to pay in ${month}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  line: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  lineStrong: { fontFamily: fonts.extraBold },
});
