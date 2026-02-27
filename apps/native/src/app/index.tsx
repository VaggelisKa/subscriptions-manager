import { use, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { SubscriptionCard } from "@/components/subscription-card";
import { TotalCostsCard } from "@/components/total-costs-card";
import { ChargedSoonCard } from "@/components/charged-soon-card";
import { EmptySubscriptionsState } from "@/components/empty-subscriptions-state";
import { fonts, radius, spacing } from "@/lib/theme";
import {
  numberFormatOptions,
  type SubscriptionWithCategory,
} from "@subscriptions-manager/shared";
import { isPast } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

export default function HomeScreen() {
  const colors = useThemeColors();
  const { colorScheme, toggleTheme } = useTheme();
  const { user, loading: authLoading, signOut } = use(AuthContext);
  const { subscriptions, loading, refresh } = useSubscriptions(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const total = subscriptions.reduce((acc, s) => acc + (s.price || 0), 0);
  const monthlyTotal = subscriptions
    .filter((s) => s.interval === "month")
    .reduce((acc, s) => acc + (s.price || 0), 0);
  const upcoming = subscriptions.filter(
    (s) => !isPast(utcToZonedTime(s.billed_at, "Europe/Copenhagen")),
  );
  const grouped = groupByCategory
    ? (() => {
        const groups: Record<string, SubscriptionWithCategory[]> = {};
        for (const sub of subscriptions) {
          const key = sub.categories?.name || "Other";
          if (!groups[key]) groups[key] = [];
          groups[key].push(sub);
        }
        return groups;
      })()
    : null;
  const groupTotals = grouped
    ? Object.fromEntries(
        Object.entries(grouped).map(([key, subs]) => [
          key,
          subs.reduce((acc, s) => acc + (s.price || 0), 0),
        ]),
      )
    : null;

  if (authLoading || loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {subscriptions.length === 0 ? (
          <EmptySubscriptionsState />
        ) : (
          <>
            <Animated.View entering={FadeInUp.duration(400)}>
              <TotalCostsCard total={total} monthlyTotal={monthlyTotal} />
            </Animated.View>

            {upcoming.length > 2 && (
              <Animated.View
                entering={FadeInUp.duration(400).delay(100)}
                style={styles.sectionGapMd}
              >
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Charged soon
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardGapSm}
                >
                  {upcoming.slice(0, 3).map((sub, i) => (
                    <ChargedSoonCard
                      key={sub.id}
                      name={sub.name}
                      price={sub.price}
                      billedAt={sub.billed_at}
                      index={i}
                    />
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              layout={LinearTransition}
              style={styles.sectionGapMd}
            >
              <View style={styles.sectionGapXs}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  All subscriptions
                </Text>
                <View style={styles.rowCenter}>
                  <Text
                    style={[
                      styles.groupByLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
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
                      <Animated.View
                        entering={FadeIn.duration(250)}
                        exiting={FadeOut.duration(150)}
                        style={styles.rowBetween}
                      >
                        <Text
                          style={[
                            styles.categoryTitle,
                            { color: colors.foreground },
                          ]}
                        >
                          {category}
                        </Text>
                        {groupTotals && (
                          <Text
                            style={[
                              styles.categoryTotal,
                              { color: colors.foreground },
                            ]}
                          >
                            {groupTotals[category].toLocaleString("en-DK", {
                              ...numberFormatOptions,
                              maximumFractionDigits: 0,
                              minimumFractionDigits: 0,
                            })}
                          </Text>
                        )}
                      </Animated.View>
                      {subs.map((sub) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          onPress={() =>
                            router.push({
                              pathname: "/subscription-form",
                              params: {
                                id: sub.id,
                                name: sub.name,
                                description: sub.description ?? "",
                                price: String(sub.price),
                                interval: sub.interval,
                                billed_at: sub.billed_at,
                                category_id: sub.categories?.id ?? "",
                              },
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
                          params: {
                            id: sub.id,
                            name: sub.name,
                            description: sub.description ?? "",
                            price: String(sub.price),
                            interval: sub.interval,
                            billed_at: sub.billed_at,
                            category_id: sub.categories?.id ?? "",
                          },
                        })
                      }
                    />
                  ))}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  groupByLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  categoryTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  categoryTotal: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  sectionGapMd: { gap: spacing.md },
  sectionGapXs: { gap: spacing.xs },
  cardGapSm: { gap: spacing.sm },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
