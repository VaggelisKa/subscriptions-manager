import { parseThemePreference, type ThemePreference } from "./theme-preference";

/**
 * Stored the way next-themes stores it in apps/web: localStorage `theme`, "system" | "light" |
 * "dark", written only when the user picks one. The inline script in public/index.html reads the
 * same key before the bundle loads, so the first paint already has the right scheme.
 */
export const THEME_STORAGE_KEY = "theme";

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage blocked (privacy settings): follow the OS.
    return "system";
  }
}

export async function loadThemePreference(): Promise<ThemePreference> {
  return readThemePreference();
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Keep the choice for this page only.
  }
}

/**
 * next-themes' `attribute="class"`: the scheme as a class on <html>, plus `color-scheme` so
 * scrollbars and form controls match.
 */
export function applyThemePreference(_preference: ThemePreference, colorScheme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove(colorScheme === "dark" ? "light" : "dark");
  root.classList.add(colorScheme);
  root.style.colorScheme = colorScheme;
}

/** A choice made in another tab applies here too (next-themes listens the same way). */
export function subscribeToThemePreference(onChange: (preference: ThemePreference) => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY) onChange(parseThemePreference(event.newValue));
  }
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
