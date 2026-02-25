import { useState, useEffect, useMemo } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  Picker,
  Host,
  Text as SwiftText,
  Form,
  Section,
  TextField,
  DatePicker,
  Button,
} from "@expo/ui/swift-ui";
import {
  pickerStyle,
  tag,
  datePickerStyle,
  disabled,
  foregroundStyle,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";

export default function SubscriptionFormScreen() {
  const { colorScheme } = useTheme();
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
    () =>
      subscriptions.find((s) => s.id === params.id) as
        | SubscriptionWithCategory
        | undefined,
    [subscriptions, params.id],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<"week" | "month" | "year">("month");
  const [billedAt, setBilledAt] = useState(new Date());
  const [categoryId, setCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const defaultCategoryId = categories[0]?.id ?? "";

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setPrice(String(existing.price));
      setInterval(existing.interval);
      setBilledAt(new Date(existing.billed_at));
      setCategoryId(existing.categories?.id ?? defaultCategoryId);
    }
  }, [existing, defaultCategoryId]);

  useEffect(() => {
    if (!existing && categories.length > 0 && !categoryId) {
      setCategoryId(defaultCategoryId);
    }
  }, [existing, categories, defaultCategoryId, categoryId]);

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

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? "Edit Subscription" : "New Subscription",
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" onPress={() => router.back()} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {saving ? (
          <Stack.Toolbar.View>
            <View
              style={{
                width: 32,
                height: 32,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          </Stack.Toolbar.View>
        ) : (
          <Stack.Toolbar.Button
            variant="prominent"
            onPress={handleSave}
            icon="checkmark"
          />
        )}
      </Stack.Toolbar>
      <Host
        style={{ flex: 1 }}
        colorScheme={colorScheme}
        key={existing?.id ?? "new"}
      >
        <Form>
          <Section title="Details">
            <TextField
              defaultValue={existing?.name ?? ""}
              placeholder="Name"
              onChangeText={setName}
            />
            <TextField
              defaultValue={existing?.description ?? ""}
              placeholder="Description"
              onChangeText={setDescription}
            />
          </Section>
          <Section title="Pricing">
            <TextField
              defaultValue={existing ? String(existing.price) : ""}
              placeholder="0.00 DKK"
              keyboardType="decimal-pad"
              onChangeText={setPrice}
            />
            <Picker
              selection={interval}
              onSelectionChange={(value) =>
                setInterval(value as "week" | "month" | "year")
              }
              modifiers={[pickerStyle("segmented")]}
            >
              <SwiftText modifiers={[tag("week")]}>Weekly</SwiftText>
              <SwiftText modifiers={[tag("month")]}>Monthly</SwiftText>
              <SwiftText modifiers={[tag("year")]}>Yearly</SwiftText>
            </Picker>
          </Section>
          <Section title="Schedule">
            <Picker
              label="Category"
              selection={categoryId || defaultCategoryId}
              onSelectionChange={(value) => setCategoryId(String(value))}
              modifiers={[pickerStyle("menu")]}
            >
              {categories.map((cat) => (
                <SwiftText key={cat.id} modifiers={[tag(cat.id)]}>
                  {cat.name ?? ""}
                </SwiftText>
              ))}
            </Picker>
            <DatePicker
              title="Billing Date"
              selection={billedAt}
              range={{ start: new Date() }}
              onDateChange={(date) => setBilledAt(date)}
              modifiers={[datePickerStyle("compact")]}
            />
          </Section>
          {isEdit && (
            <Section>
              <Button
                role="destructive"
                label="Delete Subscription"
                onPress={handleDelete}
                modifiers={[disabled(saving)]}
              />
            </Section>
          )}
        </Form>
      </Host>
    </>
  );
}
