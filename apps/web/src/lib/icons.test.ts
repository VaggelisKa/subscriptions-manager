import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BRANDS } from "@subscriptions-manager/shared/brands";
import { expect, test } from "vitest";
import { brandIcons } from "./icons";

const publicDir = fileURLToPath(new URL("../../public", import.meta.url));
const slugs = BRANDS.map((b) => b.slug);

test("every brand slug has an icon in public/brands", () => {
  expect(Object.keys(brandIcons).sort()).toEqual([...slugs].sort());
  for (const slug of slugs) {
    const icon = brandIcons[slug];
    expect(icon).toBe(`/brands/${slug}.svg`);
    expect(existsSync(`${publicDir}${icon}`), icon).toBe(true);
  }
});
