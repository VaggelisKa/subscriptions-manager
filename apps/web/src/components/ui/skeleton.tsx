import { cn } from "@/lib/utils";

/** Placeholder bar that breathes while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-sm bg-fill motion-safe:animate-skeleton", className)}
    />
  );
}
