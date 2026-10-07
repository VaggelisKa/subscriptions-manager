"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { chargesBetween, today } from "@/lib/billing";
import { formatDayDate, formatKr } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TOOLTIP_DELAY = 300;

type Day = {
  date: Date;
  /** Charges that day, by name. */
  charges: SubscriptionWithCategory[];
};

/** The current month's grid (Monday first, padded to whole weeks) with the charges on each day. */
function buildDays(subscriptions: SubscriptionWithCategory[], now: Date): Day[] {
  const start = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(now), { weekStartsOn: 1 });
  const days: Day[] = Array.from({ length: differenceInCalendarDays(end, start) + 1 }, (_, i) => ({
    date: addDays(start, i),
    charges: [],
  }));
  for (const s of subscriptions) {
    for (const date of chargesBetween(s.billed_at, s.interval, start, end)) {
      days[differenceInCalendarDays(date, start)]?.charges.push(s);
    }
  }
  for (const day of days) day.charges.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  return days;
}

const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

function chargesLabel(day: Day) {
  const count = day.charges.length;
  const list = day.charges.map((s) => `${s.name} ${formatKr(s.price ?? 0)}`).join(", ");
  return `${formatDayDate(day.date)}, ${count} ${count === 1 ? "charge" : "charges"}: ${list}`;
}

type Props = {
  subscriptions: SubscriptionWithCategory[];
  /** The subscription open in the inspector; its charge days get a ring. */
  selectedId: string | undefined;
  /** The day the ledger is filtered to. */
  filterDay: Date | null;
  onSelectSubscription: (id: string) => void;
  onFilterDay: (day: Date | null) => void;
};

/**
 * This month's charges as a calendar, each charge day showing the first
 * subscription's tile. A day with one charge opens it; a day with several
 * filters the ledger to them. Arrow keys move between charge days.
 */
export function MonthCalendar({ subscriptions, selectedId, filterDay, onSelectSubscription, onFilterDay }: Props) {
  const now = today();
  const days = buildDays(subscriptions, now);
  const chargeDays = days.filter((d) => d.charges.length > 0);

  // Roving tabindex: one charge day is in the tab order.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const tabStop =
    chargeDays.find((d) => dayKey(d.date) === activeKey) ??
    chargeDays.find((d) => d.date >= now) ??
    chargeDays[0];

  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function showTooltip(key: string) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTooltipKey(key), TOOLTIP_DELAY);
  }

  function hideTooltip() {
    clearTimeout(timer.current);
    setTooltipKey(null);
  }

  function activate(day: Day) {
    if (day.charges.length === 1) {
      // A day filter could be hiding the subscription that's about to open.
      if (filterDay) onFilterDay(null);
      return onSelectSubscription(day.charges[0].id);
    }
    onFilterDay(filterDay && isSameDay(filterDay, day.date) ? null : day.date);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : event.key === "Home"
            ? -index
            : event.key === "End"
              ? chargeDays.length - 1 - index
              : 0;
    if (event.key === "Escape") {
      // A showing tooltip takes the first Esc, before the inspector or day filter.
      if (tooltipKey) event.preventDefault();
      return hideTooltip();
    }
    if (!step) return;
    // Handled here, so the ledger's ↑/↓ shortcuts don't also fire.
    event.preventDefault();
    const next = chargeDays[Math.min(chargeDays.length - 1, Math.max(0, index + step))];
    const key = dayKey(next.date);
    setActiveKey(key);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${key}"]`)?.focus();
  }

  return (
    <section aria-labelledby="calendar-title" className="mt-[22px] rounded-xl bg-surface px-3 pb-3 pt-3.5">
      <h2 id="calendar-title" className="px-1 pb-2.5 text-[16px] font-extrabold leading-[21px]">
        {format(now, "MMMM yyyy")}
      </h2>
      <div ref={gridRef} className="grid grid-cols-7 gap-[3px]">
        {WEEKDAYS.map((d, i) => (
          <span key={i} aria-hidden className="pb-1 text-center text-[11px] font-bold leading-[13px] text-muted-foreground">
            {d}
          </span>
        ))}
        {days.map((day, i) => {
          const key = dayKey(day.date);
          const outside = !isSameMonth(day.date, now);
          const isToday = isSameDay(day.date, now);
          const isPast = day.date < now;
          const count = day.charges.length;
          const numeral = (
            <span
              className={cn(
                "text-[13px] font-extrabold leading-4 tabular-nums",
                isToday ? "font-black text-primary-text" : isPast && !outside ? "text-muted-foreground" : "",
              )}
            >
              {format(day.date, "d")}
            </span>
          );
          const cell = cn(
            "relative flex h-[46px] flex-col items-center gap-[3px] rounded-[11px] pt-[5px]",
            outside && "text-faint opacity-[0.55]",
          );

          if (count === 0) {
            return (
              <div key={key} aria-hidden={outside || undefined} className={cell}>
                {numeral}
              </div>
            );
          }

          const index = chargeDays.indexOf(day);
          const selected = !!selectedId && day.charges.some((s) => s.id === selectedId);
          const filtered = !!filterDay && isSameDay(filterDay, day.date);
          const column = i % 7;

          return (
            <button
              key={key}
              type="button"
              data-day={key}
              tabIndex={day === tabStop ? 0 : -1}
              aria-label={chargesLabel(day)}
              aria-pressed={count > 1 ? filtered : undefined}
              aria-current={isToday ? "date" : undefined}
              onClick={() => {
                setActiveKey(key);
                activate(day);
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              onMouseEnter={() => showTooltip(key)}
              onMouseLeave={hideTooltip}
              onFocus={() => {
                setActiveKey(key);
                showTooltip(key);
              }}
              onBlur={hideTooltip}
              className={cn(
                cell,
                "bg-fill transition-colors hover:bg-muted-foreground/20 focus-visible:ring-inset focus-visible:ring-offset-0",
                filtered && "bg-muted-foreground/25",
                selected && "ring-2 ring-inset ring-primary",
              )}
            >
              {numeral}
              <span className="flex items-center gap-0.5">
                <SubscriptionTile
                  name={day.charges[0].name}
                  color={day.charges[0].categories?.color_hex}
                  size={18}
                  className={cn(isPast && "opacity-[0.45] grayscale-[0.6]")}
                />
                {count > 1 ? (
                  <span className="text-[10px] font-extrabold leading-3 text-muted-foreground">+{count - 1}</span>
                ) : null}
              </span>

              {tooltipKey === key ? (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute bottom-[calc(100%+8px)] z-20 whitespace-nowrap rounded-md bg-foreground px-3 py-[9px] text-left text-[13px] font-semibold leading-[18px] text-background shadow-sheet",
                    column === 0 ? "left-0" : column === 6 ? "right-0" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <span className="block font-extrabold">{formatDayDate(day.date)}</span>
                  {day.charges.map((s) => (
                    <span key={s.id} className="block">
                      {`${s.name} · ${formatKr(s.price ?? 0)}`}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
