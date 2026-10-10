import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { useTheme } from "@/providers/theme-provider";
import { fonts, radius, spacing } from "@/lib/theme";
import type { DateFieldProps } from "./date-field";
import { withDay } from "./with-day";

/** A labelled date field: the browser's own `<input type="date">` and its picker. */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const { colors, colorScheme } = useTheme();

  return (
    <View style={styles.row}>
      <Text aria-hidden style={[styles.label, { color: colors.foreground }]}>
        {label}
      </Text>
      <input
        type="date"
        aria-label={label}
        value={format(value, "yyyy-MM-dd")}
        // Clearing the field (or a half-typed year) isn't a date; keep the last one.
        onChange={(event) => {
          const date = withDay(value, event.target.value);
          if (date) onChange(date);
        }}
        style={{
          colorScheme,
          padding: `6px ${spacing.md}px`,
          border: "none",
          borderRadius: radius.sm,
          backgroundColor: colors.fill,
          color: colors.foreground,
          fontFamily: fonts.regular,
          fontSize: 17,
          fontVariantNumeric: "tabular-nums",
        }}
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
});
