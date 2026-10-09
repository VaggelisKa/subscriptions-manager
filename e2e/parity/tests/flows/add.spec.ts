import { seed, subscriptionsOf } from "../../support/db";
import { expect, open, test } from "../../support/fixtures";
import { blankBilledAtOnSave, desktop, mobile } from "../../support/app";

// Flow 2: add a subscription (mobile sheet; desktop inspector via the button and via N, saved
// via the button and ⌘/Ctrl+Enter), the three validation errors, and the price parser
// ("79", "79,50", "1.250", "1.250,50"). Writes to its own user, reseeded around every test.
const TODAY_NOON = "2026-10-14T10:00:00.000Z"; // 14 Oct 2026, noon in Copenhagen (CEST)

test.describe("flow 2: add", () => {
  test.beforeEach(async ({ login }) => {
    await seed("writerAdd");
    await login("writerAdd");
  });
  test.afterAll(() => seed("writerAdd"));

  async function added(name: string) {
    const row = (await subscriptionsOf("writerAdd")).find((s) => s.name === name);
    expect(row, `${name} saved`).toBeTruthy();
    return row!;
  }

  test.describe("mobile sheet", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("validation errors, then '79' saves", async ({ page }) => {
      await open(page, "/");
      await mobile.addButton(page).click();
      const sheet = mobile.sheet(page);
      await expect(sheet.getByRole("heading", { name: "New subscription" })).toBeVisible();

      await sheet.getByRole("button", { name: "Save" }).click();
      await expect(sheet.getByRole("alert")).toHaveText("Give the subscription a name.");

      await sheet.getByLabel("Name").fill("Parity price 79");
      await sheet.getByLabel("Price in kroner").fill("79 kroner");
      await sheet.getByRole("button", { name: "Save" }).click();
      await expect(sheet.getByRole("alert")).toHaveText("Enter a price, like 79 or 79,50.");

      await sheet.getByLabel("Price in kroner").fill("79");
      const stopBlanking = await blankBilledAtOnSave(page);
      await sheet.getByRole("button", { name: "Save" }).click();
      await expect(sheet.getByRole("alert")).toHaveText("Pick the date of the next charge.");
      await stopBlanking();
      expect((await subscriptionsOf("writerAdd")).length).toBe(12);

      await sheet.getByRole("button", { name: "Save" }).click();
      await expect(sheet).toBeHidden();
      await expect(mobile.row(page, "Parity price 79")).toHaveAccessibleName("Parity price 79, Today, 79 kr every month");

      const row = await added("Parity price 79");
      expect(row.price).toBe("79.00");
      expect(row.interval).toBe("month");
      expect(row.billed_at.toISOString()).toBe(TODAY_NOON);
      // Mobile defaults new subscriptions to the first category.
      expect(row.category_id).not.toBeNull();
    });
  });

  test("desktop: button, '79,50', saved with the button", async ({ page }) => {
    await open(page, "/");
    await desktop.addButton(page).click();
    const panel = desktop.inspector(page, "New subscription");
    await expect(panel.getByLabel("Name")).toBeFocused();
    await panel.getByLabel("Name").fill("Parity price 79,50");
    await panel.getByLabel("Price").fill("79,50");
    await panel.getByRole("button", { name: /^Add subscription/ }).click();

    // The new row is selected and shown in the inspector.
    await expect(desktop.inspector(page, "Parity price 79,50")).toBeVisible();
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Parity price 79,50, no category, Today, 79,50 kr/);
    const row = await added("Parity price 79,50");
    expect(row.price).toBe("79.50");
    expect(row.category_id).toBeNull();
    await expect(page).toHaveURL(new RegExp(`\\?s=${row.id}$`));
  });

  test("desktop: N, '1.250', saved with ⌘/Ctrl+Enter", async ({ page }) => {
    await open(page, "/");
    await page.keyboard.press("n");
    const panel = desktop.inspector(page, "New subscription");
    await expect(panel.getByLabel("Name")).toBeFocused();
    await page.keyboard.type("Parity price 1.250");
    await panel.getByRole("radiogroup", { name: /Category/ }).getByText("Transport").click();
    await panel.getByLabel("Price").fill("1.250");
    await panel.getByLabel("Price").press("ControlOrMeta+Enter");

    await expect(desktop.inspector(page, "Parity price 1.250")).toBeVisible();
    const row = await added("Parity price 1.250");
    expect(row.price).toBe("1250.00");
    expect(row.category_id).toBe("c9a35299-a72b-4f3d-87f1-ea93cd4b1a33");
  });

  test("desktop: button, '1.250,50' yearly on a picked date, saved with ⌘/Ctrl+Enter", async ({ page }) => {
    await open(page, "/");
    await desktop.addButton(page).click();
    const panel = desktop.inspector(page, "New subscription");
    await panel.getByLabel("Name").fill("Parity price 1.250,50");
    await panel.getByLabel("Price").fill("1.250,50");
    await panel.getByRole("radiogroup", { name: "Interval" }).getByText("Yearly").click();
    await panel.getByRole("button", { name: /^Next charge/ }).click();
    await page.getByRole("gridcell", { name: "20", exact: true }).click();
    // Hotkeys wait while a popover is open (or still closing).
    await expect(page.getByRole("grid")).toBeHidden();
    await expect(panel.getByRole("button", { name: /^Next charge/ })).toHaveAccessibleName("Next charge 20 Oct 2026");
    await page.keyboard.press("ControlOrMeta+Enter");

    await expect(desktop.inspector(page, "Parity price 1.250,50")).toBeVisible();
    const row = await added("Parity price 1.250,50");
    expect(row.price).toBe("1250.50");
    expect(row.interval).toBe("year");
    expect(row.billed_at.toISOString()).toBe("2026-10-20T10:00:00.000Z"); // noon in Copenhagen
  });

  test("desktop: N doesn't fire while typing in a field", async ({ page }) => {
    await open(page, "/");
    await page.keyboard.press("n");
    const name = desktop.inspector(page, "New subscription").getByLabel("Name");
    await expect(name).toBeFocused();
    await page.keyboard.type("nnn");
    await expect(name).toHaveValue("nnn");
  });
});
