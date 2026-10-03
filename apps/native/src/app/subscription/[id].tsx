import { use, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import {
  countChargesBetween,
  monthlyEquivalent,
  toLocalDay,
  today,
  upcomingChargeDates,
  yearlyEquivalent,
} from "@/lib/billing";
import { formatWholeKr, intervalLabel } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { fonts, radius, spacing, withAlpha } from "@/lib/theme";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { Amount } from "@/components/ui/amount";
import { Group, SectionHeader } from "@/components/ui/grouped";
import { ChargeTimeline } from "@/components/detail/charge-timeline";
import { InfoRow } from "@/components/detail/info-row";

export default function SubscriptionDetailScreen() {
  const { colors, colorScheme } = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { user } = use(AuthContext);
  const { subscriptions, loading, deleteSubscription } = useSubscriptions(
    user?.id,
  );
  const [deleting, setDeleting] = useState(false);
  // Set once we navigate away so the not-found effect doesn't pop twice.
  const leaving = useRef(false);

  const subscription = subscriptions.find((s) => s.id === id);

  useEffect(() => {
    if (!loading && !subscription && !leaving.current) {
      leaving.current = true;
      router.back();
    }
  }, [loading, subscription]);

  if (!subscription) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
        </Stack.Toolbar>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      </>
    );
  }

  const sub = subscription;
  const price = sub.price ?? 0;
  const category = sub.categories;
  const categoryColor = category?.color_hex;

  const equivalent =
    sub.interval === "year"
      ? `${formatWholeKr(monthlyEquivalent(price, sub.interval))} a month`
      : `${formatWholeKr(yearlyEquivalent(price, sub.interval))} a year`;

  const upcoming = upcomingChargeDates(sub.billed_at, sub.interval, 3);

  // Charges on the schedule since tracking started. Price or date edits
  // aren't recorded, hence the "≈".
  const pastCharges = countChargesBetween(
    sub.billed_at,
    sub.interval,
    toLocalDay(sub.created_at),
    today(),
  );

  function handleEdit() {
    haptics.light();
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
    });
  }

  function handleDelete() {
    haptics.warning();
    Alert.alert(
      "Delete subscription",
      `Are you sure you want to delete "${sub.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            leaving.current = true;
            const result = await deleteSubscription(sub.id);
            if (result.error) {
              leaving.current = false;
              setDeleting(false);
              Alert.alert("Error", result.error);
              return;
            }
            router.back();
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={handleEdit} disabled={deleting}>
          Edit
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        style={{ backgroundColor: colors.background }}
      >
        <View style={styles.header}>
          <SubscriptionTile name={sub.name} color={categoryColor} size={60} />
          <View style={styles.headerText}>
            <Text
              selectable
              numberOfLines={2}
              style={[styles.name, { color: colors.foreground }]}
            >
              {sub.name}
            </Text>
            {category?.name ? (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: withAlpha(
                      categoryColor,
                      colorScheme === "dark" ? 0.22 : 0.14,
                      colors.fill,
                    ),
                  },
                ]}
              >
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: categoryColor ?? colors.faint },
                  ]}
                />
                <Text style={[styles.chipText, { color: colors.foreground }]}>
                  {category.name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.price}>
          <Amount value={price} size={44} />
          <Text style={[styles.priceMeta, { color: colors.mutedForeground }]}>
            {`${intervalLabel[sub.interval]} · ${equivalent}`}
          </Text>
        </View>

        <SectionHeader title="Upcoming charges" />
        <ChargeTimeline dates={upcoming} price={price} />

        <Group separatorInset={spacing.lg} style={styles.info}>
          <InfoRow
            label="Tracking since"
            value={format(new Date(sub.created_at), "MMM yyyy")}
          />
          {pastCharges > 0 ? (
            <InfoRow
              label="Paid so far"
              value={`≈ ${formatWholeKr(pastCharges * price)}`}
            />
          ) : null}
        </Group>

        <Pressable
          accessibilityRole="button"
          disabled={deleting}
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.delete,
            { opacity: pressed || deleting ? 0.5 : 1 },
          ]}
        >
          {deleting ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <Text style={[styles.deleteText, { color: colors.destructive }]}>
              Delete subscription
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerText: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  name: {
    fontFamily: fonts.black,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  price: {
    paddingTop: 22,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  priceMeta: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 6,
  },
  info: {
    marginTop: 14,
  },
  delete: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginTop: spacing.sm,
    minHeight: 60,
  },
  deleteText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
});
