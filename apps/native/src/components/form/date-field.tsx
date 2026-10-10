import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { format } from "date-fns";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";
import { withDay } from "./with-day";

export type DateFieldProps = {
  /** Shown before the date and used as its accessible name. */
  label: string;
  value: Date;
  /** Called with the picked day, keeping `value`'s time of day. */
  onChange: (date: Date) => void;
};

/**
 * A labelled date field. iOS uses a SwiftUI date picker (`.ios.tsx`), the web
 * the browser's `<input type="date">` (`.web.tsx`). Elsewhere (Android, until
 * it gets the native picker) the day is typed as YYYY-MM-DD and applied once
 * it's a real date.
 */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const colors = useThemeColors();
  const [text, setText] = useState(() => format(value, "yyyy-MM-dd"));

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        aria-label={label}
        value={text}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.faint}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        selectionColor={colors.primary}
        onChangeText={(next) => {
          setText(next);
          const date = withDay(value, next);
          if (date) onChange(date);
        }}
        style={[styles.input, { backgroundColor: colors.fill, color: colors.foreground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { fontFamily: fonts.regular, fontSize: 17 },
  input: {
    minWidth: 130,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    fontFamily: fonts.regular,
    fontSize: 17,
    fontVariant: ["tabular-nums"],
  },
});
