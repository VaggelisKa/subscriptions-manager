"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LedgerRow } from "@/components/desktop/ledger-row";
import {
  bucketByTime,
  chargesBetween,
  monthlyEquivalent,
  scheduleSubscriptions,
  type ScheduledSubscription,
} from "@subscriptions-manager/shared/billing";
import { formatDayDate, formatWholeKr } from "@subscriptions-manager/shared/format";
import { cn } from "@/lib/utils";

export type LedgerSort = "next" | "price" | "name";

const sorts: { value: LedgerSort; label: string }[] = [
  { value: "next", label: "Next charge" },
  { value: "price", label: "Price" },
  { value: "name", label: "Name" },
];

type LedgerGroup = {
  key: string;
  /** Bucket title; the flat Price and Name sorts have none. */
  title?: string;
  items: ScheduledSubscription[];
};

/**
 * The ledger's rows in display order: by next charge in the mobile time
 * buckets, or one flat group by price (per month, high → low) or name.
 * With a day filter, only subscriptions charged that day.
 */
export function ledgerGroups(
  subscriptions: SubscriptionWithCategory[],
  sort: LedgerSort,
  filterDay: Date | null,
): LedgerGroup[] {
  let schedule = scheduleSubscriptions(subscriptions);
  if (filterDay) {
    schedule = schedule.filter(
      ({ subscription: s }) => chargesBetween(s.billed_at, s.interval, filterDay, filterDay).length > 0,
    );
  }
  if (sort === "next") return bucketByTime(schedule);

  const sorted = [...schedule].sort((a, b) =>
    sort === "price"
      ? monthlyEquivalent(b.subscription.price ?? 0, b.subscription.interval) -
        monthlyEquivalent(a.subscription.price ?? 0, a.subscription.interval)
      : (a.subscription.name ?? "").localeCompare(b.subscription.name ?? ""),
  );
  return sorted.length > 0 ? [{ key: sort, items: sorted }] : [];
}

type Props = {
  groups: LedgerGroup[];
  /** Everything tracked, for the "7 tracked" count. */
  total: number;
  selectedId: string | undefined;
  flashId: string | null;
  onSelect: (id: string) => void;
  sort: LedgerSort;
  onSortChange: (sort: LedgerSort) => void;
  filterDay: Date | null;
  onClearFilter: () => void;
  className?: string;
};

/** The desktop list: a slim header (count, day filter, sort), column headers and grouped rows. */
export function Ledger({
  groups,
  total,
  selectedId,
  flashId,
  onSelect,
  sort,
  onSortChange,
  filterDay,
  onClearFilter,
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const filteredCount = groups.reduce((acc, g) => acc + g.items.length, 0);

  // Keep the selected row in view as ↑/↓ move through the list.
  useEffect(() => {
    if (!selectedId) return;
    ref.current
      ?.querySelector(`[data-ledger-row="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <section ref={ref} aria-label="Subscriptions" className={cn("ledger min-h-0", className)}>
      <div className="flex min-h-10 items-center gap-2 px-1 pt-1.5">
        <p className="flex-1 text-[14px] font-bold text-muted-foreground">{total} tracked</p>

        {filterDay ? (
          <button
            type="button"
            onClick={onClearFilter}
            aria-label={`Clear filter: ${formatDayDate(filterDay)}, ${filteredCount} charges`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-primary-soft pl-3 pr-2.5 text-[14px] font-bold text-primary-text transition-opacity hover:opacity-80"
          >
            {`${formatDayDate(filterDay)} · ${filteredCount} ${filteredCount === 1 ? "charge" : "charges"}`}
            <X aria-hidden className="size-3.5" strokeWidth={2.75} />
          </button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-fill pl-3 pr-2.5 text-[14px] font-bold transition-opacity hover:opacity-80">
            <span className="text-muted-foreground">Sort</span>
            {sorts.find((s) => s.value === sort)?.label}
            <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" strokeWidth={2.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as LedgerSort)}>
              {sorts.map((s) => (
                <DropdownMenuRadioItem key={s.value} value={s.value}>
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div aria-hidden className="ledger-cols px-4 pb-1.5 pt-3.5 text-[12.5px] font-bold text-muted-foreground">
        <span className="pl-[46px]">Name</span>
        <span className="ledger-category">Category</span>
        <span>Next charge</span>
        <span className="text-right">Price</span>
      </div>

      {groups.length === 0 ? (
        <p className="px-1.5 pt-6 text-[14px] font-semibold text-muted-foreground">No charges on this day.</p>
      ) : null}

      {groups.map((group) => {
        const list = (
          <ul className="overflow-hidden rounded-xl bg-surface">
            {group.items.map(({ subscription, nextCharge }, i) => {
              const selected = subscription.id === selectedId;
              const prevSelected = i > 0 && group.items[i - 1].subscription.id === selectedId;
              return (
                <li key={subscription.id}>
                  {i > 0 ? (
                    <div
                      aria-hidden
                      className={cn("ml-[60px] h-px bg-separator", (selected || prevSelected) && "invisible")}
                    />
                  ) : null}
                  <LedgerRow
                    subscription={subscription}
                    nextCharge={nextCharge}
                    selected={selected}
                    flash={subscription.id === flashId}
                    onSelect={() => onSelect(subscription.id)}
                  />
                </li>
              );
            })}
          </ul>
        );

        if (!group.title) return <div key={group.key} className="pt-2">{list}</div>;

        return (
          <section key={group.key} aria-labelledby={`ledger-${group.key}`}>
            <div className="flex items-baseline justify-between px-1.5 pb-2 pt-4">
              <h2 id={`ledger-${group.key}`} className="text-[17px] font-extrabold leading-[22px]">
                {group.title}
              </h2>
              <span className="text-footnote tabular-nums text-muted-foreground">
                {formatWholeKr(group.items.reduce((acc, i) => acc + (i.subscription.price ?? 0), 0))}
              </span>
            </div>
            {list}
          </section>
        );
      })}
    </section>
  );
}
