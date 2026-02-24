import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, router, Redirect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { SubscriptionCard } from "@/components/subscription-card";
import { fonts, radius, spacing } from "@/lib/theme";
import {
  numberFormatOptions,
  getRelativeDateFromTimestamp,
  type SubscriptionWithCategory,
} from "@subscriptions-manager/shared";
import { isPast } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

function TotalCostsCard({
  total,
  monthlyTotal,
}: {
  total: number;
  monthlyTotal: number;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardGap2}>
        <Text style={[styles.titleLarge, { color: colors.foreground }]}>
          Total costs
        </Text>
        <Text style={[styles.bodySm, { color: colors.mutedForeground }]}>
          Aggregation of all your subscriptions
        </Text>
      </View>
      <Text selectable style={[styles.totalAmount, { color: colors.foreground }]}>
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
          <Text style={[styles.monthlyLabelMuted, { color: colors.mutedForeground }]}>
            of which is monthly
          </Text>
        </Text>
      )}
    </View>
  );
}

function ChargedSoonCard({
  name,
  price,
  billedAt,
}: {
  name: string;
  price: number;
  billedAt: string;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.chargedSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardGap2}>
        <Text numberOfLines={1} style={[styles.chargedSoonTitle, { color: colors.foreground }]}>
          {name}
        </Text>
        <Text style={[styles.bodySm, { color: colors.mutedForeground }]}>
          {getRelativeDateFromTimestamp(billedAt)}
        </Text>
      </View>
      <Text selectable style={[styles.chargedSoonPrice, { color: colors.foreground }]}>
        {price.toLocaleString("en-DK", {
          ...numberFormatOptions,
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        })}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const { colorScheme, toggleTheme } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const { subscriptions, loading, refresh } = useSubscriptions(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const total = useMemo(
    () => subscriptions.reduce((acc, s) => acc + (s.price || 0), 0),
    [subscriptions],
  );

  const monthlyTotal = useMemo(
    () =>
      subscriptions
        .filter((s) => s.interval === "month")
        .reduce((acc, s) => acc + (s.price || 0), 0),
    [subscriptions],
  );

  const upcoming = useMemo(
    () =>
      subscriptions.filter(
        (s) => !isPast(utcToZonedTime(s.billed_at, "Europe/Copenhagen")),
      ),
    [subscriptions],
  );

  const grouped = useMemo(() => {
    if (!groupByCategory) return null;

    const groups: Record<string, SubscriptionWithCategory[]> = {};
    for (const sub of subscriptions) {
      const key = sub.categories?.name || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(sub);
    }
    return groups;
  }, [subscriptions, groupByCategory]);

  const groupTotals = useMemo(() => {
    if (!grouped) return null;
    const totals: Record<string, number> = {};
    for (const [key, subs] of Object.entries(grouped)) {
      totals[key] = subs.reduce((acc, s) => acc + (s.price || 0), 0);
    }
    return totals;
  }, [grouped]);

  if (authLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      <Stack.Screen options={{ title: "Subscriptions" }} />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {subscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No subscriptions
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              You do not have any subscriptions yet.{"\n"}Add one to get
              started!
            </Text>
            <Pressable
              onPress={() => router.push("/subscription-form")}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.primary },
                pressed && styles.addButtonPressed,
              ]}
            >
              <Text style={[styles.addButtonText, { color: colors.primaryForeground }]}>
                Add your first one
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TotalCostsCard total={total} monthlyTotal={monthlyTotal} />

            {upcoming.length > 2 && (
              <View style={styles.sectionGapMd}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Charged soon
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardGapSm}
                >
                  {upcoming.slice(0, 3).map((sub) => (
                    <ChargedSoonCard
                      key={sub.id}
                      name={sub.name}
                      price={sub.price}
                      billedAt={sub.billed_at}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.sectionGapMd}>
              <View style={styles.sectionGapXs}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  All subscriptions
                </Text>
                <View style={styles.rowCenter}>
                  <Text style={[styles.groupByLabel, { color: colors.mutedForeground }]}>
                    Group by category
                  </Text>
                  <Switch
                    value={groupByCategory}
                    onValueChange={setGroupByCategory}
                    trackColor={{
                      false: colors.input,
                      true: colors.primary,
                    }}
                    style={styles.switchScale}
                  />
                </View>
              </View>

              {grouped
                ? Object.entries(grouped).map(([category, subs]) => (
                    <View key={category} style={styles.cardGapSm}>
                      <View style={styles.rowBetween}>
                        <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                          {category}
                        </Text>
                        {groupTotals && (
                          <Text style={[styles.categoryTotal, { color: colors.foreground }]}>
                            {groupTotals[category].toLocaleString("en-DK", {
                              ...numberFormatOptions,
                              maximumFractionDigits: 0,
                              minimumFractionDigits: 0,
                            })}
                          </Text>
                        )}
                      </View>
                      {subs.map((sub) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          onPress={() =>
                            router.push({
                              pathname: "/subscription-form",
                              params: { id: sub.id },
                            })
                          }
                        />
                      ))}
                    </View>
                  ))
                : subscriptions.map((sub) => (
                    <SubscriptionCard
                      key={sub.id}
                      subscription={sub}
                      onPress={() =>
                        router.push({
                          pathname: "/subscription-form",
                          params: { id: sub.id },
                        })
                      }
                    />
                  ))}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  // Cards
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
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
  cardGap2: { gap: 2 },
  cardGapSm: { gap: spacing.sm },
  cardGapMd: { gap: spacing.md },
  cardGapXs: { gap: spacing.xs },

  // Typography
  titleLarge: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  totalAmount: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
  },
  monthlyLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  monthlyLabelMuted: {
    fontFamily: fonts.regular,
  },
  chargedSoonTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  chargedSoonPrice: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: "center",
  },
  addButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  groupByLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  categoryTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  categoryTotal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },

  // Layout
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  addButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderCurve: "continuous",
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  sectionGapMd: { gap: spacing.md },
  sectionGapXs: { gap: spacing.xs },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchScale: {
    transform: [{ scale: 0.8 }],
  },
});
