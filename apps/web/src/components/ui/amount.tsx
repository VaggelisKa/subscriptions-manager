import { cn } from "@/lib/utils";
import { formatNumber, formatWholeNumber } from "@subscriptions-manager/shared/format";

type Props = {
  value: number;
  /** Font size of the number in px; "kr" is set at about a third of it. */
  size?: number;
  /** Round to whole kroner (totals, normalised amounts). */
  whole?: boolean;
  /** Trailing muted text after "kr", e.g. "/ month". */
  trailing?: string;
  className?: string;
};

/** A display amount: heavy number, smaller muted currency after it. */
export function Amount({
  value,
  size = 46,
  whole = false,
  trailing,
  className,
}: Props) {
  return (
    <p
      className={cn("font-black tabular-nums text-foreground", className)}
      style={{
        fontSize: size,
        lineHeight: `${Math.round(size * 1.1)}px`,
        letterSpacing: -size * 0.035,
      }}
    >
      {whole ? formatWholeNumber(value) : formatNumber(value)}
      <span
        className="font-extrabold tracking-normal text-muted-foreground"
        style={{ fontSize: Math.max(13, Math.round(size * 0.36)) }}
      >
        {` kr${trailing ? ` ${trailing}` : ""}`}
      </span>
    </p>
  );
}
