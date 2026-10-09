import { SUBS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile, pickSegment } from "../../support/app";

// Flow 6: insights: period switch, category expand/collapse, open a detail from insights and
// come back (Esc on desktop, closing the sheet on mobile) to the same insights view. Read-only.
//
// Per month (weekly ×52/12, yearly ÷12): 5.468,875 kr → "5.469"; per week ×12/52 → "1.262";
// per year → "65.627".
test.describe("flow 6: insights", () => {
  test.beforeEach(async ({ login }) => {
    await login("populated");
  });

  test("desktop: period switch, expand, detail and Esc back", async ({ page }) => {
    await open(page, "/");
    await desktop.insightsButton(page).first().click();
    await expect(desktop.insightsButton(page).first()).toHaveAttribute("aria-pressed", "true");
    const panel = desktop.inspector(page, "Insights");

    await expect(panel.getByText("Spend per month")).toBeVisible();
    await expect(panel.getByText(/^5\.469 kr$/)).toBeVisible();
    await pickSegment(page, "Period", "Week");
    await expect(panel.getByText(/^1\.262 kr$/)).toBeVisible();
    await pickSegment(page, "Period", "Year");
    await expect(panel.getByText(/^65\.627 kr$/)).toBeVisible();

    const entertainment = panel.getByRole("button", { name: /^Entertainment/ });
    await expect(entertainment).toHaveAttribute("aria-expanded", "false");
    await entertainment.click();
    await expect(entertainment).toHaveAttribute("aria-expanded", "true");
    const rows = panel.getByRole("button", { name: /, .* kr every / });
    await expect(rows).toHaveCount(3);
    await entertainment.click();
    await expect(rows).toHaveCount(0);
    await entertainment.click();

    await panel.getByRole("button", { name: /^Netflix,/ }).click();
    const detail = desktop.inspector(page, SUBS.netflix.name);
    await expect(detail.getByRole("button", { name: "Insights" })).toBeVisible();
    await page.keyboard.press("Escape");
    // Same view: still per year, Entertainment still open.
    await expect(panel.getByText("Spend per year")).toBeVisible();
    await expect(entertainment).toHaveAttribute("aria-expanded", "true");

    await desktop.insightsButton(page).first().click();
    await expect(panel).toBeHidden();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("sheet: period switch, expand, detail and back", async ({ page }) => {
      await open(page, "/");
      await mobile.insightsButton(page).click();
      const sheet = mobile.sheet(page);
      await expect(sheet.getByRole("heading", { name: "Insights" })).toBeVisible();
      await pickSegment(page, "Period", "Week");
      await expect(sheet.getByText("Spend per week")).toBeVisible();
      await sheet.getByRole("button", { name: /^Health and Fitness/ }).click();
      await sheet.getByRole("button", { name: /^Fitness World,/ }).click();
      await expect(sheet.getByRole("heading", { name: "Insights" })).toBeHidden();
      await expect(sheet.getByText("every week · 3.588 kr a year")).toBeVisible();

      await sheet.getByRole("button", { name: "Close" }).click();
      await expect(sheet.getByRole("heading", { name: "Insights" })).toBeVisible();
      await expect(sheet.getByText("Spend per week")).toBeVisible();
    });
  });
});
