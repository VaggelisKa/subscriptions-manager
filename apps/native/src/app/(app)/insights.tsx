import { use, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { AuthContext } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { totalPerMonth } from "@subscriptions-manager/shared/billing";
import { formatWholeKr } from "@subscriptions-manager/shared/format";
import { fonts, spacing } from "@/lib/theme";
import { Amount } from "@/components/ui/amount";
import { PeriodPicker } from "@/components/insights/period-picker";
import { CategoryBar } from "@/components/insights/category-bar";
import { CategoryList } from "@/components/insights/category-list";
import {
  periodFactor,
  spendByCategory,
  type Period,
} from "@/components/insights/spend-by-category";

const periodName: Record<Period, string> = {
  week: "week",
  month: "month",
  year: "year",
};

export default function InsightsScreen() {
  const colors = useThemeColors();
  const { user } = use(AuthContext);
  const { subscriptions, loading } = useSubscriptions(user?.id);
  const [period, setPeriod] = useState<Period>("month");
  const [expanded, setExpanded] = useState<string[]>([]);

  const monthly = totalPerMonth(subscriptions);
  const categories = spendByCategory(subscriptions);

  const toggle = (key: string) =>
    setExpanded((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );

  const muted = {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.mutedForeground,
  };

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
      >
        {loading && subscriptions.length === 0 ? (
          <ActivityIndicator style={{ marginTop: spacing.xxxl }} />
        ) : subscriptions.length === 0 ? (
          <Text style={[muted, { textAlign: "center", marginTop: spacing.xxxl }]}>
            Add a subscription to see where your money goes.
          </Text>
        ) : (
          <>
            <View style={{ marginTop: 6, marginBottom: 18 }}>
              <PeriodPicker value={period} onChange={setPeriod} />
            </View>

            <View style={{ paddingHorizontal: spacing.xs }}>
              <Text style={[muted, { fontFamily: fonts.bold }]}>
                Spend per {periodName[period]}
              </Text>
              <Amount value={monthly * periodFactor[period]} size={42} whole />
              {period !== "year" && (
                <Text style={[muted, { marginTop: spacing.xs }]}>
                  {formatWholeKr(monthly * 12)} over the next 12 months
                </Text>
              )}
            </View>

            <View style={{ marginVertical: 18, marginHorizontal: spacing.xs }}>
              <CategoryBar categories={categories} />
            </View>

            <CategoryList
              categories={categories}
              period={period}
              expanded={expanded}
              onToggle={toggle}
            />
          </>
        )}
      </ScrollView>
    </>
  );
}
