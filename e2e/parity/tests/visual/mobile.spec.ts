import { at, expect, open, scrollToTop, test } from "../../support/fixtures";
import { blankBilledAtOnSave, mobile, pickSegment } from "../../support/app";
import { SUBS } from "../../support/env";

// Home and sheets below 1024 px (spec §12A.1 "Home, mobile", "Sheets (mobile)", "Forms", "Brands").
const MOBILE = at(375);

test.describe("mobile home", () => {
  test.beforeEach(async ({ login, page }) => {
    await login("populated");
    await open(page, "/");
  });

  test("home: toolbar, summary, day strip, timeline buckets, brand and monogram tiles", MOBILE, async ({ page, shot }) => {
    await expect(page.getByRole("heading", { name: "Next 7 days" })).toBeVisible();
    await shot("mobile", "home", { fullPage: true });
  });

  test("toolbar menu open (system theme)", MOBILE, async ({ page, shot }) => {
    await mobile.menuButton(page).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await shot("mobile", "toolbar-menu");
  });

  test("toolbar menu open after picking a theme (Match system shown)", MOBILE, async ({ page, shot }) => {
    await mobile.menuButton(page).click();
    await page.getByRole("menuitem", { name: /mode$/ }).click();
    await mobile.menuButton(page).click();
    await expect(page.getByRole("menuitem", { name: "Match system" })).toBeVisible();
    await shot("mobile", "toolbar-menu-theme-set");
  });
});

