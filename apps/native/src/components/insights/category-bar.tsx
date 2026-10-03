import { View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { withAlpha } from "@/lib/theme";
import type { CategorySpend } from "./spend-by-category";

/**
 * One segment per category, sized by share of spend. Shares don't depend on
 * the period, so the bar is static when the period changes.
 */
export function CategoryBar({ categories }: { categories: CategorySpend[] }) {
  const colors = useThemeColors();
  const visible = categories.filter((c) => c.share > 0);
  if (visible.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", gap: 3, height: 14 }}>
      {visible.map((c) => (
        <View
          key={c.key}
          style={{
            flex: c.share,
            minWidth: 4,
            borderRadius: 6,
            borderCurve: "continuous",
            backgroundColor: withAlpha(c.color, 1, colors.faint),
          }}
        />
      ))}
    </View>
  );
}
