import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Stack, router, Redirect } from "expo-router";
import { Image } from "expo-image";
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
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
        borderCurve: "continuous",
      }}
    >
      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.semiBold,
            fontSize: 16,
            color: colors.foreground,
          }}
        >
          Total costs
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.mutedForeground,
          }}
        >
          Aggregation of all your subscriptions
        </Text>
      </View>
      <Text
        selectable
        style={{
          fontFamily: fonts.semiBold,
          fontSize: 24,
          color: colors.foreground,
          fontVariant: ["tabular-nums"],
        }}
      >
        {total.toLocaleString("en-DK", {
          ...numberFormatOptions,
          notation: "standard",
        })}
      </Text>
      {monthlyTotal > 0 && (
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: colors.foreground }}>
          {monthlyTotal.toLocaleString("en-DK", {
            ...numberFormatOptions,
            notation: "standard",
            minimumFractionDigits: 0,
          })}{" "}
          <Text style={{ fontFamily: fonts.regular, color: colors.mutedForeground }}>
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
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        minWidth: 140,
        gap: spacing.sm,
        borderCurve: "continuous",
      }}
    >
      <View style={{ gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.semiBold,
            fontSize: 14,
            color: colors.foreground,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 13,
            color: colors.mutedForeground,
          }}
        >
          {getRelativeDateFromTimestamp(billedAt)}
        </Text>
      </View>
      <Text
        selectable
        style={{
          fontFamily: fonts.semiBold,
          fontSize: 22,
          color: colors.foreground,
          fontVariant: ["tabular-nums"],
        }}
      >
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Overview",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              <Pressable
                onPress={() => {
                  if (process.env.EXPO_OS === "ios") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.push({
                    pathname: "/subscription-form",
                  });
                }}
                hitSlop={8}
              >
                <Image
                  source="sf:plus"
                  style={{ width: 22, height: 22, tintColor: colors.foreground }}
                />
              </Pressable>
              <Pressable onPress={toggleTheme} hitSlop={8}>
                <Image
                  source={colorScheme === "dark" ? "sf:sun.max.fill" : "sf:moon.fill"}
                  style={{ width: 20, height: 20, tintColor: colors.foreground }}
                />
              </Pressable>
              <Pressable onPress={signOut} hitSlop={8}>
                <Image
                  source="sf:rectangle.portrait.and.arrow.right"
                  style={{ width: 20, height: 20, tintColor: colors.foreground }}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {subscriptions.length === 0 ? (
          <View style={{ alignItems: "center", gap: spacing.xl, paddingTop: spacing.xxxl }}>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 22,
                color: colors.foreground,
              }}
            >
              No subscriptions
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.mutedForeground,
                textAlign: "center",
              }}
            >
              You do not have any subscriptions yet.{"\n"}Add one to get started!
            </Text>
            <Pressable
              onPress={() => router.push("/subscription-form")}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
                opacity: pressed ? 0.7 : 1,
                borderCurve: "continuous",
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.semiBold,
                  fontSize: 15,
                  color: colors.primaryForeground,
                }}
              >
                Add your first one
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TotalCostsCard total={total} monthlyTotal={monthlyTotal} />

            {upcoming.length > 2 && (
              <View style={{ gap: spacing.md }}>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 22,
                    color: colors.foreground,
                  }}
                >
                  Charged soon
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.sm }}
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

            <View style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 22,
                    color: colors.foreground,
                  }}
                >
                  All subscriptions
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 14,
                      color: colors.mutedForeground,
                    }}
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
                  />
                </View>
              </View>

              {grouped
                ? Object.entries(grouped).map(([category, subs]) => (
                    <View key={category} style={{ gap: spacing.sm }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.medium,
                            fontSize: 14,
                            color: colors.foreground,
                          }}
                        >
                          {category}
                        </Text>
                        {groupTotals && (
                          <Text
                            style={{
                              fontFamily: fonts.regular,
                              fontSize: 12,
                              color: colors.foreground,
                              fontVariant: ["tabular-nums"],
                            }}
                          >
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
