import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useTheme } from "@/providers/theme-provider";
import { SubscriptionRow } from "@/components/subscription-row";
import { nextChargeDate } from "@subscriptions-manager/shared/billing";
import { formatWholeNumber, intervalSuffix } from "@subscriptions-manager/shared/format";
import { haptics } from "@/lib/haptics";
import { fonts, radius, spacing, withAlpha } from "@/lib/theme";
import {
  periodFactor,
  type CategorySpend,
  type Period,
} from "./spend-by-category";

const layout = LinearTransition.duration(240);
/** Separator inset under a category row (aligns with the name). */
const CATEGORY_INSET = 54;
/** Separator inset under a subscription row (aligns with the name). */
const SUBSCRIPTION_INSET = 66;

type Props = {
  categories: CategorySpend[];
  period: Period;
  expanded: string[];
  onToggle: (key: string) => void;
};

/**
 * Grouped list of categories. Rows expand in place to show their
 * subscriptions; siblings slide with a layout transition.
 *
 * Styled like `Group` but built on Animated views so separators and the
 * container height animate with the rows.
 */
export function CategoryList({ categories, period, expanded, onToggle }: Props) {
  const { colors } = useTheme();

  return (
    <Animated.View
      layout={layout}
      style={[styles.group, { backgroundColor: colors.surface }]}
    >
      {categories.map((category, i) => (
        <Animated.View key={category.key} layout={layout}>
          {i > 0 && <Separator inset={CATEGORY_INSET} />}
          <CategoryRow
            category={category}
            period={period}
            open={expanded.includes(category.key)}
            onPress={() => onToggle(category.key)}
          />
          {expanded.includes(category.key) && (
            <Animated.View
              entering={FadeIn.duration(200).delay(60)}
              exiting={FadeOut.duration(120)}
            >
              {category.subscriptions.map((s) => (
                <View key={s.id}>
                  <Separator inset={SUBSCRIPTION_INSET} />
                  <SubscriptionRow
                    subscription={s}
                    nextCharge={nextChargeDate(s.billed_at, s.interval)}
                    onPress={() =>
                      router.push({
                        pathname: "/subscription/[id]",
                        params: { id: s.id },
                      })
                    }
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function Separator({ inset }: { inset: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        marginLeft: inset,
        backgroundColor: colors.separator,
      }}
    />
  );
}

type RowProps = {
  category: CategorySpend;
  period: Period;
  open: boolean;
  onPress: () => void;
};

function CategoryRow({ category, period, open, onPress }: RowProps) {
  const { colors, colorScheme } = useTheme();
  const amount = category.monthly * periodFactor[period];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${category.name}, ${Math.round(category.share * 100)}% of spend, ${formatWholeNumber(amount)} kr per ${period}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.fill },
      ]}
    >
      <View
        style={[
          styles.swatchTile,
          {
            backgroundColor: withAlpha(
              category.color,
              colorScheme === "dark" ? 0.24 : 0.14,
              colors.fill,
            ),
          },
        ]}
      >
        <View
          style={[
            styles.swatch,
            { backgroundColor: withAlpha(category.color, 1, colors.faint) },
          ]}
        />
      </View>
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: colors.foreground }]}
        >
          {category.name}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {Math.round(category.share * 100)}% of spend
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>
        {formatWholeNumber(amount)} kr
        <Text style={[styles.suffix, { color: colors.mutedForeground }]}>
          {intervalSuffix[period]}
        </Text>
      </Text>
      <Animated.View
        style={{
          transform: [{ rotate: open ? "180deg" : "0deg" }],
          transitionProperty: "transform",
          transitionDuration: 240,
        }}
      >
        <Image
          accessible={false}
          source="sf:chevron.down"
          tintColor={colors.faint}
          style={styles.chevron}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 58,
  },
  swatchTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderCurve: "continuous",
  },
  main: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  meta: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  amount: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  suffix: { fontFamily: fonts.semiBold, fontSize: 12 },
  chevron: { width: 12, height: 12, marginLeft: -2 },
});
