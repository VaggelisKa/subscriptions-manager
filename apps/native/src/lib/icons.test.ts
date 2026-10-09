import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BRANDS } from "@subscriptions-manager/shared/brands";
import { expect, test } from "vitest";

const libDir = fileURLToPath(new URL(".", import.meta.url));
const slugs = BRANDS.map((b) => b.slug);

test("every brand slug has an icon in assets/brands", () => {
  // icons.ts uses Metro asset `require`s that only Metro can load, so the map is read as
  // text. Its `Record<BrandSlug, number>` type covers the rest at compile time.
  const source = readFileSync(`${libDir}icons.ts`, "utf8");
  const brandIcons = Object.fromEntries(
    [...source.matchAll(/^ {2}"?([a-z0-9]+)"?: require\("([^"]+)"\),$/gm)].map((m) => [m[1], m[2]]),
  );
  expect(Object.keys(brandIcons).sort()).toEqual([...slugs].sort());
  for (const slug of slugs) {
    const icon = brandIcons[slug];
    expect(icon).toBe(`../../assets/brands/${slug}.svg`);
    expect(existsSync(`${libDir}${icon}`), icon).toBe(true);
  }
});
