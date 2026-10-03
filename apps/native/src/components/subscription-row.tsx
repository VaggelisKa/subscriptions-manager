import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { useThemeColors } from "@/providers/theme-provider";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { haptics } from "@/lib/haptics";
import { fonts, spacing } from "@/lib/theme";
import {
  formatDueLabel,
  formatNumber,
  intervalLabel,
  intervalSuffix,
  isDueSoon,
} from "@/lib/format";

type Props = {
  subscription: SubscriptionWithCategory;
  nextCharge: Date;
  /** Replaces the due label under the name (e.g. category name). */
  meta?: string;
  onPress?: () => void;
};

/** A subscription in a `Group`: tile, name, when it's due, price per interval. */
export function SubscriptionRow({ subscription, nextCharge, meta, onPress }: Props) {
  const colors = useThemeColors();
  const soon = !meta && isDueSoon(nextCharge);
  const metaText = meta ?? formatDueLabel(nextCharge);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${subscription.name}, ${metaText}, ${formatNumber(subscription.price ?? 0)} kr ${intervalLabel[subscription.interval]}`}
      onPress={
        onPress
          ? () => {
              haptics.light();
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.fill },
      ]}
    >
      <SubscriptionTile
        name={subscription.name}
        color={subscription.categories?.color_hex}
      />
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: colors.foreground }]}
        >
          {subscription.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.meta,
            soon
              ? { color: colors.primaryText, fontFamily: fonts.bold }
              : { color: colors.mutedForeground },
          ]}
        >
          {metaText}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>
        {formatNumber(subscription.price ?? 0)} kr
        <Text style={[styles.suffix, { color: colors.mutedForeground }]}>
          {intervalSuffix[subscription.interval]}
        </Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 62,
  },
  main: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  meta: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  amount: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  suffix: { fontFamily: fonts.semiBold, fontSize: 12 },
});
