"use client";

import { Ellipsis, LogOut, Monitor, Moon, Plus, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToolbarButton, ToolbarGroup } from "@/components/ui/toolbar-button";
import { supabaseClient } from "@/lib/supabase-client";

type Props = {
  email: string | undefined;
  onInsights: () => void;
  onAdd: () => void;
};

const noop = () => () => {};

/** Filled bars, like SF Symbols' `chart.bar.fill` used by the native app. */
function ChartBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="10" width="5" height="11" rx="1.6" />
      <rect x="9.5" y="7" width="5" height="14" rx="1.6" />
      <rect x="16" y="4" width="5" height="17" rx="1.6" />
    </svg>
  );
}

/**
 * Toolbar buttons that float over the content with no bar behind them:
 * Insights on the left; add and the ⋯ menu (appearance, sign out) on the right.
 */
export function Toolbar({ email, onInsights, onAdd }: Props) {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  async function signOut() {
    await supabaseClient.auth.signOut({ scope: "global" });
    router.replace("/login");
  }

  return (
    <div className="pointer-events-none sticky top-0 z-30 -mx-4 flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:-mx-1 sm:px-1 sm:pt-6">
      <ToolbarButton aria-label="Insights" onClick={onInsights} className="pointer-events-auto">
        <ChartBarsIcon />
      </ToolbarButton>

      <ToolbarGroup className="pointer-events-auto">
        <ToolbarButton variant="bare" aria-label="Add subscription" onClick={onAdd} className="hover:bg-transparent">
          <Plus strokeWidth={2.25} />
        </ToolbarButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolbarButton variant="bare" aria-label="More options" className="hover:bg-transparent">
              <Ellipsis strokeWidth={2.5} />
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-60">
            {email ? <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel> : null}
            <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
              {isDark ? <Sun /> : <Moon />}
              {isDark ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            {mounted && theme !== "system" ? (
              <DropdownMenuItem onSelect={() => setTheme("system")}>
                <Monitor />
                Match system
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarGroup>
    </div>
  );
}
