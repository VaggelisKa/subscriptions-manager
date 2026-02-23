"use client";

import * as React from "react";
import { format, getMonth, getYear } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatepickerProps = {
  defaultValue?: Date | (() => Date);
  disablePastDates?: boolean;
};

export function DatePicker({
  defaultValue,
  disablePastDates,
}: DatepickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(defaultValue);

  return (
    <>
      {/* This will sync with the calendar chosen date and expose a value to the overlying form action */}
      <input
        id="billed_at"
        name="billed_at"
        defaultValue={date?.toString()}
        value={date?.toString()}
        type="text"
        hidden
        aria-hidden
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full min-w-[280px] justify-start text-left text-base font-normal md:text-[100%]",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[60] w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disablePastDates && { before: new Date() }}
            fromMonth={new Date(getYear(new Date()), getMonth(new Date()))}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
