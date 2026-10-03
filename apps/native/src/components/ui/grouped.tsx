import {
  Children,
  Fragment,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/providers/theme-provider";
import { radius, spacing, type } from "@/lib/theme";

type GroupProps = {
  children: ReactNode;
  /** Left inset of the separators between rows (aligns with row text). */
  separatorInset?: number;
  style?: ComponentProps<typeof View>["style"];
};

/** Raised, rounded container for rows, with inset hairline separators. */
export function Group({ children, separatorInset = 68, style }: GroupProps) {
  const colors = useThemeColors();
  const items = Children.toArray(children);

  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.surface },
        style,
      ]}
    >
      {items.map((child, i) => (
        <Fragment
          key={isValidElement(child) && child.key != null ? child.key : i}
        >
          {i > 0 && (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                marginLeft: separatorInset,
                backgroundColor: colors.separator,
              }}
            />
          )}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

type SectionHeaderProps = {
  title: string;
  /** Muted text on the right, e.g. a section total. */
  trailing?: string;
};

export function SectionHeader({ title, trailing }: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.header}>
      <Text style={[type.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {trailing ? (
        <Text
          style={[
            type.footnote,
            { color: colors.mutedForeground, fontVariant: ["tabular-nums"] },
          ]}
        >
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: spacing.xs + 2,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
});
