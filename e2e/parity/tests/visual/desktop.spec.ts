import type { Page } from "@playwright/test";
import { at, expect, open, test } from "../../support/fixtures";
import { blankBilledAtOnSave, desktop, pickSegment } from "../../support/app";
import { SUBS } from "../../support/env";

// Desktop (≥ 1024) and wide (≥ 1440, overview rail beside the inspector), spec §12A.1 and the
// hotkey states of §12A.3.
const DESKTOP = at(1024, 1440);

async function select(page: Page, name: string) {
  await desktop.row(page, name).click();
  await expect(desktop.inspector(page, name)).toBeVisible();
}

test.describe("desktop", () => {
  test.beforeEach(async ({ login, page }) => {
    await login("populated");
    await open(page, "/");
    await expect(desktop.ledger(page)).toBeVisible();
  });

  test("home: top bar, overview rail, ledger", DESKTOP, async ({ page, shot }) => {
    await shot("desktop", "home");
  });

  test("ledger: sort menu open", DESKTOP, async ({ page, shot }) => {
    await desktop.sortButton(page).click();
    await expect(page.getByRole("menuitemradio", { name: "Price" })).toBeVisible();
    await shot("desktop", "sort-menu");
  });

  test("ledger: sorted by price", DESKTOP, async ({ page, shot }) => {
    await desktop.sortButton(page).click();
    await page.getByRole("menuitemradio", { name: "Price" }).click();
    await expect(desktop.sortButton(page)).toHaveText(/Price/);
    await shot("desktop", "sort-price");
  });

  test("ledger: sorted by name", DESKTOP, async ({ page, shot }) => {
    await desktop.sortButton(page).click();
    await page.getByRole("menuitemradio", { name: "Name" }).click();
    await expect(desktop.sortButton(page)).toHaveText(/Name/);
    await shot("desktop", "sort-name");
  });

  test("month calendar: day filter applied", DESKTOP, async ({ page, shot }) => {
    await desktop.calendarDay(page, "Thu 15 Oct").click();
    await expect(page.getByRole("button", { name: /^Clear filter: Thu 15 Oct, 2 charges/ })).toBeVisible();
    await shot("desktop", "day-filter");
  });

  test("inspector: detail", DESKTOP, async ({ page, shot }) => {
    await select(page, SUBS.netflix.name);
    await shot("desktop", "detail");
  });

  test("inspector: detail, month-end anchor (31 Jan → 28 Feb → 31 Mar)", DESKTOP, async ({ page, shot }) => {
    await select(page, SUBS.dsb.name);
    await expect(desktop.inspector(page, SUBS.dsb.name).getByText("Sun 28 Feb 2027")).toBeVisible();
    await shot("desktop", "detail-month-end");
  });

  test("inspector: detail, long name without category", DESKTOP, async ({ page, shot }) => {
    await select(page, SUBS.allotment.name);
    await shot("desktop", "detail-long-name");
  });

  test("inspector: delete confirm", DESKTOP, async ({ page, shot }) => {
    await select(page, SUBS.netflix.name);
    await desktop.inspector(page, SUBS.netflix.name).getByRole("button", { name: "Delete subscription" }).click();
    await expect(page.getByText("Delete “Netflix”?")).toBeVisible();
    await shot("desktop", "detail-delete-confirm");
  });

  test("inspector: add", DESKTOP, async ({ page, shot }) => {
    await desktop.addButton(page).click();
    await expect(desktop.inspector(page, "New subscription")).toBeVisible();
    await shot("desktop", "add");
  });

  test("inspector: add, filled with category chip", DESKTOP, async ({ page, shot }) => {
    await desktop.addButton(page).click();
    const panel = desktop.inspector(page, "New subscription");
    await panel.getByLabel("Name").fill("Lokal Bageri");
    await panel.getByRole("radiogroup", { name: /Category/ }).getByText("Health and Fitness").click();
    await panel.getByLabel("Price").fill("1.250,50");
    await pickSegment(page, "Interval", "Weekly");
    await shot("desktop", "add-filled");
  });

  test("inspector: add, date popover open", DESKTOP, async ({ page, shot }) => {
    await desktop.addButton(page).click();
    await desktop.inspector(page, "New subscription").getByRole("button", { name: /^Next charge/ }).click();
    await expect(page.getByRole("grid")).toBeVisible();
    await shot("desktop", "add-date-popover");
  });

  test("inspector: add, name required", DESKTOP, async ({ page, shot }) => {
    await desktop.addButton(page).click();
    const panel = desktop.inspector(page, "New subscription");
    await panel.getByRole("button", { name: /^Add subscription/ }).click();
    await expect(panel.getByText("Give the subscription a name.")).toBeVisible();
    await shot("desktop", "add-error-name");
  });

  test("inspector: add, bad price", DESKTOP, async ({ page, shot }) => {
    await desktop.addButton(page).click();
    const panel = desktop.inspector(page, "New subscription");
    await panel.getByLabel("Name").fill("Lokal Bageri");
    await panel.getByLabel("Price").fill("79 kroner");
    await panel.getByRole("button", { name: /^Add subscription/ }).click();
    await expect(panel.getByText("Enter a price, like 79 or 79,50.")).toBeVisible();
    await shot("desktop", "add-error-price");
  });

  test("inspector: add, missing date", DESKTOP, async ({ page, shot }) => {
    await blankBilledAtOnSave(page);
    await desktop.addButton(page).click();
    const panel = desktop.inspector(page, "New subscription");
    await panel.getByLabel("Name").fill("Lokal Bageri");
    await panel.getByLabel("Price").fill("79");
    await panel.getByRole("button", { name: /^Add subscription/ }).click();
    await expect(panel.getByText("Pick the date of the next charge.")).toBeVisible();
    await shot("desktop", "add-error-date");
  });

  test("inspector: edit", DESKTOP, async ({ page, shot }) => {
    await select(page, SUBS.electricity.name);
    await desktop.inspector(page, SUBS.electricity.name).getByRole("button", { name: "Edit" }).click();
    await expect(desktop.inspector(page, "Edit subscription")).toBeVisible();
    await shot("desktop", "edit");
  });

  test("inspector: edit, delete confirm", DESKTOP, async ({ page, shot }) => {
    await select(page, SUBS.electricity.name);
    await desktop.inspector(page, SUBS.electricity.name).getByRole("button", { name: "Edit" }).click();
    await desktop.inspector(page, "Edit subscription").getByRole("button", { name: "Delete subscription" }).click();
    await expect(page.getByText("Delete “Ørsted Electricity”?")).toBeVisible();
    await shot("desktop", "edit-delete-confirm");
  });

  test("inspector: insights", DESKTOP, async ({ page, shot }) => {
    await desktop.insightsButton(page).click();
    await expect(desktop.inspector(page, "Insights")).toBeVisible();
    await shot("desktop", "insights");
  });

  test("inspector: insights, week, category expanded", DESKTOP, async ({ page, shot }) => {
    await desktop.insightsButton(page).click();
    const panel = desktop.inspector(page, "Insights");
    await pickSegment(page, "Period", "Week");
    await panel.getByRole("button", { name: /^Entertainment/ }).click();
    await expect(panel.getByText("Spend per week")).toBeVisible();
    await shot("desktop", "insights-week-expanded");
  });

  test("inspector: detail opened from insights", DESKTOP, async ({ page, shot }) => {
    await desktop.insightsButton(page).click();
    const panel = desktop.inspector(page, "Insights");
    await panel.getByRole("button", { name: /^Entertainment/ }).click();
    await panel.getByRole("button", { name: /^Netflix,/ }).click();
    await expect(desktop.inspector(page, SUBS.netflix.name).getByRole("button", { name: "Insights" })).toBeVisible();
    await shot("desktop", "detail-from-insights");
  });

  test("account menu open (system)", DESKTOP, async ({ page, shot }) => {
    await desktop.accountButton(page).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await shot("desktop", "account-menu");
  });

  for (const theme of ["Light", "Dark"]) {
    test(`account menu: ${theme} picked`, DESKTOP, async ({ page, shot }) => {
      await desktop.accountButton(page).click();
      await pickSegment(page, "Appearance", theme);
      await expect(page.locator("html")).toHaveClass(new RegExp(theme === "Dark" ? "\\bdark\\b" : "\\blight\\b"));
      await shot("desktop", `account-menu-${theme.toLowerCase()}`);
    });
  }
});

