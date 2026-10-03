import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { Skeleton } from "@/components/skeleton";
import { radius, spacing } from "@/lib/theme";

/**
 * Loading placeholder mirroring the home layout: summary, day strip and a
 * grouped block of rows. Renders inside the home ScrollView.
 */
export function SubscriptionOverviewSkeletons() {
  const colors = useThemeColors();

  return (
    <View accessibilityLabel="Loading subscriptions">
      <View style={styles.summary}>
        <Skeleton width={210} height={46} style={styles.amount} />
        <Skeleton width={230} height={14} />
      </View>

      <View style={styles.strip}>
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} width={40} height={58} style={styles.cell} />
        ))}
      </View>

      <View style={styles.header}>
        <Skeleton width={110} height={18} />
        <Skeleton width={48} height={13} />
      </View>
      <View style={[styles.group, { backgroundColor: colors.surface }]}>
        {[150, 110, 130, 90].map((width, i) => (
          <View key={i}>
            {i > 0 && (
              <View
                style={[styles.separator, { backgroundColor: colors.separator }]}
              />
            )}
            <View style={styles.row}>
              <Skeleton width={40} height={40} style={styles.tile} />
              <View style={styles.rowMain}>
                <Skeleton width={width} height={15} />
                <Skeleton width={64} height={12} />
              </View>
              <Skeleton width={64} height={15} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  amount: { borderRadius: radius.md },
  strip: {
    flexDirection: "row",
    gap: 6,
    marginTop: 18,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  cell: { borderRadius: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xs + 2,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  group: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 62,
  },
  rowMain: { flex: 1, gap: 6 },
  tile: { borderRadius: 12 },
});
