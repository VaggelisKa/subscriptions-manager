"use client";

import { useState, type CSSProperties } from "react";
import { format, subDays } from "date-fns";
import { Amount } from "@/components/ui/amount";
import { Group, SectionHeader } from "@/components/ui/grouped";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { ChargeTimeline } from "@/components/detail/charge-timeline";
import { DeleteConfirm } from "@/components/detail/delete-confirm";
import {
  countChargesBetween,
  monthlyEquivalent,
  toLocalDay,
  today,
  upcomingChargeDates,
  yearlyEquivalent,
} from "@/lib/billing";
import { formatWholeKr, intervalLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const HEX = /^#[0-9a-f]{6}$/i;

type Props = {
  subscription: SubscriptionWithCategory;
  onDeleted: () => void;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-[15.5px] font-medium leading-[21px]">{label}</dt>
      <dd className="text-[15.5px] font-semibold leading-[21px] tabular-nums text-muted-foreground">
        {value}
      </dd>
    </div>
  );
}

/** The detail sheet: price, upcoming charges and history for one subscription. */
export function SubscriptionDetail({ subscription: sub, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false);

  const price = sub.price ?? 0;
  const category = sub.categories;
  const color = category?.color_hex;

  const equivalent =
    sub.interval === "year"
      ? `${formatWholeKr(monthlyEquivalent(price, sub.interval))} a month`
      : `${formatWholeKr(yearlyEquivalent(price, sub.interval))} a year`;

  const upcoming = upcomingChargeDates(sub.billed_at, sub.interval, 3);

  // Charges on the schedule since tracking started. Price or date edits
  // aren't recorded, hence the "≈".
  const pastCharges = sub.created_at
    ? countChargesBetween(
        sub.billed_at,
        sub.interval,
        toLocalDay(sub.created_at),
        // Up to yesterday: a charge due today still counts as "to pay".
        subDays(today(), 1),
      )
    : 0;

  return (
    <div className="pb-2">
      <div className="flex items-center gap-3.5 px-1 pt-2">
        <SubscriptionTile name={sub.name} color={color} size={60} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <p className="line-clamp-2 text-[26px] font-black leading-[31px] tracking-[-0.5px]">
            {sub.name}
          </p>
          {category?.name ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-footnote font-bold leading-4",
                color && HEX.test(color) ? "tile-tint" : "bg-fill",
              )}
              style={color && HEX.test(color) ? ({ "--tile": color } as CSSProperties) : undefined}
            >
              <span
                aria-hidden
                className="size-2 rounded-full bg-faint"
                style={color && HEX.test(color) ? { backgroundColor: color } : undefined}
              />
              {category.name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-1 pb-1 pt-[22px]">
        <Amount value={price} size={44} />
        <p className="mt-1.5 text-[15px] font-semibold leading-5 text-muted-foreground">
          {`${intervalLabel[sub.interval]} · ${equivalent}`}
        </p>
      </div>

      <SectionHeader title="Upcoming charges" as="h3" />
      <ChargeTimeline dates={upcoming} price={price} />

      <dl className="mt-3.5">
        <Group separatorInset={16}>
          {sub.created_at ? (
            <InfoRow label="Tracking since" value={format(toLocalDay(sub.created_at), "MMM yyyy")} />
          ) : null}
          {pastCharges > 0 ? (
            <InfoRow label="Paid so far" value={`≈ ${formatWholeKr(pastCharges * price)}`} />
          ) : null}
        </Group>
      </dl>

      {confirming ? (
        <DeleteConfirm
          id={sub.id}
          name={sub.name}
          onCancel={() => setConfirming(false)}
          onDeleted={onDeleted}
          className="mt-4"
        />
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2 flex min-h-[60px] w-full items-center justify-center py-5 text-headline text-destructive transition-opacity hover:opacity-70"
        >
          Delete subscription
        </button>
      )}
    </div>
  );
}
