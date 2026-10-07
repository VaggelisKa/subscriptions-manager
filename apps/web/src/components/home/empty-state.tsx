import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_ADD = ["Netflix", "Spotify", "Viaplay", "TV 2 Play"];

/** Placeholder row hinting at what a tracked subscription will look like. */
function GhostRow({ className, plus = false }: { className?: string; plus?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-[20px] bg-surface px-3.5 py-[11px]", className)}>
      <span
        className={cn(
          "flex size-[38px] items-center justify-center rounded-[11.4px]",
          plus ? "bg-primary-soft text-primary-text" : "bg-fill",
        )}
      >
        {plus ? <Plus className="size-5" strokeWidth={3} /> : null}
      </span>
      <span className="flex flex-1 flex-col gap-1.5">
        <span className={cn("h-2.5 rounded-[5px] bg-fill", plus ? "w-3/5" : "w-1/2")} />
        <span className="h-2 w-[30%] rounded bg-fill" />
      </span>
      <span className="h-2.5 w-11 rounded-[5px] bg-fill" />
    </div>
  );
}

type Props = {
  onAdd: (name?: string) => void;
};

export function EmptyState({ onAdd }: Props) {
  return (
    <section aria-labelledby="empty-title" className="pt-2">
      <div aria-hidden className="mb-[22px] flex flex-col gap-2">
        <GhostRow plus />
        <GhostRow className="opacity-60" />
        <GhostRow className="opacity-30" />
      </div>

      <div className="flex flex-col gap-2 px-1">
        <h2 id="empty-title" className="text-[24px] font-black leading-7 tracking-[-0.5px]">
          Track your first subscription
        </h2>
        <p className="max-w-[46ch] text-[15px] leading-[21px] text-muted-foreground">
          Add what you pay for and see what&apos;s due next, and what it adds up to each month.
        </p>
      </div>

      <Button className="mb-[18px] mt-[22px]" onClick={() => onAdd()}>
        Add subscription
      </Button>

      <h3 className="px-1 pb-2 text-footnote font-bold text-muted-foreground">Quick add</h3>
      <ul className="flex flex-wrap gap-2">
        {QUICK_ADD.map((name) => (
          <li key={name}>
            <button
              type="button"
              aria-label={`Add ${name}`}
              onClick={() => onAdd(name)}
              className="rounded-full bg-fill px-3.5 py-2 text-[14px] font-bold transition-opacity hover:opacity-70 active:opacity-60"
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
