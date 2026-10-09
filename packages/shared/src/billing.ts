import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  isSameMonth,
  startOfDay,
} from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import type {
  IntervalEnum,
  SubscriptionWithCategory,
} from "./types";

const TIME_ZONE = "Europe/Copenhagen";

/** Start of today in the app's billing time zone. */
export function today() {
  return startOfDay(utcToZonedTime(new Date(), TIME_ZONE));
}

/** A stored `billed_at` timestamp as a local calendar day. */
export function toLocalDay(timestamp: string) {
  return startOfDay(utcToZonedTime(timestamp, TIME_ZONE));
}

/**
 * The nth charge after `anchor`. Always computed from the anchor (rather than
 * stepping from the previous charge) so month-end dates don't drift:
 * 31 Jan → 28 Feb → 31 Mar.
 */
function chargeAt(anchor: Date, interval: IntervalEnum, n: number) {
  switch (interval) {
    case "week":
      return addWeeks(anchor, n);
    case "month":
      return addMonths(anchor, n);
    case "year":
      return addYears(anchor, n);
  }
}

/** Index of the first charge on or after `from`. */
function firstChargeIndex(anchor: Date, interval: IntervalEnum, from: Date) {
  if (anchor >= from) return 0;
  let n =
    interval === "week"
      ? Math.floor(differenceInCalendarDays(from, anchor) / 7)
      : interval === "month"
        ? differenceInCalendarMonths(from, anchor)
        : differenceInCalendarYears(from, anchor);
  n = Math.max(0, n - 1);
  while (chargeAt(anchor, interval, n) < from) n++;
  return n;
}

/**
 * `billed_at` is the anchor of a recurring schedule. Returns the first charge
 * on or after `from` (today by default), so past dates roll forward.
 */
export function nextChargeDate(
  billedAt: string,
  interval: IntervalEnum,
  from = today(),
) {
  const anchor = toLocalDay(billedAt);
  return chargeAt(anchor, interval, firstChargeIndex(anchor, interval, from));
}

/** Every charge date within [start, end], inclusive. */
export function chargesBetween(
  billedAt: string,
  interval: IntervalEnum,
  start: Date,
  end: Date,
) {
  const anchor = toLocalDay(billedAt);
  const dates: Date[] = [];
  let n = firstChargeIndex(anchor, interval, start);
  let date = chargeAt(anchor, interval, n);
  while (date <= end) {
    dates.push(date);
    date = chargeAt(anchor, interval, ++n);
  }
  return dates;
}

/** The next `count` charge dates from `from`, for previews in the detail view. */
export function upcomingChargeDates(
  billedAt: string,
  interval: IntervalEnum,
  count: number,
  from = today(),
) {
  const anchor = toLocalDay(billedAt);
  const first = firstChargeIndex(anchor, interval, from);
  return Array.from({ length: count }, (_, i) =>
    chargeAt(anchor, interval, first + i),
  );
}

/**
 * How many charges fell within [start, end]. Unlike the functions above, the
 * schedule extends backwards from the anchor too, so this works for history
 * (e.g. everything paid since `created_at`).
 */
export function countChargesBetween(
  billedAt: string,
  interval: IntervalEnum,
  start: Date,
  end: Date,
) {
  const anchor = toLocalDay(billedAt);
  let n =
    interval === "week"
      ? Math.floor(differenceInCalendarDays(start, anchor) / 7)
      : interval === "month"
        ? differenceInCalendarMonths(start, anchor)
        : differenceInCalendarYears(start, anchor);
  n -= 1;
  while (chargeAt(anchor, interval, n) < start) n++;
  let count = 0;
  while (chargeAt(anchor, interval, n) <= end) {
    count++;
    n++;
  }
  return count;
}

export function monthlyEquivalent(price: number, interval: IntervalEnum) {
  switch (interval) {
    case "week":
      return (price * 52) / 12;
    case "month":
      return price;
    case "year":
      return price / 12;
  }
}

export function yearlyEquivalent(price: number, interval: IntervalEnum) {
  return monthlyEquivalent(price, interval) * 12;
}

/** What all subscriptions cost per month, with weekly and yearly normalised. */
export function totalPerMonth(subscriptions: SubscriptionWithCategory[]) {
  return subscriptions.reduce(
    (acc, s) => acc + monthlyEquivalent(s.price ?? 0, s.interval),
    0,
  );
}

export type ScheduledSubscription = {
  subscription: SubscriptionWithCategory;
  nextCharge: Date;
};

/** Subscriptions paired with their next charge, soonest first. */
export function scheduleSubscriptions(
  subscriptions: SubscriptionWithCategory[],
  from = today(),
): ScheduledSubscription[] {
  return subscriptions
    .map((subscription) => ({
      subscription,
      nextCharge: nextChargeDate(subscription.billed_at, subscription.interval, from),
    }))
    .sort(
      (a, b) =>
        a.nextCharge.getTime() - b.nextCharge.getTime() ||
        (a.subscription.name ?? "").localeCompare(b.subscription.name ?? ""),
    );
}

export type TimeBucket = {
  key: "week" | "month" | "later";
  title: string;
  items: ScheduledSubscription[];
};

/** Groups a schedule into "Next 7 days", "Later this month" and "Later". Empty buckets are dropped. */
export function bucketByTime(
  schedule: ScheduledSubscription[],
  from = today(),
): TimeBucket[] {
  const buckets: TimeBucket[] = [
    { key: "week", title: "Next 7 days", items: [] },
    { key: "month", title: "Later this month", items: [] },
    { key: "later", title: "Later", items: [] },
  ];
  for (const item of schedule) {
    const days = differenceInCalendarDays(item.nextCharge, from);
    if (days <= 7) buckets[0].items.push(item);
    else if (isSameMonth(item.nextCharge, from)) buckets[1].items.push(item);
    else buckets[2].items.push(item);
  }
  return buckets.filter((b) => b.items.length > 0);
}