test.describe("desktop hotkeys", () => {
  test.beforeEach(async ({ login, page }) => {
    await login("populated");
    await open(page, "/");
    await expect(desktop.ledger(page)).toBeVisible();
  });

  test("N opens add", DESKTOP, async ({ page, shot }) => {
    await page.keyboard.press("n");
    await expect(desktop.inspector(page, "New subscription").getByLabel("Name")).toBeFocused();
    await shot("desktop", "hotkey-n");
  });

  test("↓ selects the first row, ↓ the next, ↑ goes back", DESKTOP, async ({ page, shot }) => {
    await page.keyboard.press("ArrowDown");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Netflix,/);
    await shot("desktop", "hotkey-down");
    await page.keyboard.press("ArrowDown");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Fitness World,/);
    await shot("desktop", "hotkey-down-down");
    await page.keyboard.press("ArrowUp");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Netflix,/);
    await shot("desktop", "hotkey-up");
  });

  test("E edits the selected row", DESKTOP, async ({ page, shot }) => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("e");
    await expect(desktop.inspector(page, "Edit subscription")).toBeVisible();
    await shot("desktop", "hotkey-e");
    await page.keyboard.press("Escape");
    await expect(desktop.inspector(page, SUBS.netflix.name)).toBeVisible();
    await shot("desktop", "hotkey-esc-edit-to-detail");
  });

  for (const key of ["Backspace", "Delete"]) {
    test(`${key} opens the delete confirm, Esc steps back to detail, then closes`, DESKTOP, async ({ page, shot }) => {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press(key);
      await expect(page.getByText("Delete “Netflix”?")).toBeVisible();
      await shot("desktop", `hotkey-${key.toLowerCase()}`);
      if (key !== "Backspace") return;
      await page.keyboard.press("Escape");
      await expect(page.getByText("Delete “Netflix”?")).toBeHidden();
      await expect(desktop.inspector(page, SUBS.netflix.name)).toBeVisible();
      await shot("desktop", "hotkey-esc-confirm-to-detail");
      await page.keyboard.press("Escape");
      await expect(desktop.inspector(page, SUBS.netflix.name)).toBeHidden();
      await shot("desktop", "hotkey-esc-detail-to-closed");
    });
  }

  test("Esc from a detail opened in insights goes back to insights", DESKTOP, async ({ page, shot }) => {
    await desktop.insightsButton(page).click();
    const panel = desktop.inspector(page, "Insights");
    await panel.getByRole("button", { name: /^Entertainment/ }).click();
    await panel.getByRole("button", { name: /^Netflix,/ }).click();
    await expect(desktop.inspector(page, SUBS.netflix.name)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(desktop.inspector(page, "Insights")).toBeVisible();
    await shot("desktop", "hotkey-esc-detail-to-insights");
  });

  test("⌘/Ctrl+Enter submits the add form (here: name required)", DESKTOP, async ({ page, shot }) => {
    await page.keyboard.press("n");
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(desktop.inspector(page, "New subscription").getByText("Give the subscription a name.")).toBeVisible();
    await shot("desktop", "hotkey-mod-enter");
  });
});

test.describe("desktop empty account", () => {
  test.beforeEach(async ({ login, page }) => {
    await login("empty");
    await open(page, "/");
  });

  test("empty: add form open beside it", DESKTOP, async ({ page, shot }) => {
    await expect(desktop.inspector(page, "New subscription")).toBeVisible();
    await shot("desktop", "empty");
  });

  test("empty: form closed", DESKTOP, async ({ page, shot }) => {
    await desktop.inspector(page, "New subscription").getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Add subscription", exact: true })).toBeVisible();
    await shot("desktop", "empty-form-closed");
  });
});
