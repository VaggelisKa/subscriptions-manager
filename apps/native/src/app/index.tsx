import { use, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";
import { Stack, router } from "expo-router";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { haptics } from "@/lib/haptics";
import { useTodayKey } from "@/lib/use-today";
import { spacing, type } from "@/lib/theme";
import { EmptySubscriptionsState } from "@/components/empty-subscriptions-state";
import { SubscriptionOverviewSkeletons } from "@/components/subscription-overview-skeletons";
import { MonthlySummary } from "@/components/home/monthly-summary";
import { DayStrip } from "@/components/home/day-strip";
import { TimelineList } from "@/components/home/timeline-list";
import { PasswordPrompt } from "@/components/auth/password-prompt";

export default function HomeScreen() {
  const colors = useThemeColors();
  const { colorScheme, toggleTheme } = useTheme();
  const {
    user,
    loading: authLoading,
    signOut,
    reauthenticate,
    deleteAccount,
  } = use(AuthContext);
  const { subscriptions, loading, refresh } = useSubscriptions(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Open while deletion waits for the password; `resolve` continues (true) or cancels (false) it.
  const [passwordPrompt, setPasswordPrompt] = useState<{
    resolve: (confirmed: boolean) => void;
    confirmed: boolean;
  } | null>(null);
  const todayKey = useTodayKey();

  // Refetches also flip `loading`; keep showing the list instead of the skeleton.
  const showSkeleton = (authLoading || loading) && subscriptions.length === 0;

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function askForPassword() {
    return new Promise<boolean>((resolve) => {
      setPasswordPrompt({ resolve, confirmed: false });
    });
  }

  async function confirmPassword(password: string) {
    const result = await reauthenticate(password);
    if (result.error) {
      haptics.error();
      return result.error;
    }
    // Stays open with a spinner while the deletion is retried.
    setPasswordPrompt((prompt) => prompt && { ...prompt, confirmed: true });
    passwordPrompt?.resolve(true);
  }

  function cancelPasswordPrompt() {
    passwordPrompt?.resolve(false);
    setPasswordPrompt(null);
  }

  async function runDeleteAccount() {
    setDeleting(true);
    let result: Awaited<ReturnType<typeof deleteAccount>>;
    try {
      result = await deleteAccount(askForPassword);
    } finally {
      setPasswordPrompt(null);
      setDeleting(false);
    }
    if (result.cancelled) return;
    if (result.error) {
      haptics.error();
      Alert.alert("Couldn't delete account", result.error);
    } else {
      haptics.success();
    }
  }

  function confirmDeleteAccount() {
    haptics.warning();
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your subscriptions. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: runDeleteAccount },
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
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More options">
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
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.foreground }]}
        >
          Subscriptions
        </Text>
        {showSkeleton ? (
          <SubscriptionOverviewSkeletons />
        ) : subscriptions.length === 0 ? (
          <EmptySubscriptionsState />
        ) : (
          // Rows and sections animate in when added later, not on first render.
          // Keyed by day so date-relative content refreshes after midnight.
          <LayoutAnimationConfig key={todayKey} skipEntering>
            <MonthlySummary subscriptions={subscriptions} />
            <DayStrip subscriptions={subscriptions} />
            <TimelineList subscriptions={subscriptions} />
          </LayoutAnimationConfig>
        )}
      </ScrollView>
      {passwordPrompt ? (
        <PasswordPrompt
          title="Confirm it's you"
          message="Enter your password to permanently delete your account."
          confirmTitle="Delete account"
          busy={passwordPrompt.confirmed}
          onConfirm={confirmPassword}
          onCancel={cancelPasswordPrompt}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...type.largeTitle,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
});
