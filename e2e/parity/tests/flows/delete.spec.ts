import { seed, subscriptionsOf } from "../../support/db";
import { SUBS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile } from "../../support/app";

// Flow 4: delete with confirmation (button, Backspace, Delete), cancel via Esc. Own user,
// reseeded around each test.
async function names() {
  return (await subscriptionsOf("writerDelete")).map((s) => s.name);
}

test.describe("flow 4: delete", () => {
  test.beforeEach(async ({ login }) => {
    await seed("writerDelete");
    await login("writerDelete");
  });
  test.afterAll(() => seed("writerDelete"));

  test("desktop: button; Esc cancels, Delete removes and selects the next row", async ({ page }) => {
    await open(page, "/");
    await desktop.row(page, SUBS.netflix.name).click();
    const inspector = desktop.inspector(page, SUBS.netflix.name);
    await inspector.getByRole("button", { name: "Delete subscription" }).click();
    const confirm = page.getByRole("group", { name: "Delete “Netflix”?" });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(inspector).toBeVisible();
    expect(await names()).toContain(SUBS.netflix.name);

    await inspector.getByRole("button", { name: "Delete subscription" }).click();
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(desktop.row(page, SUBS.netflix.name)).toHaveCount(0);
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Fitness World,/);
    await expect(page.getByText("11 tracked")).toBeVisible();
    expect(await names()).not.toContain(SUBS.netflix.name);
  });

  for (const key of ["Backspace", "Delete"]) {
    test(`desktop: ${key} opens the confirm`, async ({ page }) => {
      await open(page, "/");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Fitness World,/);
      await page.keyboard.press(key);
      const confirm = page.getByRole("group", { name: "Delete “Fitness World”?" });
      await expect(confirm).toBeVisible();
      await confirm.getByRole("button", { name: "Delete" }).click();
      await expect(desktop.row(page, SUBS.fitness.name)).toHaveCount(0);
      expect(await names()).not.toContain(SUBS.fitness.name);
    });
  }

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("detail sheet → Delete subscription → Delete", async ({ page }) => {
      await open(page, "/");
      await mobile.row(page, SUBS.podcast.name).click();
      const sheet = mobile.sheet(page);
      await sheet.getByRole("button", { name: "Delete subscription" }).click();
      await sheet.getByRole("group", { name: "Delete “Podcast Supporter Club”?" }).getByRole("button", { name: "Delete" }).click();
      await expect(sheet).toBeHidden();
      await expect(mobile.row(page, SUBS.podcast.name)).toHaveCount(0);
      expect(await names()).not.toContain(SUBS.podcast.name);
    });

    test("edit sheet → trash → Cancel keeps it", async ({ page }) => {
      await open(page, "/");
      await mobile.row(page, SUBS.podcast.name).click();
      await mobile.sheet(page).getByRole("button", { name: "Edit" }).click();
      await mobile.sheet(page).getByRole("button", { name: "Delete subscription" }).click();
      const confirm = mobile.sheet(page).getByRole("group", { name: "Delete “Podcast Supporter Club”?" });
      await confirm.getByRole("button", { name: "Cancel" }).click();
      await expect(confirm).toBeHidden();
      expect(await names()).toContain(SUBS.podcast.name);
    });
  });
});
