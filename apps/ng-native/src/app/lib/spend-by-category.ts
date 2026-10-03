import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { monthlyEquivalent } from "./billing.ts";

export type Period = "week" | "month" | "year";

/** Multiplier from a monthly amount to the chosen period. */
export const periodFactor: Record<Period, number> = {
  week: 12 / 52,
  month: 1,
  year: 12,
};

export type CategorySpend = {
  /** Category id, or "other" for subscriptions without a category. */
  key: string;
  name: string;
  color: string | null;
  /** Monthly-normalised spend for the category. */
  monthly: number;
  /** Fraction of total spend, 0–1. */
  share: number;
  /** Most expensive first (by monthly equivalent). */
  subscriptions: SubscriptionWithCategory[];
};

/** Groups subscriptions by category, sorted by spend (highest first). */
export function spendByCategory(
  subscriptions: SubscriptionWithCategory[],
): CategorySpend[] {
  const groups = new Map<string, CategorySpend>();

  for (const s of subscriptions) {
    const key = s.categories?.id ?? "other";
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: s.categories?.name ?? "Other",
        color: s.categories?.color_hex ?? null,
        monthly: 0,
        share: 0,
        subscriptions: [],
      };
      groups.set(key, group);
    }
    group.monthly += monthlyEquivalent(s.price ?? 0, s.interval);
    group.subscriptions.push(s);
  }

  const list = [...groups.values()];
  const total = list.reduce((acc, g) => acc + g.monthly, 0);

  for (const g of list) {
    g.share = total > 0 ? g.monthly / total : 0;
    g.subscriptions.sort(
      (a, b) =>
        monthlyEquivalent(b.price ?? 0, b.interval) -
        monthlyEquivalent(a.price ?? 0, a.interval),
    );
  }

  return list.sort(
    (a, b) => b.monthly - a.monthly || a.name.localeCompare(b.name),
  );
}
