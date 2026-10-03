import { useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { useThemeColors } from "@/providers/theme-provider";
import { chargesBetween, today } from "@/lib/billing";
import { formatDayDate } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { fonts, spacing } from "@/lib/theme";

const DAYS = 36;
const CELL_WIDTH = 40;
const CELL_GAP = 6;
const MAX_DOTS = 3;

type Props = {
  subscriptions: SubscriptionWithCategory[];
};

type Day = {
  date: Date;
  /** Category colours of the charges that day (null when uncategorised). */
  charges: (string | null)[];
};

/** Yesterday plus the next ~5 weeks, each day with the charges that land on it. */
function buildDays(subscriptions: SubscriptionWithCategory[]): Day[] {
  const start = addDays(today(), -1);
  const end = addDays(start, DAYS - 1);
  const days: Day[] = Array.from({ length: DAYS }, (_, i) => ({
    date: addDays(start, i),
    charges: [],
  }));
  for (const s of subscriptions) {
    for (const date of chargesBetween(s.billed_at, s.interval, start, end)) {
      days[differenceInCalendarDays(date, start)]?.charges.push(
        s.categories?.color_hex ?? null,
      );
    }
  }
  return days;
}

/** Horizontal strip of days with a dot per charge, in category colours. */
export function DayStrip({ subscriptions }: Props) {
  const colors = useThemeColors();
  const days = buildDays(subscriptions);
  const lastIndex = useRef(0);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / (CELL_WIDTH + CELL_GAP),
    );
    if (index !== lastIndex.current && index >= 0 && index < DAYS) {
      lastIndex.current = index;
      haptics.selection();
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {days.map(({ date, charges }, i) => {
        const isToday = i === 1;
        const isPast = i === 0;
        // The 1st shows the month instead of the weekday to mark the boundary.
        const isMonthStart = date.getDate() === 1 && !isToday;
        const textColor = isToday
          ? "#fff"
          : isPast
            ? colors.faint
            : colors.foreground;

        return (
          <View
            key={date.toISOString()}
            accessible
            accessibilityLabel={`${isToday ? "Today, " : ""}${formatDayDate(date)}, ${
              charges.length === 0
                ? "no charges"
                : `${charges.length} ${charges.length === 1 ? "charge" : "charges"}`
            }`}
            style={[
              styles.cell,
              {
                backgroundColor: isToday
                  ? colors.primary
                  : isPast
                    ? "transparent"
                    : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.weekday,
                {
                  color: isToday
                    ? "#fff"
                    : isPast
                      ? colors.faint
                      : isMonthStart
                        ? colors.primaryText
                        : colors.mutedForeground,
                },
              ]}
            >
              {format(date, isMonthStart ? "MMM" : "EEEEE")}
            </Text>
            <Text style={[styles.dayNumber, { color: textColor }]}>
              {format(date, "d")}
            </Text>
            <View style={styles.dots}>
              {charges.slice(0, MAX_DOTS).map((color, j) => (
                <View
                  key={j}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isToday
                        ? "#fff"
                        : color && /^#[0-9a-f]{6}$/i.test(color)
                          ? color
                          : colors.faint,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -spacing.lg,
    marginTop: 18,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_WIDTH,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingTop: 7,
    paddingBottom: 8,
    alignItems: "center",
    gap: 3,
  },
  weekday: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 13,
  },
  dayNumber: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 19,
    fontVariant: ["tabular-nums"],
  },
  dots: {
    flexDirection: "row",
    gap: 2,
    height: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
