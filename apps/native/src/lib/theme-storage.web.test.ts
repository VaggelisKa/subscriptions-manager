import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { themes } from "./theme";
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

// ── public/index.html: what the page shows before the bundle has loaded ──

const indexHtml = readFileSync(path.join(__dirname, "../../public/index.html"), "utf8");

function runNoFlashScript() {
  const scripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  expect(scripts).toHaveLength(1);
  new Function(scripts[0])();
}

test("the inline script applies the same scheme the app will render", () => {
  for (const stored of [undefined, "system", "light", "dark", "garbage"]) {
    for (const osDark of [false, true]) {
      const { classes, root } = stubPage({ stored, osDark });
      runNoFlashScript();
      const expected = resolveColorScheme(readThemePreference(), osDark ? "dark" : "light");
      expect([...classes], `stored ${stored}, OS ${osDark ? "dark" : "light"}`).toEqual([expected]);
      expect(root.style.colorScheme).toBe(expected);
    }
  }
});

test("the inline script survives blocked storage", () => {
  const { classes } = stubPage({ osDark: true });
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("SecurityError");
    },
  });
  runNoFlashScript();
  expect([...classes]).toEqual(["dark"]);
});

/** `hsl(h, s%, l%)` → `#rrggbb`. */
function hslToHex(hsl: string) {
  const [h, s, l] = hsl.match(/[\d.]+/g)!.map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

test("the page background before the app renders is the theme's background", () => {
  for (const scheme of ["light", "dark"] as const) {
    const rule = indexHtml.match(new RegExp(`html\\.${scheme}\\s*{\\s*background-color:\\s*(#[0-9a-f]{6});`));
    expect(rule?.[1], scheme).toBe(hslToHex(themes[scheme].background));
  }
});
