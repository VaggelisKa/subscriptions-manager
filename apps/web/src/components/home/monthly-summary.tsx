"use client";

import { useLayoutEffect, useState } from "react";
import { endOfMonth, format } from "date-fns";
import { Amount } from "@/components/ui/amount";
import { chargesBetween, today, totalPerMonth } from "@/lib/billing";
import { formatWholeKr } from "@/lib/format";

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

/** Counts up once per page load; later changes show the new total directly. */
let hasCounted = false;

function useCountUp(target: number) {
  const [value, setValue] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (hasCounted) return;
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
export function MonthlySummary({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const total = totalPerMonth(subscriptions);
  const remaining = stillToPayThisMonth(subscriptions);
  const month = format(today(), "MMMM");
  const shown = useCountUp(total);

  return (
    <section aria-label="Monthly total" className="flex flex-col gap-2 px-1 pt-1">
      <div role="img" aria-label={`${formatWholeKr(total)} per month`}>
        <Amount value={shown} whole trailing="/ month" className="[&>span]:align-baseline" />
      </div>
      <p className="text-[14px] font-semibold leading-[19px] text-muted-foreground">
        <strong className="font-extrabold text-foreground">{formatWholeKr(remaining)}</strong>
        {` still to pay in ${month}`}
      </p>
    </section>
  );
}
