import { expect, test } from "vitest";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { bucketByTime, monthlyEquivalent, nextChargeDate, scheduleSubscriptions } from "./billing.ts";

function subscription(over: Partial<SubscriptionWithCategory>): SubscriptionWithCategory {
  return {
    id: "s1",
    name: "Netflix",
    price: 129,
    interval: "month",
    billed_at: "2026-01-31T12:00:00.000Z",
    created_at: "2025-12-01T12:00:00.000Z",
    description: null,
    user_id: "u1",
    categories: null,
    ...over,
  };
}

test("a weekly or yearly price is normalised to a month", () => {
  expect(monthlyEquivalent(12, "month")).toBe(12);
  expect(monthlyEquivalent(120, "year")).toBe(10);
  expect(monthlyEquivalent(12, "week")).toBeCloseTo(52);
});

test("a past billing date rolls forward from its anchor, so month-end dates do not drift", () => {
  const from = new Date(2026, 2, 15); // 15 March 2026
  const next = nextChargeDate("2026-01-31T12:00:00.000Z", "month", from);
  expect(next.getMonth()).toBe(2);
  expect(next.getDate()).toBe(31);
});

test("the schedule is grouped into the next week, later this month and later", () => {
  const from = new Date(2026, 9, 3); // 3 October 2026
  const schedule = scheduleSubscriptions(
    [
      subscription({ id: "a", name: "Soon", billed_at: "2026-10-05T12:00:00.000Z" }),
      subscription({ id: "b", name: "This month", billed_at: "2026-10-25T12:00:00.000Z" }),
      subscription({ id: "c", name: "Later", billed_at: "2026-11-20T12:00:00.000Z" }),
    ],
    from,
  );
  const buckets = bucketByTime(schedule, from);
  expect(buckets.map((b) => b.key)).toEqual(["week", "month", "later"]);
  expect(buckets[0]!.items[0]!.subscription.name).toBe("Soon");
});
