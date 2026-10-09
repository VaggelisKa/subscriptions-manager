import { differenceInCalendarDays } from "date-fns";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { monthlyEquivalent, today } from "@subscriptions-manager/shared/billing";
import {
  formatDayDate,
  formatDueLabel,
  formatNumber,
  formatWholeKr,
  intervalLabel,
  intervalSuffix,
  isDueSoon,
} from "@subscriptions-manager/shared/format";
import { cn } from "@/lib/utils";

const HEX = /^#[0-9a-f]{6}$/i;

type Props = {
  subscription: SubscriptionWithCategory;
  nextCharge: Date;
  selected: boolean;
  /** Just added: the tint flashes once. */
  flash: boolean;
  onSelect: () => void;
};

/** A subscription in the desktop ledger: name, category, next charge and price as columns. */
export function LedgerRow({ subscription, nextCharge, selected, flash, onSelect }: Props) {
  const price = subscription.price ?? 0;
  const category = subscription.categories;
  const color = category?.color_hex;
  const due = formatDueLabel(nextCharge);
  const withinWeek = differenceInCalendarDays(nextCharge, today()) <= 7;
  const soon = isDueSoon(nextCharge);

  return (
    <button
      type="button"
      data-ledger-row={subscription.id}
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-label={`${subscription.name}, ${category?.name ?? "no category"}, ${due}, ${formatNumber(price)} kr ${intervalLabel[subscription.interval]}`}
      className={cn(
        "ledger-cols min-h-[54px] w-full px-4 py-2 text-left transition-colors focus-visible:ring-inset focus-visible:ring-offset-0",
        selected ? "bg-primary-soft" : "hover:bg-fill/60 active:bg-fill",
        flash && "animate-row-flash motion-reduce:animate-none",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <SubscriptionTile name={subscription.name} color={color} size={34} />
        <span className="truncate text-headline text-foreground">{subscription.name}</span>
      </span>

      <span className="ledger-category min-w-0">
        {category?.name ? (
          <span className="flex items-center gap-[7px] text-[14px] font-semibold text-muted-foreground">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-faint"
              style={color && HEX.test(color) ? { backgroundColor: color } : undefined}
            />
            <span className="truncate">{category.name}</span>
          </span>
        ) : (
          <span className="text-[14px] font-semibold text-faint">None</span>
        )}
      </span>

      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-[14px] leading-[19px]",
            soon ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground",
          )}
        >
          {due}
        </span>
        {withinWeek ? (
          <span className="truncate text-[12px] font-semibold leading-[15px] text-muted-foreground">
            {formatDayDate(nextCharge)}
          </span>
        ) : null}
      </span>

      <span className="flex flex-col items-end text-right">
        <span className="whitespace-nowrap text-[16px] font-extrabold leading-[21px] tabular-nums text-foreground">
          {formatNumber(price)} kr
          <span className="text-[12px] font-semibold text-muted-foreground">
            {intervalSuffix[subscription.interval]}
          </span>
        </span>
        {subscription.interval !== "month" ? (
          <span className="whitespace-nowrap text-[12px] font-semibold leading-[15px] tabular-nums text-muted-foreground">
            ≈ {formatWholeKr(monthlyEquivalent(price, subscription.interval))} a month
          </span>
        ) : null}
      </span>
    </button>
  );
}
