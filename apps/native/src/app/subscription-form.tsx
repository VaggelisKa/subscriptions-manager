import { use, useRef, useState } from "react";
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
  type TextFieldRef,
} from "@expo/ui/swift-ui";
import {
  pickerStyle,
  tag,
  datePickerStyle,
  disabled,
  onTapGesture,
  scrollDismissesKeyboard,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";

export default function SubscriptionFormScreen() {
  const { colorScheme } = useTheme();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    price?: string | string[];
    interval?: string | string[];
    billed_at?: string | string[];
    category_id?: string | string[];
  }>();

  const getParam = (key: keyof typeof params) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const id = getParam("id");
  const paramName = getParam("name");
  const paramPrice = getParam("price");
  const paramInterval = getParam("interval") as
    | "week"
    | "month"
    | "year"
    | undefined;
  const paramBilledAt = getParam("billed_at");
  const paramCategoryId = getParam("category_id");

  const { user } = use(AuthContext);
  const {
    categories,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  } = useSubscriptions(user?.id);

  const isEdit = !!id;
  const defaultCategoryId = categories[0]?.id ?? "";

  const [name, setName] = useState(paramName ?? "");
  const [price, setPrice] = useState(paramPrice ?? "");
  const [interval, setInterval] = useState<"week" | "month" | "year">(
    (paramInterval as "week" | "month" | "year") ?? "month",
  );
  const [billedAt, setBilledAt] = useState(() =>
    paramBilledAt ? new Date(paramBilledAt) : new Date(),
  );
  const [categoryId, setCategoryId] = useState(paramCategoryId ?? "");
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<TextFieldRef>(null);
  const priceInputRef = useRef<TextFieldRef>(null);

  const effectiveCategoryId = categoryId || defaultCategoryId;

  function dismissFormKeyboard() {
    void nameInputRef.current?.blur();
    void priceInputRef.current?.blur();
  }

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
      price: parseFloat(price),
      interval,
      billed_at: billedAt.toUTCString(),
      ...(effectiveCategoryId ? { category_id: effectiveCategoryId } : {}),
    };

    const result = isEdit
      ? await updateSubscription(id!, data)
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
            const result = await deleteSubscription(id!);
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
        key={id ?? "new"}
        modifiers={[onTapGesture(dismissFormKeyboard)]}
      >
        <Form
          modifiers={[
            scrollDismissesKeyboard("immediately"),
            onTapGesture(dismissFormKeyboard),
          ]}
        >
          <Section title="Details">
            <TextField
              ref={nameInputRef}
              key={`name-${id ?? "new"}`}
              defaultValue={paramName ?? ""}
              placeholder="Name"
              onChangeText={setName}
            />
            <Picker
              label="Category"
              selection={effectiveCategoryId}
              onSelectionChange={(value) => {
                dismissFormKeyboard();
                setCategoryId(String(value));
              }}
              modifiers={[pickerStyle("menu")]}
            >
              {categories.map((cat) => (
                <SwiftText key={cat.id} modifiers={[tag(cat.id)]}>
                  {cat.name ?? ""}
                </SwiftText>
              ))}
            </Picker>
          </Section>
          <Section title="Pricing">
            <TextField
              ref={priceInputRef}
              key={`price-${id ?? "new"}`}
              defaultValue={paramPrice ?? ""}
              placeholder="0.00 DKK"
              keyboardType="decimal-pad"
              onChangeText={setPrice}
            />
          </Section>
          <Section title="Schedule">
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
            <DatePicker
              title="Billing Date"
              selection={billedAt}
              onDateChange={(date) => {
                dismissFormKeyboard();
                setBilledAt(date);
              }}
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
