import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  themeOverride: "@subscriptions-manager/options/theme-override",
} as const;

export type ThemeOverride = "light" | "dark" | null;

function isThemeOverride(value: string | null): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

export async function loadThemeOverride() {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEYS.themeOverride);
    return isThemeOverride(storedValue) ? storedValue : null;
  } catch {
    return null;
  }
}

export async function saveThemeOverride(value: ThemeOverride) {
  try {
    if (value === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.themeOverride);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.themeOverride, value);
  } catch {
    // Ignore write errors and keep app responsive.
  }
}
