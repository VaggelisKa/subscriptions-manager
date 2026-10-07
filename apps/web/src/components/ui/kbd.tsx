import { cn } from "@/lib/utils";

/** A key hint, e.g. "N" or "⌘↵", on a soft fill. */
export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-fill px-[5px] font-sans text-[11px] font-bold leading-4 text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
