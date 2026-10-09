import { SUBS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile } from "../../support/app";

// Flow 10: resizing across 1440 and 1024 switches layouts without losing the open item.
test.describe("flow 10: responsiveness", () => {
  test("wide → desktop → mobile → wide keeps the open subscription", async ({ login, page }) => {
    await login("populated");
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/");
    await desktop.row(page, SUBS.dsb.name).click();
    const overview = page.getByRole("complementary", { name: "Overview" });
    await expect(desktop.inspector(page, SUBS.dsb.name)).toBeVisible();
    await expect(overview).toBeVisible(); // ≥ 1440: the rail stays beside the inspector

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(desktop.inspector(page, SUBS.dsb.name)).toBeVisible();
    await expect(overview).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(desktop.inspector(page, SUBS.dsb.name)).toBeVisible();

    await page.setViewportSize({ width: 1023, height: 768 });
    await expect(page.getByRole("dialog", { name: SUBS.dsb.name })).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(mobile.sheet(page)).toBeHidden();
    await expect(desktop.inspector(page, SUBS.dsb.name)).toBeVisible();
    await expect(overview).toBeVisible();
  });

  test("closing the rail at 1024 brings it back", async ({ login, page }) => {
    await login("populated");
    await page.setViewportSize({ width: 1024, height: 768 });
    await open(page, "/");
    const overview = page.getByRole("complementary", { name: "Overview" });
    await expect(overview).toBeVisible();
    await desktop.row(page, SUBS.netflix.name).click();
    await expect(overview).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(overview).toBeVisible();
  });
});
