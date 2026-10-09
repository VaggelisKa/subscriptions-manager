import { differenceInCalendarDays } from "date-fns";
import { today } from "@subscriptions-manager/shared/billing";
import { formatDayDate, formatDueLabel, formatKr, isDueSoon } from "@subscriptions-manager/shared/format";
import { cn } from "@/lib/utils";

type Props = {
  dates: Date[];
  price: number;
  /** Colour of the "in N days" label: orange on mobile, bold foreground on desktop. */
  emphasis?: "primary" | "foreground";
};

/** Next charges as a vertical timeline: dot + connecting line per row. */
export function ChargeTimeline({ dates, price, emphasis = "primary" }: Props) {
  return (
    <ol className="rounded-xl bg-surface py-1">
      {dates.map((date, i) => {
        const first = i === 0;
        const soon = first && isDueSoon(date);
        // "in 3 days" only while it's close; a far-off date would just repeat the left column.
        const showDue = first && differenceInCalendarDays(date, today()) <= 7;
        return (
          <li key={date.getTime()} className="relative flex items-center gap-3 px-4 py-2.5">
            {i < dates.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[20px] top-1/2 h-full w-0.5 bg-separator"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative size-2.5 shrink-0 rounded-full border-[2.5px] border-primary",
                first ? "bg-primary" : "bg-surface",
              )}
            />
            <span className="flex-1 truncate text-[15px] font-medium leading-5">
              {formatDayDate(date)}
            </span>
            <span
              className={cn(
                "text-[15px] font-bold leading-5 tabular-nums",
                soon
                  ? emphasis === "primary"
                    ? "text-primary-text"
                    : "font-extrabold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {showDue ? formatDueLabel(date) : formatKr(price)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
