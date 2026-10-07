import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { cn } from "@/lib/utils";
import {
  formatDueLabel,
  formatNumber,
  intervalLabel,
  intervalSuffix,
  isDueSoon,
} from "@/lib/format";

type Props = {
  subscription: SubscriptionWithCategory;
  nextCharge: Date;
  /** Replaces the due label under the name (e.g. category name). */
  meta?: string;
  onSelect?: () => void;
  className?: string;
};

/** A subscription in a `Group`: tile, name, when it's due, price per interval. */
export function SubscriptionRow({
  subscription,
  nextCharge,
  meta,
  onSelect,
  className,
}: Props) {
  const soon = !meta && isDueSoon(nextCharge);
  const metaText = meta ?? formatDueLabel(nextCharge);
  const price = subscription.price ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${subscription.name}, ${metaText}, ${formatNumber(price)} kr ${intervalLabel[subscription.interval]}`}
      className={cn(
        "flex min-h-[62px] w-full items-center gap-3 px-3.5 py-[11px] text-left transition-colors hover:bg-fill/60 focus-visible:ring-inset focus-visible:ring-offset-0 active:bg-fill",
        className,
      )}
    >
      <SubscriptionTile name={subscription.name} color={subscription.categories?.color_hex} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-headline text-foreground">{subscription.name}</span>
        <span
          className={cn(
            "truncate text-footnote",
            soon ? "font-bold text-primary-text" : "text-muted-foreground",
          )}
        >
          {metaText}
        </span>
      </span>
      <span className="shrink-0 text-[16px] font-extrabold tabular-nums text-foreground">
        {formatNumber(price)} kr
        <span className="text-[12px] font-semibold text-muted-foreground">
          {intervalSuffix[subscription.interval]}
        </span>
      </span>
    </button>
  );
}
