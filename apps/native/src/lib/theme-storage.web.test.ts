import { afterEach, expect, test, vi } from "vitest";
import { parseThemePreference, resolveColorScheme, type ThemePreference } from "./theme-preference";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  loadThemePreference,
  readThemePreference,
  saveThemePreference,
  subscribeToThemePreference,
} from "./theme-storage.web";

/** A page as far as the theme code can tell: localStorage, <html> and the OS scheme. */
function stubPage({ stored, osDark = false }: { stored?: string; osDark?: boolean } = {}) {
  const items = new Map<string, string>(stored === undefined ? [] : [[THEME_STORAGE_KEY, stored]]);
  const localStorage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
  const classes = new Set<string>();
  const root = {
    classList: {
      add: (name: string) => void classes.add(name),
      remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
    },
    style: { colorScheme: "" },
  };
  const listeners = new Map<string, (event: unknown) => void>();
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" && osDark }),
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
  });
  return { items, classes, root, listeners };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("parses the three settings; anything else is system (next-themes' default)", () => {
  expect(parseThemePreference("system")).toBe("system");
  expect(parseThemePreference("light")).toBe("light");
  expect(parseThemePreference("dark")).toBe("dark");
  for (const value of [null, undefined, "", "Dark", "auto"]) {
    expect(parseThemePreference(value)).toBe("system");
  }
});

test("system follows the OS scheme; light and dark ignore it", () => {
  expect(resolveColorScheme("system", "dark")).toBe("dark");
  expect(resolveColorScheme("system", "light")).toBe("light");
  expect(resolveColorScheme("system", null)).toBe("light");
  expect(resolveColorScheme("light", "dark")).toBe("light");
  expect(resolveColorScheme("dark", "light")).toBe("dark");
});

test("reads localStorage `theme`, defaulting to system", async () => {
  stubPage();
  expect(readThemePreference()).toBe("system");
  stubPage({ stored: "dark" });
  expect(readThemePreference()).toBe("dark");
  await expect(loadThemePreference()).resolves.toBe("dark");
  stubPage({ stored: "purple" });
  expect(readThemePreference()).toBe("system");
});

test("writes every choice, system included, under `theme`", () => {
  const { items } = stubPage();
  for (const preference of ["dark", "light", "system"] as const) {
    saveThemePreference(preference);
    expect(items.get("theme")).toBe(preference);
    expect(readThemePreference()).toBe(preference);
  }
});

test("blocked storage follows the OS and doesn't throw", () => {
  stubPage();
  const blocked = () => {
    throw new Error("SecurityError");
  };
  vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });
  expect(readThemePreference()).toBe("system");
  expect(() => saveThemePreference("dark")).not.toThrow();
});

test("puts the rendered scheme on <html> as a class and color-scheme", () => {
  const { classes, root } = stubPage();
  applyThemePreference("system", "dark");
  expect([...classes]).toEqual(["dark"]);
  expect(root.style.colorScheme).toBe("dark");
  applyThemePreference("light", "light");
  expect([...classes]).toEqual(["light"]);
  expect(root.style.colorScheme).toBe("light");
});

test("follows a choice made in another tab", () => {
  const { listeners } = stubPage();
  const seen: ThemePreference[] = [];
  const unsubscribe = subscribeToThemePreference((preference) => seen.push(preference));
  const onStorage = listeners.get("storage")!;
  onStorage({ key: "theme", newValue: "dark" });
  onStorage({ key: "sb-127-auth-token", newValue: "{}" });
  onStorage({ key: "theme", newValue: null }); // removed: back to the default
  expect(seen).toEqual(["dark", "system"]);
  unsubscribe();
  expect(listeners.has("storage")).toBe(false);
});
