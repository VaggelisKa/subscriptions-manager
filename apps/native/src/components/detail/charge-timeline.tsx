import { StyleSheet, Text, View } from "react-native";
import { differenceInCalendarDays } from "date-fns";
import { useThemeColors } from "@/providers/theme-provider";
import { Group } from "@/components/ui/grouped";
import { today } from "@subscriptions-manager/shared/billing";
import { fonts, spacing } from "@/lib/theme";
import {
  formatDayDate,
  formatDueLabel,
  formatKr,
  isDueSoon,
} from "@subscriptions-manager/shared/format";

type Props = {
  dates: Date[];
  price: number;
};

const DOT = 10;
const ROW_PADDING_H = spacing.lg;

/** Next charges as a vertical timeline: dot + connecting line per row. */
export function ChargeTimeline({ dates, price }: Props) {
  const colors = useThemeColors();

  return (
    <Group>
      <View style={styles.list}>
        {dates.map((date, i) => {
          const first = i === 0;
          const soon = first && isDueSoon(date);
          // "in 3 days" only while it's close; a far-off date would just repeat the left column.
          const showDue =
            first && differenceInCalendarDays(date, today()) <= 7;
          return (
            <View key={date.getTime()} style={styles.row}>
              {i < dates.length - 1 && (
                <View
                  style={[styles.line, { backgroundColor: colors.separator }]}
                />
              )}
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: colors.primary,
                    backgroundColor: first ? colors.primary : colors.surface,
                  },
                ]}
              />
              <Text
                style={[styles.date, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {formatDayDate(date)}
              </Text>
              <Text
                style={[
                  styles.trailing,
                  { color: soon ? colors.primaryText : colors.mutedForeground },
                ]}
              >
                {showDue ? formatDueLabel(date) : formatKr(price)}
              </Text>
            </View>
          );
        })}
      </View>
    </Group>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: ROW_PADDING_H,
  },
  line: {
    position: "absolute",
    left: ROW_PADDING_H + DOT / 2 - 1,
    width: 2,
    top: "50%",
    bottom: "-50%",
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2.5,
  },
  date: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  trailing: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
  },
});
