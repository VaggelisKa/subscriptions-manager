import { randomUUID } from "node:crypto";
import { seedCopy, withDb } from "../../support/db";
import { MAILPIT_URL, USERS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile } from "../../support/app";

// Flow 1: sign in → home, sign out. Today's login is a magic link: the request is tested up to
// "Check your email" (and the email reaching the local inbox); the session itself is created
// programmatically. Uses its own user: sign-out is global and revokes all of its sessions.
async function mailCount(email: string) {
  const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  return ((await res.json()) as { messages_count: number }).messages_count;
}

test.describe("flow 1: sign in and out", () => {
  test("magic link request shows Check your email", async ({ page }) => {
    // Sign-in only (shouldCreateUser: false), so the address needs an account first.
    const user = { id: randomUUID(), email: `magic-${Date.now()}@parity.test` };
    try {
      await seedCopy(user, "empty");
      await open(page, "/login");
      await expect(page).toHaveTitle("Sign in");
      await page.getByPlaceholder("Email").fill(user.email);
      await page.getByRole("button", { name: "Email me a sign-in link" }).click();
      await expect(page).toHaveURL(/\/login\/confirmation$/);
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
      await expect(page).toHaveTitle("Check your email");
      // The link reached the local inbox (Mailpit).
      await expect.poll(() => mailCount(user.email)).toBe(1);
      await page.getByRole("link", { name: "Use a different email" }).click();
      await expect(page).toHaveURL(/\/login$/);
    } finally {
      // Remove the account created for this test (its subscriptions cascade).
      await withDb((sql) => sql`delete from auth.users where id = ${user.id}`);
    }
  });

  test("an unknown address still shows Check your email, but no account or email is created", async ({ page }) => {
    const email = `unknown-${Date.now()}@parity.test`;
    try {
      await open(page, "/login");
      await page.getByPlaceholder("Email").fill(email);
      await page.getByRole("button", { name: "Email me a sign-in link" }).click();
      await expect(page).toHaveURL(/\/login\/confirmation$/);
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
      // Give a would-be email time to arrive before asserting there is none.
      await page.waitForTimeout(2000);
      expect(await mailCount(email)).toBe(0);
      const rows = await withDb((sql) => sql`select 1 from auth.users where email = ${email}`);
      expect(rows.length).toBe(0);
    } finally {
      // Only matters if the app regresses and signs the address up.
      await withDb((sql) => sql`delete from auth.users where email = ${email}`);
    }
  });

  test("an invalid address shows the error and stays on the page", async ({ page }) => {
    await open(page, "/login");
    await page.getByPlaceholder("Email").fill("someone@localhost");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signed out, home redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("session → home; sign out from the toolbar menu", async ({ login, page, context }) => {
      // Fresh sessions: sign-out is global, so a cached one may already be revoked.
      await login("signout", { fresh: true });
      await open(page, "/");
      await expect(page).toHaveTitle("Your subscriptions");
      await expect(page.getByRole("heading", { name: "Subscriptions", level: 1 })).toBeVisible();
      await open(page, "/login");
      await expect(page).toHaveURL(/\/$/); // signed in: /login sends you home

      await mobile.menuButton(page).click();
      await expect(page.getByText(USERS.signout.email)).toBeVisible();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/login$/);
      expect((await context.cookies()).filter((c) => c.name.startsWith("sb-"))).toEqual([]);
      await page.goto("/");
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test("session → home; sign out from the desktop account menu", async ({ login, page }) => {
    await login("signout", { fresh: true });
    await open(page, "/");
    await desktop.accountButton(page).click();
    await expect(page.getByText(USERS.signout.email)).toBeVisible();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
