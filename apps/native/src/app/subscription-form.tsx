import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/auth-provider";
import { useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { fonts, radius, spacing } from "@/lib/theme";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";

function FormLabel({ text, colors }: { text: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Text
      style={{
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.foreground,
        marginBottom: spacing.xs,
      }}
    >
      {text}
    </Text>
  );
}

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
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");

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
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    padding: spacing.md,
    borderCurve: "continuous" as const,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? "Edit Subscription" : "New Subscription",
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.85, 1.0],
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 16,
                  color: colors.primary,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
      >
        <View style={{ gap: spacing.xs }}>
          <FormLabel text="Name" colors={colors} />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Netflix"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <FormLabel text="Description" colors={colors} />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Shared netflix account"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <FormLabel text="Category" colors={colors} />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.input,
              borderRadius: radius.md,
              overflow: "hidden",
              borderCurve: "continuous",
            }}
          >
            <Picker
              selectedValue={categoryId}
              onValueChange={setCategoryId}
              style={{
                color: colors.foreground,
              }}
              itemStyle={{
                fontFamily: fonts.regular,
                fontSize: 15,
              }}
            >
              <Picker.Item label="Select a category" value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat.id} label={cat.name ?? ""} value={cat.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <FormLabel text="Price" colors={colors} />
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <FormLabel text="Interval" colors={colors} />
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.input,
                borderRadius: radius.md,
                overflow: "hidden",
                borderCurve: "continuous",
              }}
            >
              <Picker
                selectedValue={interval}
                onValueChange={(v) => setInterval(v as typeof interval)}
                style={{ color: colors.foreground }}
                itemStyle={{ fontFamily: fonts.regular, fontSize: 15 }}
              >
                <Picker.Item label="Weekly" value="week" />
                <Picker.Item label="Monthly" value="month" />
                <Picker.Item label="Yearly" value="year" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <FormLabel text="Billing Date" colors={colors} />
          {Platform.OS === "android" && (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={{
                ...inputStyle,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.foreground }}>
                {billedAt.toLocaleDateString("en-DK")}
              </Text>
            </Pressable>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={billedAt}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={new Date()}
              onChange={(_event, date) => {
                if (Platform.OS === "android") setShowDatePicker(false);
                if (date) setBilledAt(date);
              }}
              themeVariant="light"
              accentColor={colors.primary}
            />
          )}
        </View>

        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              padding: spacing.md,
              alignItems: "center",
              opacity: pressed || saving ? 0.7 : 1,
              borderCurve: "continuous",
            })}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.semiBold,
                  fontSize: 15,
                  color: colors.primaryForeground,
                }}
              >
                {isEdit ? "Update" : "Add"}
              </Text>
            )}
          </Pressable>

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
        </View>
      </ScrollView>
    </>
  );
}
