import { SUBS, subscriptionId, USERS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop } from "../../support/app";

// Flow 8: `/?s=<id>` reopens that subscription in the desktop inspector, and the open detail or
// edit is mirrored back to `?s=`. Read-only.
const id = (sub: { n: number }) => subscriptionId(USERS.populated, sub.n);

test.describe("flow 8: deep link", () => {
  test.beforeEach(async ({ login }) => {
    await login("populated");
  });

  test("/?s=<id> opens the detail; selection and close keep the URL in step", async ({ page }) => {
    await open(page, `/?s=${id(SUBS.dsb)}`);
    await expect(desktop.inspector(page, SUBS.dsb.name)).toBeVisible();
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^DSB Commuter Pass,/);
    await expect(page).toHaveURL(new RegExp(`/\\?s=${id(SUBS.dsb)}$`));

    await desktop.row(page, SUBS.claude.name).click();
    await expect(page).toHaveURL(new RegExp(`/\\?s=${id(SUBS.claude)}$`));

    // Edit keeps the same ?s=.
    await page.keyboard.press("e");
    await expect(desktop.inspector(page, "Edit subscription")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/\\?s=${id(SUBS.claude)}$`));
    await page.keyboard.press("Escape");

    await desktop.inspector(page, SUBS.claude.name).getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/$/);

    // Reload with the link reopens it.
    await open(page, `/?s=${id(SUBS.claude)}`);
    await expect(desktop.inspector(page, SUBS.claude.name)).toBeVisible();
  });

  test("an unknown id opens nothing and is dropped from the URL", async ({ page }) => {
    await open(page, "/?s=00000000-0000-4000-b000-999999999999");
    await expect(page).toHaveURL(/\/$/);
    await expect(desktop.selectedRow(page)).toHaveCount(0);
  });

  test("another user's id opens nothing", async ({ page }) => {
    await open(page, `/?s=${subscriptionId(USERS.writerAdd, SUBS.dsb.n)}`);
    await expect(page).toHaveURL(/\/$/);
    await expect(desktop.selectedRow(page)).toHaveCount(0);
  });
});
