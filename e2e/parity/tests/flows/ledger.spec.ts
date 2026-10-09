import type { Page } from "@playwright/test";
import { SUBS, subscriptionId, USERS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop } from "../../support/app";

// Flow 7: desktop ledger: sort by next charge / price / name, the month-calendar day filter on
// and off, ↑/↓ selection. Read-only.
async function ledgerNames(page: Page) {
  const labels = await desktop.ledger(page).getByRole("listitem").getByRole("button").evaluateAll((buttons) =>
    buttons.map((b) => b.getAttribute("aria-label") ?? ""),
  );
  return labels.map((label) => label.split(",")[0]);
}

async function sortBy(page: Page, option: string) {
  await desktop.sortButton(page).click();
  await page.getByRole("menuitemradio", { name: option }).click();
  await expect(desktop.sortButton(page)).toHaveText(new RegExp(option));
}

const S = SUBS;

test.describe("flow 7: ledger", () => {
  test.beforeEach(async ({ login, page }) => {
    await login("populated");
    await open(page, "/");
  });

  test("sorts: next charge (bucketed), price per month, name", async ({ page }) => {
    await expect(desktop.ledger(page).getByRole("heading")).toHaveText(["Next 7 days", "Later this month", "Later"]);
    await expect.poll(() => ledgerNames(page)).toEqual([
      S.netflix.name, S.fitness.name, S.photon.name, S.spotify.name, S.electricity.name,
      S.duolingo.name, S.dsb.name,
      S.accountant.name, S.claude.name, S.podcast.name, S.adobe.name, S.allotment.name,
    ]);

    await sortBy(page, "Price");
    await expect(desktop.ledger(page).getByRole("heading")).toHaveCount(0);
    await expect.poll(() => ledgerNames(page)).toEqual([
      S.accountant.name, S.dsb.name, S.electricity.name, S.adobe.name, S.fitness.name, S.spotify.name,
      S.claude.name, S.netflix.name, S.duolingo.name, S.photon.name, S.allotment.name, S.podcast.name,
    ]);

    await sortBy(page, "Name");
    await expect.poll(() => ledgerNames(page)).toEqual([
      S.accountant.name, S.adobe.name, S.claude.name, S.dsb.name, S.duolingo.name, S.fitness.name,
      S.allotment.name, S.netflix.name, S.electricity.name, S.photon.name, S.podcast.name, S.spotify.name,
    ]);

    await sortBy(page, "Next charge");
    await expect.poll(async () => (await ledgerNames(page))[0]).toBe(S.netflix.name);
  });

  test("month calendar: a 2-charge day filters, the chip and Esc clear it; a 1-charge day opens it", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
    await desktop.calendarDay(page, "Thu 15 Oct").click();
    const chip = page.getByRole("button", { name: "Clear filter: Thu 15 Oct, 2 charges" });
    await expect(chip).toHaveText("Thu 15 Oct · 2 charges");
    await expect(desktop.calendarDay(page, "Thu 15 Oct")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => ledgerNames(page)).toEqual([S.fitness.name, S.photon.name]);

    await chip.click();
    await expect.poll(() => ledgerNames(page)).toHaveLength(12);

    await desktop.calendarDay(page, "Thu 15 Oct").click();
    await expect(chip).toBeVisible();
    // Focus off the calendar, so Esc reaches the window.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Escape");
    await expect(chip).toBeHidden();
    await expect.poll(() => ledgerNames(page)).toHaveLength(12);

    await desktop.calendarDay(page, "Tue 20 Oct").click();
    await expect(desktop.inspector(page, S.electricity.name)).toBeVisible();
  });

  test("↓/↑ move the selection in ledger order and mirror it to ?s=", async ({ page }) => {
    await page.keyboard.press("ArrowDown");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Netflix,/);
    await expect(page).toHaveURL(new RegExp(`\\?s=${subscriptionId(USERS.populated, S.netflix.n)}$`));
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Photon Cloud Backup,/);
    await page.keyboard.press("ArrowUp");
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Fitness World,/);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp"); // already at the top: stays
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Netflix,/);

    // The inspector's own buttons step too.
    await desktop.inspector(page, S.netflix.name).getByRole("button", { name: "Next subscription" }).click();
    await expect(desktop.selectedRow(page)).toHaveAccessibleName(/^Fitness World,/);
  });

  test("hotkeys are ignored while a menu is open", async ({ page }) => {
    await desktop.sortButton(page).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("n");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(desktop.inspector(page, "New subscription")).toHaveCount(0);
  });
});
