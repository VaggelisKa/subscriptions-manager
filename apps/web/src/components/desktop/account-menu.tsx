"use client";

import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Segmented } from "@/components/ui/segmented";
import { useSignOut } from "@/lib/use-sign-out";

type Theme = "system" | "light" | "dark";

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "system", label: "System", icon: <Monitor aria-hidden /> },
  { value: "light", label: "Light", icon: <Sun aria-hidden /> },
  { value: "dark", label: "Dark", icon: <Moon aria-hidden /> },
];

/** The avatar menu: who's signed in, System / Light / Dark, and sign out. */
export function AccountMenu({ email }: { email: string | undefined }) {
  const signOut = useSignOut();
  // The menu only renders in the browser, so the stored theme is known.
  const { theme, setTheme } = useTheme();
  const current = themes.find((t) => t.value === theme)?.value ?? "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        title={email}
        className="flex size-[38px] items-center justify-center rounded-full bg-surface text-[16px] font-black text-primary-text shadow-float transition-transform active:scale-95 data-[state=open]:ring-2 data-[state=open]:ring-primary data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-background"
      >
        {email?.trim().charAt(0).toUpperCase() || "?"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[280px]">
        {email ? <DropdownMenuLabel className="truncate pt-2 text-[14px]">{email}</DropdownMenuLabel> : null}
        <DropdownMenuLabel className="pb-1.5 pt-1 text-[14px] font-bold text-foreground">Appearance</DropdownMenuLabel>
        <Segmented
          label="Appearance"
          options={themes}
          value={current}
          onChange={setTheme}
          className="mx-1.5 mb-1.5"
        />
        <DropdownMenuSeparator className="mx-1 h-px bg-separator" />
        <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
