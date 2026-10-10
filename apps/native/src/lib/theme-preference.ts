/**
 * The theme setting, with next-themes' names (apps/web): follow the OS, or a fixed scheme.
 * Stored per platform by `theme-storage` (`.web.ts`: localStorage `theme`, like next-themes).
 */
export type ThemePreference = "system" | "light" | "dark";

/** A stored value, or "system" for anything else (next-themes' `defaultTheme`). */
export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

/** The scheme to render: the setting, or the OS scheme under "system" (light when unknown). */
export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): "light" | "dark" {
  if (preference !== "system") return preference;
  return systemScheme === "dark" ? "dark" : "light";
}
