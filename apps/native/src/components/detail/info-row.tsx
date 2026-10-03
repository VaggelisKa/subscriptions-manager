import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { fonts, spacing } from "@/lib/theme";

type Props = {
  label: string;
  value: string;
};

/** Label on the left, muted value on the right, for a `Group`. */
export function InfoRow({ label, value }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <Text
        selectable
        style={[styles.value, { color: colors.mutedForeground }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15.5,
    lineHeight: 21,
  },
  value: {
    fontFamily: fonts.semiBold,
    fontSize: 15.5,
    lineHeight: 21,
    fontVariant: ["tabular-nums"],
  },
});
