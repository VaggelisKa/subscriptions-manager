import { use, useRef, useState } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
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
  RNHostView,
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
  listRowInsets,
  onTapGesture,
  scrollDismissesKeyboard,
} from "@expo/ui/swift-ui/modifiers";
import type { IntervalEnum } from "@subscriptions-manager/shared";
import { AuthContext } from "@/providers/auth-provider";
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { setHours } from "date-fns";
import { nextChargeDate } from "@/lib/billing";
import { haptics } from "@/lib/haptics";
import { intervalName } from "@/lib/format";
import { SubscriptionPreview } from "@/components/form/subscription-preview";
import { CategoryChips } from "@/components/form/category-chips";

const INTERVALS: IntervalEnum[] = ["week", "month", "year"];

/** The decimal pad shows the locale's separator, which is "," in Danish. */
function parsePrice(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return isNaN(value) ? null : value;
}

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
  const defaultCategoryId = categories[0]?.id ?? "";

  const [name, setName] = useState(paramName ?? "");
  const [price, setPrice] = useState(paramPrice ?? "");
  const nameText = useNativeState(paramName ?? "");
  const priceText = useNativeState(paramPrice ?? "");
  const [interval, setInterval] = useState<IntervalEnum>(
    paramInterval && INTERVALS.includes(paramInterval) ? paramInterval : "month",
  );
  // `billed_at` anchors the schedule and may be in the past; show the next
  // charge instead. Saving it keeps the same schedule.
  const [billedAt, setBilledAt] = useState(() =>
    paramBilledAt
      ? setHours(
          nextChargeDate(
            paramBilledAt,
            paramInterval && INTERVALS.includes(paramInterval)
              ? paramInterval
              : "month",
          ),
          12,
        )
      : new Date(),
  );
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
    if (!name.trim()) {
      Alert.alert("Error", "Name of subscription is required");
      return;
    }
    if (parsedPrice === null) {
      Alert.alert("Error", "Price of subscription should be given");
      return;
    }

    setSaving(true);

    const data = {
      name: name.trim(),
      price: parsedPrice,
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
          <Section>
            {/* The preview supplies its own padding, so the row is edge to edge. */}
            <HStack
              modifiers={[
                listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
              ]}
            >
              <RNHostView matchContents={{ vertical: true }}>
                <SubscriptionPreview
                  name={name}
                  price={parsedPrice}
                  interval={interval}
                  color={selectedCategory?.color_hex}
                />
              </RNHostView>
            </HStack>
          </Section>
          <Section title="Details">
            <TextField
              ref={nameInputRef}
              key={`name-${id ?? "new"}`}
              text={nameText}
              placeholder="Name"
              onTextChange={setName}
            />
          </Section>
          <Section title="Price">
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
          <Section title="Billed">
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
              }}
              modifiers={[datePickerStyle("compact")]}
            />
          </Section>
          {categories.length > 0 && (
            <Section title="Category">
              <CategoryChips
                categories={categories}
                selectedId={effectiveCategoryId}
                onSelect={(value) => {
                  dismissFormKeyboard();
                  haptics.selection();
                  setCategoryId(value);
                }}
              />
            </Section>
          )}
        </Form>
      </Host>
    </>
  );
}
