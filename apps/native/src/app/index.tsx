import { use, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Switch,
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
import {
  loadGroupByCategory,
  saveGroupByCategory,
  loadSortBy,
  saveSortBy,
  type SortBy,
} from "@/lib/user-options";
import { SubscriptionCard } from "@/components/subscription-card";
import { TotalCostsCard } from "@/components/total-costs-card";
import { ChargedSoonCard } from "@/components/charged-soon-card";
import { EmptySubscriptionsState } from "@/components/empty-subscriptions-state";
import { SubscriptionOverviewSkeletons } from "@/components/subscription-overview-skeletons";
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
  const [isGroupPreferenceHydrated, setIsGroupPreferenceHydrated] =
    useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("priceAsc");
  const [isSortPreferenceHydrated, setIsSortPreferenceHydrated] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateGroupPreference() {
      const storedGroupPreference = await loadGroupByCategory();
      if (!isMounted) return;
      setGroupByCategory(storedGroupPreference);
      setIsGroupPreferenceHydrated(true);
    }

    void hydrateGroupPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSortPreference() {
      const storedSortPreference = await loadSortBy();
      if (!isMounted) return;
      setSortBy(storedSortPreference);
      setIsSortPreferenceHydrated(true);
    }

    void hydrateSortPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isGroupPreferenceHydrated) return;
    void saveGroupByCategory(groupByCategory);
  }, [groupByCategory, isGroupPreferenceHydrated]);

  useEffect(() => {
    if (!isSortPreferenceHydrated) return;
    void saveSortBy(sortBy);
  }, [sortBy, isSortPreferenceHydrated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  function sortSubscriptions<T extends SubscriptionWithCategory>(
    list: T[],
  ): T[] {
    const sorted = [...list];
    switch (sortBy) {
      case "nameAsc":
        sorted.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        break;
      case "nameDesc":
        sorted.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
        break;
      case "priceAsc":
        sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "priceDesc":
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "billedAtAsc":
        sorted.sort(
          (a, b) =>
            new Date(a.billed_at ?? 0).getTime() -
            new Date(b.billed_at ?? 0).getTime(),
        );
        break;
      case "billedAtDesc":
        sorted.sort(
          (a, b) =>
            new Date(b.billed_at ?? 0).getTime() -
            new Date(a.billed_at ?? 0).getTime(),
        );
        break;
    }
    return sorted;
  }

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
        for (const key of Object.keys(groups)) {
          groups[key] = sortSubscriptions(groups[key]);
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

  const isLoading = authLoading || loading;

  function setSortField(field: "name" | "price" | "billedAt") {
    setSortBy((prev) => {
      const dir = prev.endsWith("Asc") ? "Asc" : "Desc";
      const current = prev.startsWith("name")
        ? "name"
        : prev.startsWith("price")
          ? "price"
          : "billedAt";
      return current === field ? prev : `${field}${dir}`;
    });
  }

  function setSortDirection(dir: "Asc" | "Desc") {
    setSortBy((prev) => {
      const base = prev.replace(/(Asc|Desc)$/, "");
      return `${base}${dir}` as SortBy;
    });
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
          <Stack.Toolbar.Menu icon="arrow.up.arrow.down">
            <Stack.Toolbar.Label>Sort by</Stack.Toolbar.Label>
            <Stack.Toolbar.Menu inline elementSize="small">
              <Stack.Toolbar.MenuAction
                icon="textformat"
                isOn={sortBy === "nameAsc" || sortBy === "nameDesc"}
                onPress={() => setSortField("name")}
              >
                Name
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                icon="banknote"
                isOn={sortBy === "priceAsc" || sortBy === "priceDesc"}
                onPress={() => setSortField("price")}
              >
                Price
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                icon="calendar"
                isOn={sortBy === "billedAtAsc" || sortBy === "billedAtDesc"}
                onPress={() => setSortField("billedAt")}
              >
                Next charge
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu inline elementSize="small">
              <Stack.Toolbar.MenuAction
                icon="arrow.up"
                isOn={sortBy.endsWith("Asc")}
                onPress={() => setSortDirection("Asc")}
              >
                Ascending
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                icon="arrow.down"
                isOn={sortBy.endsWith("Desc")}
                onPress={() => setSortDirection("Desc")}
              >
                Descending
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
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
        {isLoading ? (
          <SubscriptionOverviewSkeletons />
        ) : subscriptions.length === 0 ? (
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
                ? Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, subs]) => (
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
                : sortSubscriptions(subscriptions).map((sub) => (
                    <SubscriptionCard
                      key={sub.id}
                      subscription={sub}
                      onPress={() =>
                        router.push({
                          pathname: "/subscription-form",
                          params: {
                            id: sub.id,
                            name: sub.name,
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
