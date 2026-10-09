import { addDays, differenceInCalendarDays, format } from "date-fns";
import { chargesBetween, today } from "@subscriptions-manager/shared/billing";
import { formatDayDate } from "@subscriptions-manager/shared/format";
import { cn } from "@/lib/utils";

const DAYS = 36;
const MAX_DOTS = 3;
const HEX = /^#[0-9a-f]{6}$/i;

type Day = {
  date: Date;
  /** Category colours of the charges that day (null when uncategorised). */
  charges: (string | null)[];
};

/** Yesterday plus the next ~5 weeks, each day with the charges that land on it. */
function buildDays(subscriptions: SubscriptionWithCategory[]): Day[] {
  const start = addDays(today(), -1);
  const end = addDays(start, DAYS - 1);
  const days: Day[] = Array.from({ length: DAYS }, (_, i) => ({
    date: addDays(start, i),
    charges: [],
  }));
  for (const s of subscriptions) {
    for (const date of chargesBetween(s.billed_at, s.interval, start, end)) {
      days[differenceInCalendarDays(date, start)]?.charges.push(
        s.categories?.color_hex ?? null,
      );
    }
  }
  return days;
}

/** Horizontal strip of days with a dot per charge, in category colours. */
export function DayStrip({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const days = buildDays(subscriptions);

  return (
    <div className="-mx-4 mt-[18px] sm:-mx-1">
      <ol
        aria-label="Upcoming charges by day"
        tabIndex={0}
        className="no-scrollbar flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 sm:px-1 sm:[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-32px),transparent)]"
      >
        {days.map(({ date, charges }, i) => {
          const isToday = i === 1;
          const isPast = i === 0;
          // The 1st shows the month instead of the weekday to mark the boundary.
          const isMonthStart = date.getDate() === 1 && !isToday;
          const label = `${isToday ? "Today, " : ""}${formatDayDate(date)}, ${
            charges.length === 0
              ? "no charges"
              : `${charges.length} ${charges.length === 1 ? "charge" : "charges"}`
          }`;

          return (
            <li
              key={date.toISOString()}
              aria-label={label}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex w-10 shrink-0 snap-start flex-col items-center gap-[3px] rounded-[14px] pb-2 pt-[7px]",
                isToday ? "bg-primary" : isPast ? "bg-transparent" : "bg-surface",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "text-[10.5px] font-bold leading-[13px]",
                  isToday
                    ? "text-white"
                    : isPast
                      ? "text-faint"
                      : isMonthStart
                        ? "text-primary-text"
                        : "text-muted-foreground",
                )}
              >
                {format(date, isMonthStart ? "MMM" : "EEEEE")}
              </span>
              <span
                aria-hidden
                className={cn(
                  "text-[15px] font-extrabold leading-[19px] tabular-nums",
                  isToday ? "text-white" : isPast ? "text-faint" : "text-foreground",
                )}
              >
                {format(date, "d")}
              </span>
              <span aria-hidden className="flex h-1.5 gap-0.5">
                {charges.slice(0, MAX_DOTS).map((color, j) => (
                  <span
                    key={j}
                    className={cn(
                      "size-1.5 rounded-full",
                      isToday ? "bg-white" : !color || !HEX.test(color) ? "bg-faint" : "",
                    )}
                    style={!isToday && color && HEX.test(color) ? { backgroundColor: color } : undefined}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
