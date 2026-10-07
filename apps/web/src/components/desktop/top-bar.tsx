"use client";

import { Plus } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { ChartBarsIcon } from "@/components/home/toolbar";
import { AccountMenu } from "@/components/desktop/account-menu";
import { cn } from "@/lib/utils";

const bars = [
  { width: 14, opacity: 1 },
  { width: 14, opacity: 0.75 },
  { width: 9, opacity: 0.5 },
];

/** A 30px `AppMark`. */
function SmallAppMark() {
  return (
    <span
      aria-hidden
      className="flex size-[30px] items-center justify-center rounded-[9px] bg-primary shadow-[0_6px_14px_-8px_rgb(249_115_22/0.8)]"
    >
      <span className="flex w-[14px] flex-col gap-[2px]">
        {bars.map((bar, index) => (
          <span
            key={index}
            className="block h-[3px] rounded-full bg-white"
            style={{ width: bar.width, opacity: bar.opacity }}
          />
        ))}
      </span>
    </span>
  );
}

type Props = {
  email: string | undefined;
  insightsOpen: boolean;
  onInsights: () => void;
  onAdd: () => void;
};

/** Desktop top bar: the app mark and name; Insights, Add and the account menu on the right. */
export function TopBar({ email, insightsOpen, onInsights, onAdd }: Props) {
  return (
    <header className="mx-auto flex h-16 max-w-[1600px] items-center gap-3.5 px-6 xl:gap-5 xl:px-8">
      <h1 className="sr-only">Subscriptions</h1>
      <div aria-hidden className="flex items-center gap-2.5 text-[17px] font-black tracking-[-0.2px]">
        <SmallAppMark />
        Subscriptions
      </div>

      <div className="flex-1" />

      <ToolbarButton
        aria-pressed={insightsOpen}
        onClick={onInsights}
        className={cn(
          "h-[38px] gap-[7px] px-3.5 text-[15px] font-bold [&_svg]:size-[18px]",
          insightsOpen && "bg-foreground text-background shadow-none",
        )}
      >
        <ChartBarsIcon />
        Insights
      </ToolbarButton>

      <button
        type="button"
        onClick={onAdd}
        title="New subscription (N)"
        aria-keyshortcuts="N"
        className="inline-flex h-[38px] select-none items-center gap-2 whitespace-nowrap rounded-full bg-primary-button pl-3.5 pr-2 text-[15px] font-extrabold text-primary-foreground shadow-float transition-[transform,background-color] duration-150 hover:bg-primary-button-hover active:bg-primary-button-active active:scale-95"
      >
        <Plus aria-hidden className="size-[18px]" strokeWidth={2.75} />
        Add subscription
        <Kbd className="bg-primary-foreground/[0.14] text-primary-foreground">N</Kbd>
      </button>

      <AccountMenu email={email} />
    </header>
  );
}
