import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { cssTokenNames, themes, type ThemeColors } from "./theme";

// The web app's tokens are the source until apps/web is deleted (Phase 6); this test goes with it.
const globalsCss = readFileSync(
  fileURLToPath(new URL("../../../web/src/app/globals.css", import.meta.url)),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** The custom properties declared directly in `selector { … }`. */
function cssTokens(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = globalsCss.match(new RegExp(`(?:^|\\s)${escaped}\\s*\\{([^}]*)\\}`))?.[1];
  if (block === undefined) throw new Error(`${selector} not found in globals.css`);
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

/** A token value the way theme.ts writes it: `H S% L%` → `hsl(…)`, `… / A` → `hsla(…)`, `N%` → N/100. */
function toNative(value: string): string | number {
  const percent = value.match(/^(-?[\d.]+)%$/);
  if (percent) return Number(percent[1]) / 100;
  const hsl = value.match(/^([\d.]+) ([\d.]+%) ([\d.]+%)(?: \/ ([\d.]+))?$/);
  if (!hsl) throw new Error(`unrecognised token value "${value}"`);
  const [, h, s, l, a] = hsl;
  return a === undefined ? `hsl(${h}, ${s}, ${l})` : `hsla(${h}, ${s}, ${l}, ${a})`;
}

const selectors = { light: ":root", dark: ".dark" } as const;

describe.each(Object.entries(selectors) as [keyof typeof themes, string][])(
  "%s theme matches globals.css",
  (scheme, selector) => {
    const css = cssTokens(selector);
    const colors: ThemeColors = themes[scheme];

    test("same token set", () => {
      expect(Object.values(cssTokenNames).sort()).toEqual(Object.keys(css).sort());
      expect(Object.keys(cssTokenNames).sort()).toEqual(Object.keys(colors).sort());
    });

    test("same values", () => {
      for (const [key, name] of Object.entries(cssTokenNames) as [keyof ThemeColors, string][]) {
        expect(colors[key], `${key} (${name})`).toBe(toNative(css[name]));
      }
    });
  },
);
