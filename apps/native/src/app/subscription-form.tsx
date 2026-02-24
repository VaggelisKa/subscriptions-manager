import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { fonts, radius, spacing } from "@/lib/theme";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";

const INTERVALS = ["week", "month", "year"] as const;
const INTERVAL_LABELS = ["Weekly", "Monthly", "Yearly"];

export default function SubscriptionFormScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const {
    subscriptions,
    categories,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  } = useSubscriptions(user?.id);

  const isEdit = !!params.id;
  const existing = useMemo(
    () => subscriptions.find((s) => s.id === params.id) as SubscriptionWithCategory | undefined,
    [subscriptions, params.id],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<"week" | "month" | "year">("month");
  const [billedAt, setBilledAt] = useState(new Date());
  const [categoryId, setCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setPrice(String(existing.price));
      setInterval(existing.interval);
      setBilledAt(new Date(existing.billed_at));
      setCategoryId(existing.categories?.id ?? "");
    }
  }, [existing]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Error", "Name of subscription is required");
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      Alert.alert("Error", "Price of subscription should be given");
      return;
    }

    setSaving(true);

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price),
      interval,
      billed_at: billedAt.toUTCString(),
      ...(categoryId ? { category_id: categoryId } : {}),
    };

    const result = isEdit
      ? await updateSubscription(params.id!, data)
      : await addSubscription(data);

    setSaving(false);

    if (result.error) {
      Alert.alert("Error", result.error);
      return;
    }

    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  }

  async function handleDelete() {
    Alert.alert(
      "Delete subscription",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            const result = await deleteSubscription(params.id!);
            setSaving(false);
            if (result.error) {
              Alert.alert("Error", result.error);
              return;
            }
            router.back();
          },
        },
      ],
    );
  }

  const inputStyle = {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    borderCurve: "continuous" as const,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? "Edit Subscription" : "New Subscription",
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>
          Cancel
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {saving ? (
          <Stack.Toolbar.View>
            <View style={{ width: 32, height: 32, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          </Stack.Toolbar.View>
        ) : (
          <Stack.Toolbar.Button variant="done" onPress={handleSave}>
            {isEdit ? "Update" : "Add"}
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.mutedForeground }}>
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Netflix"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.mutedForeground }}>
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Shared netflix account"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.mutedForeground }}>
            Price
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.mutedForeground }}>
            Interval
          </Text>
          <SegmentedControl
            values={INTERVAL_LABELS}
            selectedIndex={INTERVALS.indexOf(interval)}
            onChange={({ nativeEvent }) =>
              setInterval(INTERVALS[nativeEvent.selectedSegmentIndex])
            }
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.mutedForeground }}>
            Category
          </Text>
          <Picker
            selectedValue={categoryId}
            onValueChange={setCategoryId}
            style={{ color: colors.foreground }}
            itemStyle={{ fontFamily: fonts.regular, fontSize: 16 }}
          >
            <Picker.Item label="None" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name ?? ""} value={cat.id} />
            ))}
          </Picker>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.mutedForeground }}>
            Billing Date
          </Text>
          <DateTimePicker
            value={billedAt}
            mode="date"
            minimumDate={new Date()}
            onChange={(_event, date) => {
              if (date) setBilledAt(date);
            }}
            accentColor={colors.primary}
          />
        </View>

        {isEdit && (
          <Pressable
            onPress={handleDelete}
            disabled={saving}
            style={({ pressed }) => ({
              backgroundColor: colors.destructive,
              borderRadius: radius.md,
              padding: spacing.md,
              alignItems: "center",
              opacity: pressed || saving ? 0.7 : 1,
              borderCurve: "continuous",
              marginTop: spacing.lg,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 15,
                color: colors.destructiveForeground,
              }}
            >
              Delete
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}
