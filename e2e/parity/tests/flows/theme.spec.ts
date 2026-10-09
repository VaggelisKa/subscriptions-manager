import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile, pickSegment } from "../../support/app";

// Flow 9: theme system / light / dark from the desktop account menu and the mobile toolbar
// menu; the choice persists across a reload (next-themes keeps it in localStorage `theme`).
const html = (page: import("@playwright/test").Page) => page.locator("html");

test.describe("flow 9: theme", () => {
  test.beforeEach(async ({ login }) => {
    await login("populated");
  });

  test("desktop account menu: Dark, persisted; System follows the OS", async ({ page }) => {
    await open(page, "/");
    await expect(html(page)).toHaveClass(/\blight\b/);

    await desktop.accountButton(page).click();
    await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
    await pickSegment(page, "Appearance", "Dark");
    await expect(html(page)).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

    await open(page, "/");
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await desktop.accountButton(page).click();
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await pickSegment(page, "Appearance", "Light");
    await expect(html(page)).toHaveClass(/\blight\b/);

    await pickSegment(page, "Appearance", "System");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html(page)).toHaveClass(/\blight\b/);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("toolbar menu: Dark mode, persisted; Match system", async ({ page }) => {
      await open(page, "/");
      await mobile.menuButton(page).click();
      await expect(page.getByRole("menuitem", { name: "Match system" })).toHaveCount(0);
      await page.getByRole("menuitem", { name: "Dark mode" }).click();
      await expect(html(page)).toHaveClass(/\bdark\b/);

      await open(page, "/");
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await mobile.menuButton(page).click();
      await expect(page.getByRole("menuitem", { name: "Light mode" })).toBeVisible();
      await page.getByRole("menuitem", { name: "Match system" }).click();
      await expect(html(page)).toHaveClass(/\blight\b/);
      expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("system");
    });
  });
});
