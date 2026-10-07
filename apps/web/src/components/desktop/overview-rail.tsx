import { MonthlySummary } from "@/components/home/monthly-summary";
import { MonthCalendar } from "@/components/desktop/month-calendar";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof MonthCalendar> & { className?: string };

/** The left rail: how much (the monthly total) and when (this month's charges). */
export function OverviewRail({ className, ...calendar }: Props) {
  return (
    <aside aria-label="Overview" className={cn("min-h-0", className)}>
      <MonthlySummary
        subscriptions={calendar.subscriptions}
        amountClassName="xl:!text-[52px] xl:!leading-[56px] xl:!tracking-[-1.8px]"
      />
      <MonthCalendar {...calendar} />
    </aside>
  );
}
