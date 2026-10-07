"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Shown when the home screen's data fails to load, instead of an empty account. */
export default function HomeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto w-full max-w-[640px] px-4 pb-12 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] sm:px-6 sm:pt-[4.25rem]"
    >
      <h1 className="mb-3 px-1 text-large-title">Subscriptions</h1>
      <div className="flex flex-col gap-2 px-1 pt-2">
        <h2 className="text-[24px] font-black leading-7 tracking-[-0.5px]">Couldn&apos;t load your subscriptions</h2>
        <p className="max-w-[46ch] text-[15px] leading-[21px] text-muted-foreground">
          Something went wrong on our side. Your subscriptions are safe; try again in a moment.
        </p>
      </div>
      <Button className="mt-[22px]" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
