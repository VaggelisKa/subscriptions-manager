import { Component, DestroyRef, computed, inject, input, signal } from "@angular/core";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { Text, View } from "@ng-native/components";
import { endOfMonth, format } from "date-fns";
import { chargesBetween, today, totalPerMonth } from "../lib/billing.ts";
import { formatWholeKr } from "../lib/format.ts";
import { Amount } from "../ui/amount.ts";

/** Sum of every charge from today to the end of the month (weekly ones count each time). */
function stillToPayThisMonth(subscriptions: SubscriptionWithCategory[]): number {
  const start = today();
  const end = endOfMonth(start);
  return subscriptions.reduce(
    (acc, s) => acc + chargesBetween(s.billed_at, s.interval, start, end).length * (s.price ?? 0),
    0,
  );
}

/**
 * The headline: what everything costs per month, and what is left to pay this month. The amount
 * counts up once when the screen first appears.
 */
@Component({
  selector: "app-monthly-summary",
  imports: [Amount, Text, View],
  template: `
    <view class="summary" [accessibilityLabel]="label()">
      <app-amount [value]="counting() ?? total()" [whole]="true" trailing="/ month" />
      <text class="line"
        ><text class="strong">{{ remaining() }}</text> still to pay in {{ month() }}</text
      >
    </view>
  `,
  styles: `
    .summary {
      padding: 4px 4px 0;
      gap: 8px;
    }
    .line {
      font-weight: 600;
      font-size: 14px;
      line-height: 19px;
      color: var(--muted);
    }
    .strong {
      font-weight: 800;
      color: var(--foreground);
    }
  `,
})
export class MonthlySummary {
  readonly subscriptions = input.required<SubscriptionWithCategory[]>();

  protected readonly total = computed(() => totalPerMonth(this.subscriptions()));
  protected readonly remaining = computed(() =>
    formatWholeKr(stillToPayThisMonth(this.subscriptions())),
  );
  protected readonly month = computed(() => format(today(), "MMMM"));
  protected readonly label = computed(() => `${formatWholeKr(this.total())} per month`);
  /** `null` once the count-up is done: later changes show the new total directly. */
  protected readonly counting = signal<number | null>(0);

  constructor() {
    let frame = 0;
    const start = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / 900);
      if (t === 1) {
        this.counting.set(null);
        return;
      }
      // Ease-out cubic, as apps/native's `withTiming`.
      this.counting.set(Math.round(this.total() * (1 - (1 - t) ** 3)));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(frame));
  }
}
