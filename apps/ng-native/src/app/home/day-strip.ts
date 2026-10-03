import { Component, computed, input } from "@angular/core";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { ScrollView, Text, View } from "@ng-native/components";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { chargesBetween, today } from "../lib/billing.ts";
import { isHexColor } from "../lib/colors.ts";
import { formatDayDate } from "../lib/format.ts";

const DAYS = 36;
const MAX_DOTS = 3;

type Day = {
  key: string;
  weekday: string;
  number: string;
  label: string;
  past: boolean;
  today: boolean;
  monthStart: boolean;
  /** One dot colour per charge that day, at most three. */
  dots: string[];
};

/** Yesterday plus the next ~5 weeks, each day with the charges that land on it. */
function buildDays(subscriptions: SubscriptionWithCategory[]): Day[] {
  const start = addDays(today(), -1);
  const end = addDays(start, DAYS - 1);
  const charges: (string | null)[][] = Array.from({ length: DAYS }, () => []);
  for (const s of subscriptions) {
    for (const date of chargesBetween(s.billed_at, s.interval, start, end)) {
      charges[differenceInCalendarDays(date, start)]?.push(s.categories?.color_hex ?? null);
    }
  }
  return charges.map((colors, i) => {
    const date = addDays(start, i);
    const isToday = i === 1;
    // The 1st shows the month instead of the weekday to mark the boundary.
    const monthStart = date.getDate() === 1 && !isToday;
    const count = colors.length;
    return {
      key: date.toISOString(),
      weekday: format(date, monthStart ? "MMM" : "EEEEE"),
      number: format(date, "d"),
      label: `${isToday ? "Today, " : ""}${formatDayDate(date)}, ${
        count === 0 ? "no charges" : `${count} ${count === 1 ? "charge" : "charges"}`
      }`,
      past: i === 0,
      today: isToday,
      monthStart,
      dots: colors
        .slice(0, MAX_DOTS)
        .map((c) => (isToday ? "#ffffff" : isHexColor(c) ? c : "var(--faint)")),
    };
  });
}

/** Horizontal strip of days with a dot per charge, in category colours. */
@Component({
  selector: "app-day-strip",
  imports: [ScrollView, Text, View],
  template: `
    <scroll-view class="strip" [horizontal]="true" [showsHorizontalScrollIndicator]="false">
      <view class="days">
        @for (day of days(); track day.key) {
          <view
            class="cell"
            [class.past]="day.past"
            [class.today]="day.today"
            [accessible]="true"
            [accessibilityLabel]="day.label"
          >
            <text class="weekday" [class.month]="day.monthStart" [maxFontSizeMultiplier]="1.2">{{
              day.weekday
            }}</text>
            <text class="number" [maxFontSizeMultiplier]="1.2">{{ day.number }}</text>
            <view class="dots">
              @for (dot of day.dots; track $index) {
                <view class="dot" [style.background-color]="dot"></view>
              }
            </view>
          </view>
        }
      </view>
    </scroll-view>
  `,
  styles: `
    .strip {
      margin: 18px -16px 0;
    }
    .days {
      flex-direction: row;
      gap: 6px;
      padding: 0 16px;
    }
    .cell {
      width: 40px;
      border-radius: 14px;
      padding: 7px 0 8px;
      align-items: center;
      gap: 3px;
      background-color: var(--surface);
    }
    .cell.past {
      background-color: transparent;
    }
    .cell.today {
      background-color: var(--primary);
    }
    .weekday {
      font-weight: 700;
      font-size: 10.5px;
      line-height: 13px;
      color: var(--muted);
    }
    .weekday.month {
      color: var(--primary-text);
    }
    .number {
      font-weight: 800;
      font-size: 15px;
      line-height: 19px;
    }
    .past .weekday,
    .past .number {
      color: var(--faint);
    }
    .today .weekday,
    .today .number {
      color: #ffffff;
    }
    .dots {
      flex-direction: row;
      gap: 2px;
      height: 6px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 3px;
    }
  `,
})
export class DayStrip {
  readonly subscriptions = input.required<SubscriptionWithCategory[]>();

  protected readonly days = computed(() => buildDays(this.subscriptions()));
}
