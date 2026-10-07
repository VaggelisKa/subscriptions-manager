"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Month calendar in the app's style: round days, orange selection. */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-headline",
        nav: "flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-primary-text disabled:opacity-30",
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-10 text-caption text-faint",
        row: "mt-1 flex w-full",
        cell: "relative p-0 text-center",
        day: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-10 rounded-full text-[16px] font-semibold tabular-nums aria-selected:opacity-100",
        ),
        day_selected:
          "!bg-primary font-extrabold !text-primary-foreground hover:!bg-primary",
        day_today: "text-primary-text font-extrabold",
        day_outside: "text-faint",
        day_disabled: "text-faint opacity-50",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="size-5" strokeWidth={2.5} />,
        IconRight: () => <ChevronRight className="size-5" strokeWidth={2.5} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
