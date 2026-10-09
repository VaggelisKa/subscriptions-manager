import { use, useRef, useState } from "react";
import { View, Alert, ActivityIndicator, PlatformColor } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  Picker,
  Host,
  HStack,
  Text as SwiftText,
  Form,
  Section,
  TextField,
  DatePicker,
  useNativeState,
  type TextFieldRef,
} from "@expo/ui/swift-ui";
import {
  pickerStyle,
  tag,
  datePickerStyle,
  foregroundStyle,
  keyboardType,
  labelsHidden,
  listRowBackground,
  onTapGesture,
  scrollDismissesKeyboard,
} from "@expo/ui/swift-ui/modifiers";
import type { IntervalEnum } from "@subscriptions-manager/shared/types";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { format, setHours, setMinutes } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { nextChargeDate } from "@subscriptions-manager/shared/billing";
import { parsePrice } from "@subscriptions-manager/shared/price";
import {
  subscriptionFormSchema,
  toSubscriptionWrite,
  type SubscriptionWrite,
} from "@subscriptions-manager/shared/schemas";
import { haptics } from "@/lib/haptics";
import { intervalName } from "@subscriptions-manager/shared/format";
import { SubscriptionPreview } from "@/components/form/subscription-preview";
import { CategoryPicker } from "@/components/form/category-picker";

const INTERVALS: IntervalEnum[] = ["week", "month", "year"];

// Below full height iOS gives form rows a translucent fill meant for the
// sheet's glass; pin them to the solid color they have at full height.
const ROW_MODIFIERS = [
  listRowBackground(PlatformColor("secondarySystemGroupedBackground")),
];

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
  // Shown with a decimal comma to match the rest of the app; parsing accepts both.
  const paramPrice = getParam("price")?.replace(".", ",");
  const paramInterval = getParam("interval") as IntervalEnum | undefined;
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
  // New subscriptions default to the first category; edits keep "none" as none.
  const defaultCategoryId = isEdit ? "" : (categories[0]?.id ?? "");

  const [name, setName] = useState(paramName ?? "");
  const [price, setPrice] = useState(paramPrice ?? "");
  const nameText = useNativeState(paramName ?? "");
  const priceText = useNativeState(paramPrice ?? "");
  const [interval, setInterval] = useState<IntervalEnum>(
    paramInterval && INTERVALS.includes(paramInterval) ? paramInterval : "month",
  );
  // A stale `billed_at` is shown as its next charge (keeping the stored time
  // of day), but it's only written back if the user picks a date: it anchors
  // the schedule, so rewriting it on every save would shift it.
  const [billedAt, setBilledAt] = useState(() => {
    if (!paramBilledAt) return new Date();
    const stored = utcToZonedTime(paramBilledAt, "Europe/Copenhagen");
    const next = nextChargeDate(
      paramBilledAt,
      paramInterval && INTERVALS.includes(paramInterval) ? paramInterval : "month",
    );
    return setMinutes(setHours(next, stored.getHours()), stored.getMinutes());
  });
  const [billedAtChanged, setBilledAtChanged] = useState(false);
  const [categoryId, setCategoryId] = useState(paramCategoryId ?? "");
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<TextFieldRef>(null);
  const priceInputRef = useRef<TextFieldRef>(null);

  const effectiveCategoryId = categoryId || defaultCategoryId;
  const selectedCategory = categories.find((c) => c.id === effectiveCategoryId);
  const parsedPrice = parsePrice(price);

  function dismissFormKeyboard() {
    void nameInputRef.current?.blur();
    void priceInputRef.current?.blur();
  }

  async function handleSave() {
    const parsed = subscriptionFormSchema.safeParse({
      name,
      price,
      interval,
      // The stored anchor is only rewritten when the user picks a date.
      billedAtDay:
        !isEdit || billedAtChanged ? format(billedAt, "yyyy-MM-dd") : undefined,
      categoryId: effectiveCategoryId,
    });
    if (!parsed.success) {
      Alert.alert("Error", parsed.error.issues[0].message);
      return;
    }

    let data: SubscriptionWrite;
    try {
      data = toSubscriptionWrite(parsed.data, !isEdit);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
      return;
    }

    setSaving(true);

    const result = isEdit
      ? await updateSubscription(id!, data)
      : await addSubscription({ ...data, billed_at: data.billed_at! });

    setSaving(false);

    if (result.error) {
      Alert.alert("Error", result.error);
      return;
    }

    haptics.success();
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
            haptics.success();
            // The form may sit on top of the detail sheet; close both.
            router.dismissTo("/");
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEdit ? "Edit subscription" : "New subscription",
        }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {isEdit && !saving && (
          <Stack.Toolbar.Button
            icon="trash"
            accessibilityLabel="Delete subscription"
            tintColor={colors.destructive}
            onPress={handleDelete}
          />
        )}
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
            tintColor={colors.primary}
            onPress={handleSave}
            icon="checkmark"
            accessibilityLabel="Save"
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
          <Section modifiers={ROW_MODIFIERS}>
            <SubscriptionPreview
              name={name}
              price={parsedPrice}
              interval={interval}
              color={selectedCategory?.color_hex}
            />
          </Section>
          <Section title="Details" modifiers={ROW_MODIFIERS}>
            <TextField
              ref={nameInputRef}
              key={`name-${id ?? "new"}`}
              text={nameText}
              placeholder="Name"
              onTextChange={setName}
            />
            {categories.length > 0 && (
              <CategoryPicker
                categories={categories}
                selectedId={effectiveCategoryId}
                onSelect={(value) => {
                  dismissFormKeyboard();
                  haptics.selection();
                  setCategoryId(value);
                }}
              />
            )}
          </Section>
          <Section title="Price" modifiers={ROW_MODIFIERS}>
            <HStack>
              <TextField
                ref={priceInputRef}
                key={`price-${id ?? "new"}`}
                text={priceText}
                placeholder="0"
                modifiers={[keyboardType("decimal-pad")]}
                onTextChange={setPrice}
              />
              <SwiftText modifiers={[foregroundStyle("secondary")]}>kr</SwiftText>
            </HStack>
          </Section>
          <Section title="Billed" modifiers={ROW_MODIFIERS}>
            <Picker
              label="Interval"
              selection={interval}
              onSelectionChange={(value) => {
                dismissFormKeyboard();
                setInterval(value as IntervalEnum);
              }}
              modifiers={[pickerStyle("segmented"), labelsHidden()]}
            >
              {INTERVALS.map((value) => (
                <SwiftText key={value} modifiers={[tag(value)]}>
                  {intervalName[value]}
                </SwiftText>
              ))}
            </Picker>
            <DatePicker
              title="Next charge"
              selection={billedAt}
              onDateChange={(date) => {
                dismissFormKeyboard();
                setBilledAt(date);
                setBilledAtChanged(true);
              }}
              modifiers={[datePickerStyle("compact")]}
            />
          </Section>
        </Form>
      </Host>
    </>
  );
}
