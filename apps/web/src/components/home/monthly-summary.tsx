"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { endOfMonth, format } from "date-fns";
import { Amount } from "@/components/ui/amount";
import { chargesBetween, today, totalPerMonth } from "@subscriptions-manager/shared/billing";
import { formatWholeKr } from "@subscriptions-manager/shared/format";
import { cn } from "@/lib/utils";

/** Sum of every charge from today to the end of the month (weekly ones count each time). */
function stillToPayThisMonth(subscriptions: SubscriptionWithCategory[]) {
  const start = today();
  const end = endOfMonth(start);
  return subscriptions.reduce(
    (acc, s) =>
      acc + chargesBetween(s.billed_at, s.interval, start, end).length * (s.price ?? 0),
    0,
  );
}

/**
 * Counts up once per page load; later changes show the new total directly.
 * The page renders a mobile and a desktop summary (one is `display: none`),
 * so only the visible one counts.
 */
let hasCounted = false;

function useCountUp(target: number, ref: RefObject<HTMLElement | null>) {
  const [value, setValue] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (hasCounted || !ref.current?.getClientRects().length) return;
    hasCounted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const duration = 900;
    const start = performance.now();
    let finished = false;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      finished = t >= 1;
      setValue(finished ? null : Math.round(target * eased));
      if (!finished) frame = requestAnimationFrame(tick);
    });
    setValue(0);
    return () => {
      cancelAnimationFrame(frame);
      setValue(null);
      // Interrupted (e.g. Strict Mode remount): let the next mount count.
      if (!finished) hasCounted = false;
    };
    // Only on mount: the count-up is the page's one entrance moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value ?? target;
}

/**
 * The headline: what everything costs per month (weekly and yearly prices
 * normalised), and what's left to pay this month.
 */
export function MonthlySummary({
  subscriptions,
  amountClassName,
}: {
  subscriptions: SubscriptionWithCategory[];
  /** Extra classes for the amount (the desktop rail sets it larger). */
  amountClassName?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const total = totalPerMonth(subscriptions);
  const remaining = stillToPayThisMonth(subscriptions);
  const month = format(today(), "MMMM");
  const shown = useCountUp(total, ref);

  return (
    <section ref={ref} aria-label="Monthly total" className="flex flex-col gap-2 px-1 pt-1">
      <div role="img" aria-label={`${formatWholeKr(total)} per month`}>
        <Amount
          value={shown}
          whole
          trailing="/ month"
          className={cn("[&>span]:align-baseline", amountClassName)}
        />
      </div>
      <p className="text-[14px] font-semibold leading-[19px] text-muted-foreground">
        <strong className="font-extrabold text-foreground">{formatWholeKr(remaining)}</strong>
        {` still to pay in ${month}`}
      </p>
    </section>
  );
}
