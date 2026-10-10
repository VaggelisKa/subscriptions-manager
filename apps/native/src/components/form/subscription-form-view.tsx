import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Image } from "expo-image";
import { intervalName } from "@subscriptions-manager/shared/format";
import { useThemeColors } from "@/providers/theme-provider";
import { haptics } from "@/lib/haptics";
import { confirm } from "@/lib/confirm";
import { deleteSubscriptionPrompt } from "@/lib/delete-subscription-prompt";
import { fonts, radius, spacing } from "@/lib/theme";
import { uiIcons } from "@/lib/ui-icons";
import { INTERVALS, type SubscriptionForm } from "@/lib/use-subscription-form";
import { SubscriptionPreview } from "@/components/form/subscription-preview";
import { CategoryPicker } from "@/components/form/category-picker";
import { DateField } from "@/components/form/date-field";
import { Segmented } from "@/components/ui/segmented";

const FLOAT_SHADOW = "0 6px 20px -8px rgba(28, 25, 23, 0.25), 0 0 0 0.5px rgba(28, 25, 23, 0.08)";

/**
 * The add/edit form in plain RN (SwiftUI on iOS, `.ios.tsx`), laid out like
 * the web app's form sheet: a header with Close, the title, Delete and Save,
 * then a live preview and the Details, Price and Billed sections. Problems
 * are shown inline above the fields.
 */
export function SubscriptionFormView({ form }: { form: SubscriptionForm }) {
  const colors = useThemeColors();
  const { isEdit, categories, saving } = form;
  const title = isEdit ? "Edit subscription" : "New subscription";

  function handleSave() {
    if (!saving) void form.save();
  }

  async function handleDelete() {
    haptics.warning();
    if (await confirm(deleteSubscriptionPrompt(form.name))) await form.remove();
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* The header is drawn below; the navigator's own has no toolbar buttons here. */}
      <Stack.Screen options={{ title, headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <HeaderButton label="Close" icon={uiIcons.x} onPress={form.close} />
        </View>
        <Text
          role="heading"
          aria-level={2}
          numberOfLines={1}
          style={[styles.title, { color: colors.foreground }]}
        >
          {title}
        </Text>
        <View style={[styles.headerSide, styles.headerActions]}>
          {isEdit && !saving ? (
            <HeaderButton
              label="Delete subscription"
              icon={uiIcons.trash}
              tint={colors.destructive}
              onPress={handleDelete}
            />
          ) : null}
          <HeaderButton
            label={saving ? "Saving" : "Save"}
            icon={uiIcons.check}
            prominent
            busy={saving}
            onPress={handleSave}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <SubscriptionPreview
          name={form.name}
          price={form.parsedPrice}
          interval={form.interval}
          color={form.selectedCategory?.color_hex}
        />

        {form.error ? (
          <Text role="alert" style={[styles.error, { color: colors.destructive }]}>
            {form.error}
          </Text>
        ) : null}

        <Section title="Details">
          <TextInput
            aria-label="Name"
            placeholder="Name"
            placeholderTextColor={colors.faint}
            autoComplete="off"
            value={form.name}
            onChangeText={form.setName}
            onSubmitEditing={handleSave}
            selectionColor={colors.primary}
            style={[styles.input, { color: colors.foreground }]}
          />
          {categories.length > 0 ? (
            <>
              <Separator />
              <CategoryPicker
                categories={categories}
                selectedId={form.categoryId}
                onSelect={(value) => {
                  haptics.selection();
                  form.setCategoryId(value);
                }}
              />
            </>
          ) : null}
        </Section>

        <Section title="Price">
          <View style={styles.priceRow}>
            <TextInput
              aria-label="Price in kroner"
              inputMode="decimal"
              placeholder="0"
              placeholderTextColor={colors.faint}
              autoComplete="off"
              value={form.price}
              onChangeText={form.setPrice}
              onSubmitEditing={handleSave}
              selectionColor={colors.primary}
              style={[styles.input, styles.priceInput, { color: colors.foreground }]}
            />
            <Text aria-hidden style={[styles.unit, { color: colors.mutedForeground }]}>
              kr
            </Text>
          </View>
        </Section>

        <Section title="Billed">
          <View style={styles.interval}>
            <Segmented
              label="Interval"
              options={INTERVALS.map((value) => ({ value, label: intervalName[value] }))}
              value={form.interval}
              onChange={form.setInterval}
            />
          </View>
          <Separator />
          <DateField label="Next charge" value={form.billedAt} onChange={form.setBilledAt} />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View>
      <Text
        role="heading"
        aria-level={3}
        style={[styles.sectionTitle, { color: colors.mutedForeground }]}
      >
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

function Separator() {
  const colors = useThemeColors();
  return <View style={[styles.separator, { backgroundColor: colors.separator }]} />;
}

type HeaderButtonProps = {
  label: string;
  icon: number;
  onPress: () => void;
  /** The orange confirm button (Save). */
  prominent?: boolean;
  /** Icon colour of a plain button; defaults to the foreground. */
  tint?: string;
  /** Shows a spinner and ignores presses. */
  busy?: boolean;
};

/** A round 44pt toolbar button, like the native sheet's. */
function HeaderButton({ label, icon, onPress, prominent, tint, busy }: HeaderButtonProps) {
  const colors = useThemeColors();
  const color = prominent ? colors.primaryForeground : (tint ?? colors.foreground);

  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: prominent ? colors.primary : colors.glass },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Image accessible={false} source={icon} tintColor={color} style={styles.headerIcon} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: spacing.sm,
  },
  headerSide: { flex: 1, flexDirection: "row" },
  headerActions: { justifyContent: "flex-end", gap: spacing.sm },
  title: {
    flexShrink: 1,
    fontFamily: fonts.extraBold,
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: FLOAT_SHADOW,
  },
  headerIcon: { width: 22, height: 22 },
  content: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  error: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  sectionTitle: {
    paddingTop: 20,
    paddingBottom: 6,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  card: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  input: {
    height: 52,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 17,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  priceInput: { flex: 1, minWidth: 0, fontVariant: ["tabular-nums"] },
  unit: { fontFamily: fonts.regular, fontSize: 17 },
  interval: { padding: spacing.lg, paddingBottom: spacing.md },
});
