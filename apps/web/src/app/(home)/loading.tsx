import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-[11px]">
      <Skeleton className="size-10 rounded-[12px]" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}

/** Shown while the server loads subscriptions: the home screen's shape, breathing. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading subscriptions"
      className="mx-auto w-full max-w-[640px] px-4 pb-12 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] sm:px-6 sm:pt-[4.25rem]"
    >
      <h1 className="mb-3 px-1 text-large-title">Subscriptions</h1>
      <div className="flex flex-col gap-3 px-1 pt-1">
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="mt-[18px] flex gap-1.5 overflow-hidden">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] w-10 shrink-0 rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="mb-2 ml-1.5 mt-6 h-5 w-28" />
      <div className="overflow-hidden rounded-xl bg-surface">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}
