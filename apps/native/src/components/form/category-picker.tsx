import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import type { Category } from "@subscriptions-manager/shared/types";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";
import { uiIcons } from "@/lib/ui-icons";

type Props = {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const HEX = /^#[0-9a-f]{6}$/i;
/** From here on every category fits on screen as a chip (the desktop layout). */
const CHIPS_MIN_WIDTH = 1024;

/**
 * Category in plain RN (SwiftUI menu picker on iOS, `.ios.tsx`): a row of
 * radio chips on wide screens, and on narrow ones a "Category" form row that
 * opens the list in a modal.
 */
export function CategoryPicker(props: Props) {
  const { width } = useWindowDimensions();
  return width >= CHIPS_MIN_WIDTH ? <CategoryChips {...props} /> : <CategoryMenu {...props} />;
}

function Dot({ color, size }: { color: string | null | undefined; size: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color && HEX.test(color) ? color : colors.faint,
      }}
    />
  );
}

function CategoryChips({ categories, selectedId, onSelect }: Props) {
  const colors = useThemeColors();

  return (
    <View
      role="radiogroup"
      aria-label="Category"
      style={[styles.chips, { backgroundColor: colors.surface }]}
    >
      {categories.map((c) => {
        const checked = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            role="radio"
            aria-checked={checked}
            onPress={() => onSelect(c.id)}
            style={[
              styles.chip,
              checked
                ? { backgroundColor: colors.surface, borderColor: colors.primary }
                : { backgroundColor: colors.fill, borderColor: "transparent" },
            ]}
          >
            <Dot color={c.color_hex} size={8} />
            <Text style={[styles.chipText, { color: colors.foreground }]}>{c.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryMenu({ categories, selectedId, onSelect }: Props) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === selectedId);
  // Only edits can be uncategorised; offer "None" just to show that.
  const options = [
    ...(selected ? [] : [{ id: "", name: "None", color_hex: null }]),
    ...categories,
  ];

  function choose(id: string) {
    setOpen(false);
    if (id !== selectedId) onSelect(id);
  }

  return (
    <>
      <Pressable
        role="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fill }]}
      >
        <Dot color={selected?.color_hex} size={10} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>Category</Text>
        <Text numberOfLines={1} style={[styles.rowValue, { color: colors.mutedForeground }]}>
          {selected?.name ?? "None"}
        </Text>
        <Image
          accessible={false}
          source={uiIcons.chevronsUpDown}
          tintColor={colors.mutedForeground}
          style={styles.rowIcon}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessible={false}
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        >
          {/* A plain View so presses on the card don't reach the backdrop's close. */}
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.menu, { backgroundColor: colors.surface }]}
          >
            <ScrollView>
              <View role="radiogroup" aria-label="Category">
                {options.map((c, i) => {
                  const checked = c.id === selectedId || (!selected && c.id === "");
                  return (
                    <Pressable
                      key={c.id}
                      role="radio"
                      aria-checked={checked}
                      onPress={() => choose(c.id)}
                      style={({ pressed }) => [
                        styles.option,
                        i > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.separator,
                        },
                        pressed && { backgroundColor: colors.fill },
                      ]}
                    >
                      <Dot color={c.color_hex} size={10} />
                      <Text
                        numberOfLines={1}
                        style={[styles.optionText, { color: colors.foreground }]}
                      >
                        {c.name}
                      </Text>
                      {checked ? (
                        <Image
                          accessible={false}
                          source={uiIcons.check}
                          tintColor={colors.primaryText}
                          style={styles.optionCheck}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderCurve: "continuous",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 17 },
  rowValue: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 17 },
  rowIcon: { width: 16, height: 16, marginLeft: -6 },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  menu: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "60%",
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  optionText: { flex: 1, fontFamily: fonts.regular, fontSize: 17 },
  optionCheck: { width: 18, height: 18 },
});
