import { test as base, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { maxDiffPixelRatioFor } from "../thresholds";
import { cachedSignIn, loginAs, loginWith } from "./auth";
import { checkAxe } from "./axe";
import { seedCopy } from "./db";
import { FIXED_TIME, TARGET, workerUser, type FixtureUser, type Target, type UserKey } from "./env";

export { expect };

export type Width = 375 | 1024 | 1440;

type ShotOptions = {
  fullPage?: boolean;
  /** Regions painted over before comparing; only for app behaviour that isn't deterministic (say why at the call). */
  mask?: Locator[];
};

type Fixtures = {
  target: Target;
  /** Signs a fixture user in for the next navigation (support/auth.ts). */
  login: (user: UserKey, options?: { fresh?: boolean }) => Promise<void>;
  /** Signs in this worker slot's own copy of `populated` (env.ts workerUser), for tests that inject faults. */
  loginOwnUser: () => Promise<FixtureUser>;
  /** Captures `<area>/<state>` at this project's width and theme: axe, then the screenshot. */
  shot: (area: string, state: string, options?: ShotOptions) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  target: TARGET,

  // Every page starts on the fixed clock (spec §12A.2); timers keep running. And no page may
  // hit a React hydration error: server-rendered HTML that differs from the browser's render
  // (e.g. the server on another day than page.clock) shows up as one (#418 and friends), even
  // where React recovers and the final pixels match.
  page: async ({ page }, use) => {
    const hydrationErrors: string[] = [];
    page.on("pageerror", (error) => {
      if (/hydrat|react\.dev\/errors\/(418|419|422|423|425)\b/i.test(error.message)) {
        hydrationErrors.push(error.message.split("\n")[0]);
      }
    });
    await page.clock.setFixedTime(new Date(FIXED_TIME));
    await use(page);
    expect(hydrationErrors, "React hydration errors (server and browser rendered differently)").toEqual([]);
  },

  login: async ({ context }, use) => {
    await use(async (user, options) => {
      await loginAs(context, user, options);
    });
  },

  loginOwnUser: async ({ context }, use, testInfo) => {
    await use(async () => {
      const user = workerUser(testInfo.parallelIndex);
      await seedCopy(user, "populated");
      await loginWith(context, await cachedSignIn(`worker-${testInfo.parallelIndex}`, user));
      return user;
    });
  },

  shot: async ({ page }, use, testInfo) => {
    await use(async (area, state, options = {}) => {
      const { width, theme } = projectMeta(testInfo);
      const shot = `${area}/${state}--${width}-${theme}`;
      await settle(page);
      const newViolations = await checkAxe(page, shot);
      expect.soft(newViolations, `axe violations not in axe-baseline.json for ${shot}`).toEqual([]);
      await expect(page).toHaveScreenshot([area, `${state}--${width}-${theme}.png`], {
        fullPage: options.fullPage ?? false,
        mask: options.mask,
        maxDiffPixelRatio: maxDiffPixelRatioFor(`${area}/${state}`, shot),
      });
    });
  },
});

function projectMeta(testInfo: TestInfo) {
  const { width, theme } = testInfo.project.metadata as { width?: Width; theme?: string };
  if (!width || !theme) throw new Error(`shot() needs a visual project (got "${testInfo.project.name}")`);
  return { width, theme };
}

/** Tags a visual state with the widths it exists at; each visual project runs only its own. */
export function at(...widths: Width[]) {
  return { tag: widths.map((w) => `@w${w}`) };
}

/**
 * Waits until the app is interactive: the document has loaded, every button, link and field
 * has been hydrated by React (Next hydrates `document`; Expo renders into #root), the network
 * is quiet, and two more frames have run so effects are in place (the desktop hotkeys are
 * bound in an effect once the width media query matches; `?s=` is read in one too).
 */
export async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    if (document.readyState !== "complete") return false;
    const interactive = [...document.querySelectorAll("body button, body a[href], body input")];
    return (
      interactive.length > 0 &&
      interactive.every((el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$")))
    );
  });
  await frames(page);
}

export async function frames(page: Page, count = 2) {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        const step = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
        step(n);
      }),
    count,
  );
}

/**
 * Scrolls every scrolled element inside `container` back to the top. Clicking into a sheet can
 * leave its body scrolled by however far Playwright scrolled the target into view, which
 * varies run to run; shots of those states are taken from the top.
 */
export async function scrollToTop(container: Locator) {
  await container.evaluate((root) => {
    for (const el of [root, ...root.querySelectorAll("*")]) if (el.scrollTop > 0) el.scrollTop = 0;
  });
}

/** Opens a path and waits for hydration. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await ready(page);
}

/**
 * Before a shot: the pointer parked in the bottom-left corner (no hover, no delayed
 * tooltips), web fonts loaded, images decoded, and a moment for delayed UI to settle.
 */
async function settle(page: Page) {
  const viewport = page.viewportSize();
  if (viewport) await page.mouse.move(1, viewport.height - 1);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  // Covers delayed hover tooltips (month calendar: 300 ms) being cancelled or shown.
  await page.waitForTimeout(400);
  await frames(page);
}
