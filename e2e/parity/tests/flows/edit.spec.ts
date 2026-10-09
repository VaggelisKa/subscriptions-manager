import { seed, subscriptionsOf } from "../../support/db";
import { SUBS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile } from "../../support/app";

// Flow 3: edit via the Edit button and via E; `billed_at` is only rewritten when the date was
// changed (apps/web/src/lib/actions.ts updateSubscription). Own user, reseeded around each test.
const NETFLIX_ANCHOR = "2025-12-14T11:00:00.000Z"; // seed.sql: 14 Dec 2025, noon in Copenhagen
const ELECTRICITY_ANCHOR = "2026-01-20T11:00:00.000Z";

async function row(name: string) {
  const found = (await subscriptionsOf("writerEdit")).find((s) => s.name === name);
  expect(found, `${name} exists`).toBeTruthy();
  return found!;
}

test.describe("flow 3: edit", () => {
  test.beforeEach(async ({ login }) => {
    await seed("writerEdit");
    await login("writerEdit");
  });
  test.afterAll(() => seed("writerEdit"));

  test("desktop: Edit button; name, price and interval change, billed_at kept", async ({ page }) => {
    await open(page, "/");
    await desktop.row(page, SUBS.netflix.name).click();
    await desktop.inspector(page, SUBS.netflix.name).getByRole("button", { name: "Edit" }).click();
    const panel = desktop.inspector(page, "Edit subscription");
    await expect(panel.getByLabel("Name")).toHaveValue("Netflix");
    await expect(panel.getByLabel("Price")).toHaveValue("129");
    await expect(panel.getByRole("button", { name: /^Next charge/ })).toHaveAccessibleName("Next charge 14 Oct 2026");

    await panel.getByLabel("Name").fill("Netflix Premium");
    await panel.getByLabel("Price").fill("149,50");
    await panel.getByRole("radiogroup", { name: "Interval" }).getByText("Yearly").click();
    await panel.getByRole("button", { name: /^Save changes/ }).click();

    // Back to the detail it came from.
    await expect(desktop.inspector(page, "Netflix Premium")).toBeVisible();
    const saved = await row("Netflix Premium");
    expect(saved.price).toBe("149.50");
    expect(saved.interval).toBe("year");
    expect(saved.billed_at.toISOString()).toBe(NETFLIX_ANCHOR);
  });

  test("desktop: E; a new date is saved, as noon in Copenhagen", async ({ page }) => {
    await open(page, "/");
    await page.keyboard.press("ArrowDown");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Netflix,/);
    await page.keyboard.press("e");
    const panel = desktop.inspector(page, "Edit subscription");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: /^Next charge/ }).click();
    await page.getByRole("gridcell", { name: "20", exact: true }).click();
    // Hotkeys wait while a popover is open (or still closing).
    await expect(page.getByRole("grid")).toBeHidden();
    await page.keyboard.press("ControlOrMeta+Enter");

    await expect(desktop.inspector(page, SUBS.netflix.name)).toBeVisible();
    const saved = await row(SUBS.netflix.name);
    expect(saved.billed_at.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(saved.price).toBe("129.00");
  });

  test("desktop: Esc leaves the edit without saving", async ({ page }) => {
    await open(page, "/");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("e");
    const panel = desktop.inspector(page, "Edit subscription");
    await panel.getByLabel("Name").fill("Not saved");
    await page.keyboard.press("Escape");
    await expect(desktop.inspector(page, SUBS.netflix.name)).toBeVisible();
    expect((await row(SUBS.netflix.name)).billed_at.toISOString()).toBe(NETFLIX_ANCHOR);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("detail sheet → Edit; price change, billed_at kept", async ({ page }) => {
      await open(page, "/");
      await mobile.row(page, SUBS.electricity.name).click();
      await mobile.sheet(page).getByRole("button", { name: "Edit" }).click();
      const sheet = mobile.sheet(page);
      await expect(sheet.getByRole("heading", { name: "Edit subscription" })).toBeVisible();
      await expect(sheet.getByLabel("Price in kroner")).toHaveValue("450,50");
      await sheet.getByLabel("Price in kroner").fill("500");
      await sheet.getByRole("button", { name: "Save" }).click();

      // Closing the edit goes back to the detail sheet.
      await expect(sheet.getByRole("heading", { name: "Edit subscription" })).toBeHidden();
      await expect(sheet.getByText("every month · 6.000 kr a year")).toBeVisible();
      const saved = await row(SUBS.electricity.name);
      expect(saved.price).toBe("500.00");
      expect(saved.billed_at.toISOString()).toBe(ELECTRICITY_ANCHOR);
    });
  });
});