test.describe("mobile sheets", () => {
  test.beforeEach(async ({ login, page }) => {
    await login("populated");
    await open(page, "/");
  });

  test("detail: due today", MOBILE, async ({ page, shot }) => {
    await mobile.row(page, SUBS.netflix.name).click();
    await expect(mobile.sheet(page).getByText("Upcoming charges")).toBeVisible();
    await shot("mobile", "detail");
  });

  test("detail: month-end anchor, monogram tile", MOBILE, async ({ page, shot }) => {
    await mobile.row(page, SUBS.dsb.name).click();
    await expect(mobile.sheet(page).getByText("Sat 31 Oct")).toBeVisible();
    await shot("mobile", "detail-month-end");
  });

  test("detail: delete confirm", MOBILE, async ({ page, shot }) => {
    await mobile.row(page, SUBS.netflix.name).click();
    await mobile.sheet(page).getByRole("button", { name: "Delete subscription" }).click();
    await expect(mobile.sheet(page).getByText("Delete “Netflix”?")).toBeVisible();
    await shot("mobile", "detail-delete-confirm");
  });

  test("add form", MOBILE, async ({ page, shot }) => {
    await mobile.addButton(page).click();
    await expect(mobile.sheet(page).getByText("New subscription").first()).toBeVisible();
    await shot("mobile", "add");
  });

  test("add form: category dropdown open", MOBILE, async ({ page, shot }) => {
    await mobile.addButton(page).click();
    await mobile.sheet(page).getByRole("button", { name: /^Category/ }).click();
    await expect(page.getByRole("menuitemradio", { name: "Transport" })).toBeVisible();
    await shot("mobile", "add-category-menu");
  });

  test("add form: date popover open", MOBILE, async ({ page, shot }) => {
    await mobile.addButton(page).click();
    await mobile.sheet(page).getByRole("button", { name: /^Next charge/ }).click();
    await expect(page.getByRole("grid")).toBeVisible();
    await shot("mobile", "add-date-popover");
  });

  test("add form: name required", MOBILE, async ({ page, shot }) => {
    await mobile.addButton(page).click();
    await mobile.sheet(page).getByRole("button", { name: "Save" }).click();
    await expect(mobile.sheet(page).getByText("Give the subscription a name.")).toBeVisible();
    await shot("mobile", "add-error-name");
  });

  test("add form: bad price", MOBILE, async ({ page, shot }) => {
    await mobile.addButton(page).click();
    await mobile.sheet(page).getByLabel("Name").fill("Lokal Bageri");
    await mobile.sheet(page).getByLabel("Price in kroner").fill("79 kroner");
    await mobile.sheet(page).getByRole("button", { name: "Save" }).click();
    await expect(mobile.sheet(page).getByText("Enter a price, like 79 or 79,50.")).toBeVisible();
    await shot("mobile", "add-error-price");
  });

  test("add form: missing date", MOBILE, async ({ page, shot }) => {
    await blankBilledAtOnSave(page);
    await mobile.addButton(page).click();
    await mobile.sheet(page).getByLabel("Name").fill("Lokal Bageri");
    await mobile.sheet(page).getByLabel("Price in kroner").fill("79,50");
    await mobile.sheet(page).getByRole("button", { name: "Save" }).click();
    await expect(mobile.sheet(page).getByText("Pick the date of the next charge.")).toBeVisible();
    await shot("mobile", "add-error-date");
  });

  test("edit form", MOBILE, async ({ page, shot }) => {
    await mobile.row(page, SUBS.electricity.name).click();
    await mobile.sheet(page).getByRole("button", { name: "Edit" }).click();
    await expect(mobile.sheet(page).getByText("Edit subscription").first()).toBeVisible();
    await shot("mobile", "edit");
  });

  test("edit form: delete confirm", MOBILE, async ({ page, shot }) => {
    await mobile.row(page, SUBS.electricity.name).click();
    await mobile.sheet(page).getByRole("button", { name: "Edit" }).click();
    await mobile.sheet(page).getByRole("button", { name: "Delete subscription" }).click();
    await expect(mobile.sheet(page).getByText("Delete “Ørsted Electricity”?")).toBeVisible();
    await shot("mobile", "edit-delete-confirm");
  });

  test("insights: month", MOBILE, async ({ page, shot }) => {
    await mobile.insightsButton(page).click();
    await expect(mobile.sheet(page).getByText("Spend per month")).toBeVisible();
    await shot("mobile", "insights");
  });

  test("insights: week", MOBILE, async ({ page, shot }) => {
    await mobile.insightsButton(page).click();
    await pickSegment(page, "Period", "Week");
    await expect(mobile.sheet(page).getByText("Spend per week")).toBeVisible();
    await scrollToTop(mobile.sheet(page));
    await shot("mobile", "insights-week");
  });

  test("insights: year", MOBILE, async ({ page, shot }) => {
    await mobile.insightsButton(page).click();
    await pickSegment(page, "Period", "Year");
    await expect(mobile.sheet(page).getByText("Spend per year")).toBeVisible();
    await scrollToTop(mobile.sheet(page));
    await shot("mobile", "insights-year");
  });

  test("insights: category expanded", MOBILE, async ({ page, shot }) => {
    await mobile.insightsButton(page).click();
    await mobile.sheet(page).getByRole("button", { name: /^Entertainment/ }).click();
    await expect(mobile.sheet(page).getByRole("button", { name: /^Entertainment/ })).toHaveAttribute("aria-expanded", "true");
    await scrollToTop(mobile.sheet(page));
    await shot("mobile", "insights-expanded");
  });
});

test.describe("mobile empty account", () => {
  test("empty state", MOBILE, async ({ login, page, shot }) => {
    await login("empty");
    await open(page, "/");
    await expect(page.getByRole("heading", { name: "Track your first subscription" })).toBeVisible();
    await shot("mobile", "empty", { fullPage: true });
  });

  test("empty state: quick add opens a prefilled form", MOBILE, async ({ login, page, shot }) => {
    await login("empty");
    await open(page, "/");
    await page.getByRole("button", { name: "Add Netflix" }).click();
    await expect(mobile.sheet(page).getByLabel("Name")).toHaveValue("Netflix");
    await shot("mobile", "empty-quick-add");
  });
});
