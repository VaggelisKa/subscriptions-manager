import type { Page } from "@playwright/test";
import { expect, test } from "../../support/fixtures";
import { SUBS } from "../../support/env";

// Does the Expo web export boot (PR 5-1)? Signed out /login renders, and with a programmatic
// session (support/auth.ts, the localStorage entry) / renders the populated user's list. Neither
// may log a console error or throw. Only runs for PARITY_TARGET=expo (project "smoke").

/** Console errors and uncaught exceptions on `page` from here on. */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message.split("\n")[0]}`));
  return errors;
}

test.describe("expo boot @smoke", () => {
  test("signed out, /login renders", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/login");
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page).toHaveTitle("Sign in");
    await expect(page).toHaveURL(/\/login$/);
    expect(errors).toEqual([]);
  });

  test("signed out, / redirects to /login", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("with a session, / renders the subscriptions", async ({ login, page }) => {
    const errors = collectErrors(page);
    await login("populated");
    await page.goto("/");
    await expect(page.getByText(SUBS.netflix.name).first()).toBeVisible();
    await expect(page).toHaveTitle("Your subscriptions");
    await expect(page).toHaveURL(/\/$/);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
