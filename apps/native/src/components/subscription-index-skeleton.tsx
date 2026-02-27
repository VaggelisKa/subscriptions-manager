import { View, ScrollView, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors, useTheme } from "@/providers/theme-provider";
import { AuthContext } from "@/providers/auth-provider";
import { SkeletonView } from "@/components/skeleton-view";
import { radius, spacing } from "@/lib/theme";
import { use } from "react";

export function SubscriptionIndexSkeleton() {
  const colors = useThemeColors();
  const { colorScheme, toggleTheme } = useTheme();
  const { signOut } = use(AuthContext);

  return (
    <>
      <Stack.Screen />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          onPress={() => {
            if (process.env.EXPO_OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push("/subscription-form");
          }}
        />
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction
            icon={colorScheme === "dark" ? "sun.max.fill" : "moon.fill"}
            onPress={toggleTheme}
          >
            {colorScheme === "dark" ? "Light Mode" : "Dark Mode"}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="rectangle.portrait.and.arrow.right"
            destructive
            onPress={signOut}
          >
            Sign Out
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.background }}
      >
        {/* TotalCostsCard skeleton */}
        <View
          style={[
            styles.totalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardGap2}>
            <SkeletonView width={100} height={18} />
            <SkeletonView width={220} height={14} />
          </View>
          <SkeletonView width={120} height={32} />
          <SkeletonView width={160} height={14} />
        </View>

        {/* Charged soon section skeleton */}
        <View style={styles.sectionGapMd}>
          <SkeletonView width={140} height={22} />
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
                  <SkeletonView width={80} height={14} />
                  <SkeletonView width={60} height={13} />
                </View>
                <SkeletonView width={50} height={22} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* All subscriptions section skeleton */}
        <View style={styles.sectionGapMd}>
          <View style={styles.sectionGapXs}>
            <SkeletonView width={180} height={22} />
            <View style={styles.rowCenter}>
              <SkeletonView width={120} height={14} />
              <SkeletonView width={44} height={24} />
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
                    <SkeletonView width={140} height={15} />
                    <SkeletonView width={60} height={13} />
                  </View>
                  <View style={styles.cardGap2}>
                    <SkeletonView width={50} height={14} />
                    <SkeletonView width={40} height={13} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.xxl,
  },
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
