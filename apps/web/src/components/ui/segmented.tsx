"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  /** Submits the value with the surrounding form. */
  name?: string;
  className?: string;
};

/** iOS-style segmented control, built on native radio inputs. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  name,
  className,
}: Props<T>) {
  const id = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid auto-cols-fr grid-flow-col rounded-[9px] bg-fill p-0.5", className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative flex h-8 cursor-pointer select-none items-center justify-center rounded-[7px] text-[14px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
              checked
                ? "bg-surface text-foreground shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] dark:bg-[hsl(24_6%_28%)]"
                : "text-foreground/80 hover:text-foreground",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name ?? id}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
