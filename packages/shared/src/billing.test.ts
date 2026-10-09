import { afterEach, describe, expect, test, vi } from "vitest";
import { format } from "date-fns";
import {
  bucketByTime,
  chargesBetween,
  countChargesBetween,
  monthlyEquivalent,
  nextChargeDate,
  scheduleSubscriptions,
  today,
  toLocalDay,
  totalPerMonth,
  upcomingChargeDates,
  yearlyEquivalent,
} from "./billing";
import { toBilledAt } from "./price";
import type { SubscriptionWithCategory } from "./types";

/** A stored `billed_at` for a calendar day. */
function anchor(day: string) {
  const billedAt = toBilledAt(day);
  if (!billedAt) throw new Error(`Not a day: ${day}`);
  return billedAt;
}

/** A local calendar day. */
function day(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function days(dates: Date[]) {
  return dates.map((d) => format(d, "yyyy-MM-dd"));
}

function subscription(over: Partial<SubscriptionWithCategory>): SubscriptionWithCategory {
  return {
    id: "s1",
    name: "Netflix",
    price: 129,
    interval: "month",
    billed_at: anchor("2026-01-31"),
    created_at: "2025-12-01T12:00:00.000Z",
    description: null,
    user_id: "u1",
    categories: null,
    ...over,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("month ends don't drift", () => {
  test("31 Jan monthly → 28 Feb → 31 Mar", () => {
    expect(days(upcomingChargeDates(anchor("2026-01-31"), "month", 4, day("2026-01-31")))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  test("the charge after a clamped 28 Feb is 31 Mar, not 28 Mar", () => {
    expect(days([nextChargeDate(anchor("2026-01-31"), "month", day("2026-03-01"))])).toEqual(["2026-03-31"]);
    expect(days(chargesBetween(anchor("2026-01-31"), "month", day("2026-02-01"), day("2026-05-31")))).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  test("29 Feb yearly → 28 Feb in common years, 29 Feb again in the next leap year", () => {
    expect(days(upcomingChargeDates(anchor("2028-02-29"), "year", 5, day("2028-02-29")))).toEqual([
      "2028-02-29",
      "2029-02-28",
      "2030-02-28",
      "2031-02-28",
      "2032-02-29",
    ]);
  });
});

describe("daylight saving time", () => {
  test("runs in Copenhagen time (vitest.config.mts), so the changes below are real", () => {
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-120);
  });

  test("weekly charges stay on the same weekday across the March change", () => {
    const dates = chargesBetween(anchor("2026-03-20"), "week", day("2026-03-20"), day("2026-04-10"));
    expect(days(dates)).toEqual(["2026-03-20", "2026-03-27", "2026-04-03", "2026-04-10"]);
    for (const date of dates) {
      expect(date.getDay()).toBe(5);
      expect(date.getHours()).toBe(0);
    }
  });

  test("weekly charges stay on the same weekday across the October change", () => {
    const dates = upcomingChargeDates(anchor("2026-10-23"), "week", 3, day("2026-10-23"));
    expect(days(dates)).toEqual(["2026-10-23", "2026-10-30", "2026-11-06"]);
    for (const date of dates) expect(date.getHours()).toBe(0);
  });

  test("the next weekly charge right after the change is a week on, not a day early or late", () => {
    expect(days([nextChargeDate(anchor("2026-03-27"), "week", day("2026-03-30"))])).toEqual(["2026-04-03"]);
  });
});

describe("anchors", () => {
  test("an anchor in the future is the next charge", () => {
    const from = day("2026-10-14");
    expect(days([nextChargeDate(anchor("2026-12-01"), "month", from)])).toEqual(["2026-12-01"]);
    expect(days(upcomingChargeDates(anchor("2026-12-01"), "month", 2, from))).toEqual(["2026-12-01", "2027-01-01"]);
    expect(chargesBetween(anchor("2026-12-01"), "month", from, day("2026-11-30"))).toEqual([]);
  });

  test("history counts extend the schedule backwards from a future anchor", () => {
    expect(countChargesBetween(anchor("2026-12-01"), "month", day("2026-10-01"), day("2026-10-31"))).toBe(1);
    expect(countChargesBetween(anchor("2026-12-15"), "week", day("2026-12-01"), day("2026-12-14"))).toBe(2);
  });

  test("an anchor years in the past rolls forward to the next charge", () => {
    const from = day("2026-10-14");
    expect(days([nextChargeDate(anchor("2019-01-31"), "month", from)])).toEqual(["2026-10-31"]);
    expect(days([nextChargeDate(anchor("2020-02-29"), "year", from)])).toEqual(["2027-02-28"]);
    expect(days([nextChargeDate(anchor("2020-01-06"), "week", from)])).toEqual(["2026-10-19"]);
    expect(days([nextChargeDate(anchor("2016-10-14"), "year", from)])).toEqual(["2026-10-14"]);
  });

  test("history counts from an old anchor", () => {
    expect(countChargesBetween(anchor("2019-01-31"), "month", day("2019-01-01"), day("2019-12-31"))).toBe(12);
    expect(countChargesBetween(anchor("2019-01-31"), "month", day("2026-01-01"), day("2026-12-31"))).toBe(12);
    expect(countChargesBetween(anchor("2020-01-06"), "week", day("2026-10-01"), day("2026-10-31"))).toBe(4);
  });

  test("a legacy timestamp is read as its Copenhagen day", () => {
    // 00:30 on 14 Oct in Copenhagen, still 13 Oct in UTC.
    expect(days([toLocalDay("2026-10-13T22:30:00.000Z")])).toEqual(["2026-10-14"]);
  });

  test("today is the Copenhagen day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T22:30:00.000Z"));
    expect(days([today()])).toEqual(["2026-10-14"]);
    expect(days([nextChargeDate(anchor("2026-01-14"), "month")])).toEqual(["2026-10-14"]);
  });
});

describe("totals", () => {
  test("weekly and yearly prices are normalised to a month and a year", () => {
    expect(monthlyEquivalent(12, "month")).toBe(12);
    expect(monthlyEquivalent(120, "year")).toBe(10);
    expect(monthlyEquivalent(12, "week")).toBeCloseTo(52);
    expect(yearlyEquivalent(10, "month")).toBe(120);
    expect(yearlyEquivalent(120, "year")).toBe(120);
  });

  test("the monthly total adds every subscription's monthly equivalent", () => {
    expect(
      totalPerMonth([
        subscription({ price: 100, interval: "month" }),
        subscription({ price: 1200, interval: "year" }),
        subscription({ price: 12, interval: "week" }),
      ]),
    ).toBeCloseTo(252);
  });
});

describe("schedule", () => {
  test("soonest first, ties by name, grouped into next 7 days, later this month and later", () => {
    const from = day("2026-10-03");
    const schedule = scheduleSubscriptions(
      [
        subscription({ id: "c", name: "Later", billed_at: anchor("2026-11-20") }),
        subscription({ id: "b", name: "This month", billed_at: anchor("2026-10-25") }),
        subscription({ id: "a2", name: "Soon B", billed_at: anchor("2026-10-05") }),
        subscription({ id: "a1", name: "Soon A", billed_at: anchor("2026-09-05") }),
      ],
      from,
    );
    expect(schedule.map((s) => s.subscription.id)).toEqual(["a1", "a2", "b", "c"]);
    expect(
      bucketByTime(schedule, from).map((b) => [b.key, b.title, b.items.map((i) => i.subscription.id)]),
    ).toEqual([
      ["week", "Next 7 days", ["a1", "a2"]],
      ["month", "Later this month", ["b"]],
      ["later", "Later", ["c"]],
    ]);
  });

  test("empty buckets are dropped", () => {
    const from = day("2026-10-03");
    const schedule = scheduleSubscriptions([subscription({ billed_at: anchor("2026-12-01") })], from);
    expect(bucketByTime(schedule, from).map((b) => b.key)).toEqual(["later"]);
  });
});
