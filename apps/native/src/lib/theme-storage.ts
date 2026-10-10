import { Appearance } from "react-native";
import { loadThemeOverride, saveThemeOverride } from "@/lib/user-options";
import type { ThemePreference } from "@/lib/theme-preference";

/** The stored setting; native keeps the override key it always used (no value means system). */
export async function loadThemePreference(): Promise<ThemePreference> {
  return (await loadThemeOverride()) ?? "system";
}

export function saveThemePreference(preference: ThemePreference) {
  void saveThemeOverride(preference === "system" ? null : preference);
}

/**
 * Native presentations outside our views (the date picker popup, alerts) take their
 * appearance from the window, so push the setting down to it.
 */
export function applyThemePreference(preference: ThemePreference, _colorScheme: "light" | "dark") {
  Appearance.setColorScheme(preference === "system" ? "auto" : preference);
}

/** Only one window can change the setting on native. */
export function subscribeToThemePreference(_onChange: (preference: ThemePreference) => void) {
  return () => {};
}
