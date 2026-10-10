import { useRef } from "react";
import { View, ActivityIndicator, PlatformColor } from "react-native";
import { Stack, router } from "expo-router";
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
import { useTheme, useThemeColors } from "@/providers/theme-provider";
import { intervalName } from "@subscriptions-manager/shared/format";
import { haptics } from "@/lib/haptics";
import { confirm } from "@/lib/confirm";
import { notify } from "@/lib/notify";
import { deleteSubscriptionPrompt } from "@/lib/delete-subscription-prompt";
import { INTERVALS, type SubscriptionForm } from "@/lib/use-subscription-form";
import { SubscriptionPreview } from "@/components/form/subscription-preview";
import { CategoryPicker } from "@/components/form/category-picker";

// Below full height iOS gives form rows a translucent fill meant for the
// sheet's glass; pin them to the solid color they have at full height.
const ROW_MODIFIERS = [
  listRowBackground(PlatformColor("secondarySystemGroupedBackground")),
];

/** The add/edit form as a SwiftUI Form, with Save and Delete in the toolbar. */
export function SubscriptionFormView({ form }: { form: SubscriptionForm }) {
  const { colorScheme } = useTheme();
  const colors = useThemeColors();
  const { id, isEdit, categories, saving } = form;

  const nameText = useNativeState(form.name);
  const priceText = useNativeState(form.price);
  const nameInputRef = useRef<TextFieldRef>(null);
  const priceInputRef = useRef<TextFieldRef>(null);

  function dismissFormKeyboard() {
    void nameInputRef.current?.blur();
    void priceInputRef.current?.blur();
  }

  async function handleSave() {
    const error = await form.save();
    if (error) void notify("Error", error);
  }

  async function handleDelete() {
    if (!(await confirm(deleteSubscriptionPrompt(form.name)))) return;
    const error = await form.remove();
    if (error) void notify("Error", error);
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
              name={form.name}
              price={form.parsedPrice}
              interval={form.interval}
              color={form.selectedCategory?.color_hex}
            />
          </Section>
          <Section title="Details" modifiers={ROW_MODIFIERS}>
            <TextField
              ref={nameInputRef}
              key={`name-${id ?? "new"}`}
              text={nameText}
              placeholder="Name"
              onTextChange={form.setName}
            />
            {categories.length > 0 && (
              <CategoryPicker
                categories={categories}
                selectedId={form.categoryId}
                onSelect={(value) => {
                  dismissFormKeyboard();
                  haptics.selection();
                  form.setCategoryId(value);
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
                onTextChange={form.setPrice}
              />
              <SwiftText modifiers={[foregroundStyle("secondary")]}>kr</SwiftText>
            </HStack>
          </Section>
          <Section title="Billed" modifiers={ROW_MODIFIERS}>
            <Picker
              label="Interval"
              selection={form.interval}
              onSelectionChange={(value) => {
                dismissFormKeyboard();
                form.setInterval(value as IntervalEnum);
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
              selection={form.billedAt}
              onDateChange={(date) => {
                dismissFormKeyboard();
                form.setBilledAt(date);
              }}
              modifiers={[datePickerStyle("compact")]}
            />
          </Section>
        </Form>
      </Host>
    </>
  );
}
