import { loginAs } from "../../support/auth";
import { seed } from "../../support/db";
import { BASE_URL, FIXED_TIME, LOCALE, SUBS, TIME_ZONE } from "../../support/env";
import { expect, open, test } from "../../support/fixtures";
import { desktop } from "../../support/app";

// Flow 12: Realtime. A change made in a second browser context appears in the first without a
// reload. New behaviour that the Expo web app adds (spec §12A.5 deviation 4); the Next app has
// no Realtime subscription, so this is skipped for target=next and must pass for target=expo.
test.describe("flow 12: realtime", () => {
  test.beforeEach(() => seed("realtime"));
  test.afterAll(() => seed("realtime"));

  test("a rename in another session shows up without a reload", async ({ target, login, page, browser }) => {
    test.skip(target === "next", "apps/web (Next) has no Realtime subscription; this flow is new in the Expo app");

    await login("realtime");
    await open(page, "/");
    await expect(desktop.row(page, SUBS.claude.name)).toBeVisible();

    const other = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1440, height: 900 },
      locale: LOCALE,
      timezoneId: TIME_ZONE,
      reducedMotion: "reduce",
    });
    try {
      await loginAs(other, "realtime");
      const second = await other.newPage();
      await second.clock.setFixedTime(new Date(FIXED_TIME));
      await open(second, "/");
      await desktop.row(second, SUBS.claude.name).click();
      await second.keyboard.press("e");
      await desktop.inspector(second, "Edit subscription").getByLabel("Name").fill("Claude Max");
      await second.keyboard.press("ControlOrMeta+Enter");
      await expect(desktop.inspector(second, "Claude Max")).toBeVisible();

      await expect(desktop.row(page, "Claude Max")).toBeVisible({ timeout: 10_000 });
    } finally {
      await other.close();
    }
  });
});
