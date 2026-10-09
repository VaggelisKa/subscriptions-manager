import { expect, open, ready, test } from "../../support/fixtures";
import { desktop, mobile } from "../../support/app";
import { addFault } from "../../support/faults";

// Flow 11: empty account, loading skeleton, load error + retry. Loading and error are made by
// the Supabase proxy (support/supabase-proxy.mjs) for this flow's own users.
test.describe("flow 11: empty, loading, error", () => {
  test("empty account, desktop: the add form starts open; Cancel shows the empty state's button", async ({ login, page }) => {
    await login("empty");
    await open(page, "/");
    await expect(page.getByRole("heading", { name: "Track your first subscription" })).toBeVisible();
    const panel = desktop.inspector(page, "New subscription");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Cancel" }).click();
    await expect(panel).toBeHidden();
    await page.getByRole("button", { name: "Add Spotify" }).click();
    await expect(desktop.inspector(page, "New subscription").getByLabel("Name")).toHaveValue("Spotify");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("empty account: empty state, quick add", async ({ login, page }) => {
      await login("empty");
      await open(page, "/");
      await expect(page.getByRole("heading", { name: "Track your first subscription" })).toBeVisible();
      await expect(mobile.sheet(page)).toHaveCount(0);
      await page.getByRole("button", { name: "Add TV 2 Play" }).click();
      await expect(mobile.sheet(page).getByLabel("Name")).toHaveValue("TV 2 Play");
    });
  });

  test("loading skeleton while the data loads, then the ledger", async ({ login, page }) => {
    await login("slow");
    const release = await addFault("slow", "hold");
    try {
      await page.goto("/", { waitUntil: "commit" });
      await expect(page.getByRole("status", { name: "Loading subscriptions" })).toBeVisible();
      await expect(desktop.ledger(page)).toHaveCount(0);
    } finally {
      await release();
    }
    await expect(desktop.ledger(page)).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading subscriptions" })).toHaveCount(0);
  });

  test("load error, then Try again recovers", async ({ login, page }) => {
    await login("retry");
    const release = await addFault("retry", "error");
    try {
      await page.goto("/");
      await ready(page);
      await expect(page.getByRole("heading", { name: "Couldn't load your subscriptions" })).toBeVisible();
      // A failed load must not look like an empty account.
      await expect(page.getByRole("heading", { name: "Track your first subscription" })).toHaveCount(0);
    } finally {
      await release();
    }
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(desktop.ledger(page)).toBeVisible();
    await expect(page.getByText("12 tracked")).toBeVisible();
  });
});
