import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  themeOverride: "@subscriptions-manager/options/theme-override",
  groupByCategory: "@subscriptions-manager/options/group-by-category",
  sortBy: "@subscriptions-manager/options/sort-by",
} as const;

export type SortBy =
  | "nameAsc"
  | "nameDesc"
  | "priceAsc"
  | "priceDesc"
  | "billedAtAsc"
  | "billedAtDesc";

const SORT_BY_VALID: SortBy[] = [
  "nameAsc",
  "nameDesc",
  "priceAsc",
  "priceDesc",
  "billedAtAsc",
  "billedAtDesc",
];

function isSortBy(value: string | null): value is SortBy {
  return value !== null && SORT_BY_VALID.includes(value as SortBy);
}

export type ThemeOverride = "light" | "dark" | null;

const BOOLEAN_TRUE = "1";
const BOOLEAN_FALSE = "0";

function isThemeOverride(value: string | null): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === BOOLEAN_TRUE) return true;
  if (value === BOOLEAN_FALSE) return false;
  return fallback;
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

export async function loadGroupByCategory(defaultValue = false) {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEYS.groupByCategory);
    return parseBoolean(storedValue, defaultValue);
  } catch {
    return defaultValue;
  }
}

export async function saveGroupByCategory(value: boolean) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.groupByCategory,
      value ? BOOLEAN_TRUE : BOOLEAN_FALSE,
    );
  } catch {
    // Ignore write errors and keep app responsive.
  }
}

export async function loadSortBy(defaultValue: SortBy = "priceAsc") {
  try {
    const storedValue = await AsyncStorage.getItem(STORAGE_KEYS.sortBy);
    return isSortBy(storedValue) ? storedValue : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function saveSortBy(value: SortBy) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.sortBy, value);
  } catch {
    // Ignore write errors and keep app responsive.
  }
}
