import { View, ScrollView, StyleSheet } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { Skeleton } from "@/components/skeleton";
import { radius, spacing } from "@/lib/theme";

/**
 * Skeleton content for the subscription overview - renders only the ScrollView
 * children. Use inside the main index ScrollView when loading.
 */
export function SubscriptionOverviewSkeleton() {
  const colors = useThemeColors();

  return (
    <>
      {/* TotalCostsCard skeleton */}
      <View
        style={[
          styles.totalCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardGap2}>
          <Skeleton width={100} height={18} />
          <Skeleton width={220} height={14} />
        </View>
        <Skeleton width={120} height={32} />
        <Skeleton width={160} height={14} />
      </View>

      {/* Charged soon section skeleton */}
      <View style={styles.sectionGapMd}>
        <Skeleton width={140} height={22} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardGapSm}
        >
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.chargedSoonCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardGap2}>
                <Skeleton width={80} height={14} />
                <Skeleton width={60} height={13} />
              </View>
              <Skeleton width={50} height={22} />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* All subscriptions section skeleton */}
      <View style={styles.sectionGapMd}>
        <View style={styles.sectionGapXs}>
          <Skeleton width={180} height={22} />
          <View style={styles.rowCenter}>
            <Skeleton width={120} height={14} />
            <Skeleton width={44} height={24} />
          </View>
        </View>
        <View style={styles.cardGapSm}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.subscriptionCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardGap2}>
                  <Skeleton width={140} height={15} />
                  <Skeleton width={60} height={13} />
                </View>
                <View style={styles.cardGap2}>
                  <Skeleton width={50} height={14} />
                  <Skeleton width={40} height={13} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
    borderCurve: "continuous",
  },
  chargedSoonCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minWidth: 140,
    gap: spacing.sm,
    borderCurve: "continuous",
  },
  subscriptionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    borderCurve: "continuous",
  },
  cardGap2: { gap: 2 },
  cardGapSm: { gap: spacing.sm },
  sectionGapMd: { gap: spacing.md },
  sectionGapXs: { gap: spacing.xs },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
