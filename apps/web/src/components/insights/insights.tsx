"use client";

import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { Amount } from "@/components/ui/amount";
import { Segmented } from "@/components/ui/segmented";
import { SubscriptionRow } from "@/components/subscription-row";
import { nextChargeDate, totalPerMonth } from "@subscriptions-manager/shared/billing";
import { formatWholeKr, formatWholeNumber, intervalSuffix } from "@subscriptions-manager/shared/format";
import { cn } from "@/lib/utils";
import {
  periodFactor,
  spendByCategory,
  type CategorySpend,
  type Period,
} from "./spend-by-category";

const HEX = /^#[0-9a-f]{6}$/i;

const periods: { value: Period; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

/**
 * One segment per category, sized by share of spend. Shares don't depend on
 * the period, so the bar is static when the period changes.
 */
function CategoryBar({ categories }: { categories: CategorySpend[] }) {
  const visible = categories.filter((c) => c.share > 0);
  if (visible.length === 0) return null;

  return (
    <div aria-hidden className="flex h-3.5 gap-[3px]">
      {visible.map((c) => (
        <span
          key={c.key}
          className="min-w-1 rounded-[6px] bg-faint"
          style={{
            flex: c.share,
            ...(c.color && HEX.test(c.color) ? { backgroundColor: c.color } : {}),
          }}
        />
      ))}
    </div>
  );
}

type RowProps = {
  category: CategorySpend;
  period: Period;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
};

function CategoryRow({ category, period, open, onToggle, onSelect }: RowProps) {
  const amount = category.monthly * periodFactor[period];
  const hasColor = !!category.color && HEX.test(category.color);
  const panelId = `category-${category.key}`;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-[58px] w-full items-center gap-3 px-3.5 py-[11px] text-left transition-colors hover:bg-fill/60 focus-visible:ring-inset focus-visible:ring-offset-0 active:bg-fill"
      >
        <span
          aria-hidden
          className={cn("flex size-7 items-center justify-center rounded-sm", hasColor ? "tile-tint" : "bg-fill")}
          style={hasColor ? ({ "--tile": category.color } as CSSProperties) : undefined}
        >
          <span
            className="size-2.5 rounded-[3px] bg-faint"
            style={hasColor ? { backgroundColor: category.color! } : undefined}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-headline">{category.name}</span>
          <span className="text-footnote text-muted-foreground">
            {Math.round(category.share * 100)}% of spend
          </span>
        </span>
        <span className="text-[16px] font-extrabold tabular-nums">
          {formatWholeNumber(amount)} kr
          <span className="text-[12px] font-semibold text-muted-foreground">
            {intervalSuffix[period]}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={2.5}
          className={cn(
            "-ml-0.5 size-3.5 text-faint transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      <ul id={panelId} hidden={!open}>
        {category.subscriptions.map((s) => (
          <li key={s.id}>
            <div aria-hidden className="ml-[66px] h-px bg-separator" />
            <SubscriptionRow
              subscription={s}
              nextCharge={nextChargeDate(s.billed_at, s.interval)}
              onSelect={() => onSelect(s.id)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/** The chosen period and expanded categories, kept by the parent so they survive the sheet closing. */
export type InsightsView = { period: Period; expanded: string[] };

export const initialInsightsView: InsightsView = { period: "month", expanded: [] };

type Props = {
  subscriptions: SubscriptionWithCategory[];
  onSelect: (id: string) => void;
  view: InsightsView;
  onViewChange: (view: InsightsView) => void;
};

/** Spend by category: the period total, a proportion bar and expandable categories. */
export function Insights({ subscriptions, onSelect, view, onViewChange }: Props) {
  const { period, expanded } = view;
  const setPeriod = (next: Period) => onViewChange({ ...view, period: next });

  if (subscriptions.length === 0) {
    return (
      <p className="mt-12 text-center text-[14px] font-semibold text-muted-foreground">
        Add a subscription to see where your money goes.
      </p>
    );
  }

  const monthly = totalPerMonth(subscriptions);
  const categories = spendByCategory(subscriptions);

  const toggle = (key: string) =>
    onViewChange({
      ...view,
      expanded: expanded.includes(key) ? expanded.filter((k) => k !== key) : [...expanded, key],
    });

  return (
    <div className="pb-6">
      <Segmented
        label="Period"
        options={periods}
        value={period}
        onChange={setPeriod}
        className="mb-[18px] mt-1.5"
      />

      <div className="px-1">
        <p className="text-[14px] font-bold leading-[19px] text-muted-foreground">
          Spend per {period}
        </p>
        <Amount value={monthly * periodFactor[period]} size={42} whole />
        {period !== "year" && (
          <p className="mt-1 text-[14px] font-semibold leading-[19px] text-muted-foreground">
            {formatWholeKr(monthly * 12)} over the next 12 months
          </p>
        )}
      </div>

      <div className="mx-1 my-[18px]">
        <CategoryBar categories={categories} />
      </div>

      <ul className="overflow-hidden rounded-xl bg-surface">
        {categories.map((category, i) => (
          <li key={category.key}>
            {i > 0 && <div aria-hidden className="ml-[54px] h-px bg-separator" />}
            <CategoryRow
              category={category}
              period={period}
              open={expanded.includes(category.key)}
              onToggle={() => toggle(category.key)}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
