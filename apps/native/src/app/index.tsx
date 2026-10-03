import { use, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";
import { Stack, router } from "expo-router";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { haptics } from "@/lib/haptics";
import { spacing } from "@/lib/theme";
import { EmptySubscriptionsState } from "@/components/empty-subscriptions-state";
import { SubscriptionOverviewSkeletons } from "@/components/subscription-overview-skeletons";
import { MonthlySummary } from "@/components/home/monthly-summary";
import { DayStrip } from "@/components/home/day-strip";
import { TimelineList } from "@/components/home/timeline-list";

export default function HomeScreen() {
  const colors = useThemeColors();
  const { colorScheme, toggleTheme } = useTheme();
  const { user, loading: authLoading, signOut, deleteAccount } = use(AuthContext);
  const { subscriptions, loading, refresh } = useSubscriptions(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Refetches also flip `loading`; keep showing the list instead of the skeleton.
  const showSkeleton = (authLoading || loading) && subscriptions.length === 0;

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function confirmDeleteAccount() {
    haptics.warning();
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your subscriptions. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const result = await deleteAccount();
            if (result.error) {
              haptics.error();
              Alert.alert("Error", result.error);
            } else {
              haptics.success();
            }
            setDeleting(false);
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="chart.bar.fill"
          accessibilityLabel="Insights"
          onPress={() => router.push("/insights")}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Add subscription"
          onPress={() => {
            haptics.medium();
            router.push("/subscription-form");
          }}
        />
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction
            icon={colorScheme === "dark" ? "sun.max.fill" : "moon.fill"}
            onPress={toggleTheme}
          >
            {colorScheme === "dark" ? "Light mode" : "Dark mode"}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu inline>
            <Stack.Toolbar.MenuAction
              icon="rectangle.portrait.and.arrow.right"
              destructive
              onPress={signOut}
            >
              Sign out
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon="trash"
              destructive
              disabled={deleting}
              onPress={confirmDeleteAccount}
            >
              Delete account
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {showSkeleton ? (
          <SubscriptionOverviewSkeletons />
        ) : subscriptions.length === 0 ? (
          <EmptySubscriptionsState />
        ) : (
          // Rows and sections animate in when added later, not on first render.
          <LayoutAnimationConfig skipEntering>
            <MonthlySummary subscriptions={subscriptions} />
            <DayStrip subscriptions={subscriptions} />
            <TimelineList subscriptions={subscriptions} />
          </LayoutAnimationConfig>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
