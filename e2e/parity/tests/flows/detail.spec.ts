import { SUBS } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop, mobile } from "../../support/app";

// Flow 5: detail with upcoming charges and the charge timeline; a month-end anchor
// (31 Jan) keeps to the month's end: … 31 Jan → 28 Feb → 31 Mar. Read-only.
test.describe("flow 5: detail", () => {
  test.beforeEach(async ({ login }) => {
    await login("populated");
  });

  test("desktop: six upcoming charges from a 31st anchor", async ({ page }) => {
    await open(page, "/");
    await desktop.row(page, SUBS.dsb.name).click();
    const inspector = desktop.inspector(page, SUBS.dsb.name);
    await expect(inspector.getByText("next 6")).toBeVisible();
    await expect(inspector.getByRole("listitem")).toHaveText([
      "Sat 31 Oct1.250 kr",
      "Mon 30 Nov1.250 kr",
      "Thu 31 Dec1.250 kr",
      "Sun 31 Jan 20271.250 kr",
      "Sun 28 Feb 20271.250 kr",
      "Wed 31 Mar 20271.250 kr",
    ]);
    await expect(inspector.getByText("every month · 15.000 kr a year")).toBeVisible();
    // Tracking since 20 Jan 2026; charges on the 31 Jan … 30 Sep schedule up to yesterday: 9.
    await expect(inspector.getByRole("definition").first()).toHaveText("Jan 2026");
    await expect(inspector.getByRole("definition").nth(1)).toHaveText("≈ 11.250 kr");
  });

  test("desktop: a charge due today and a weekly one", async ({ page }) => {
    await open(page, "/");
    await desktop.row(page, SUBS.netflix.name).click();
    await expect(desktop.inspector(page, SUBS.netflix.name).getByRole("listitem").first()).toHaveText("Wed 14 OctToday");

    await desktop.row(page, SUBS.fitness.name).click();
    await expect(desktop.inspector(page, SUBS.fitness.name).getByRole("listitem")).toHaveText([
      "Thu 15 OctTomorrow",
      "Thu 22 Oct69 kr",
      "Thu 29 Oct69 kr",
      "Thu 5 Nov69 kr",
      "Thu 12 Nov69 kr",
      "Thu 19 Nov69 kr",
    ]);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("detail sheet: three upcoming charges, yearly equivalent", async ({ page }) => {
      await open(page, "/");
      await mobile.row(page, SUBS.dsb.name).click();
      const sheet = mobile.sheet(page);
      await expect(sheet.getByRole("listitem")).toHaveText(["Sat 31 Oct1.250 kr", "Mon 30 Nov1.250 kr", "Thu 31 Dec1.250 kr"]);

      await sheet.getByRole("button", { name: "Close" }).click();
      await mobile.row(page, SUBS.adobe.name).click();
      await expect(sheet.getByText("every year · 358 kr a month")).toBeVisible();
      await expect(sheet.getByRole("listitem").first()).toHaveText("Mon 25 Jan 20274.299,50 kr");
    });
  });
});
