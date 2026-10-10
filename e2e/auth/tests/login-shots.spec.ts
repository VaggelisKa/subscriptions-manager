import path from "node:path";
import { expect, test } from "@playwright/test";
import { SHOTS_DIR, createUser, deleteUserByEmail } from "../support";

// Screenshots of the new login (password + "Email me a code") and its code step for Evangelos'
// design sign-off (plan §7). Not a baseline and not compared: written to AUTH_SHOTS_DIR as
// login--<width>-<theme>.png and code--<width>-<theme>.png.

const sizes = [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
] as const;
const themes = ["light", "dark"] as const;

// Short, so the subtitle reads like a real one.
const email = "you@parity.test";
test.beforeAll(async () => {
  await deleteUserByEmail(email);
  await createUser(email);
});
test.afterAll(async () => {
  await deleteUserByEmail(email);
});

for (const { width, height } of sizes) {
  for (const theme of themes) {
    test(`login and code step at ${width} ${theme}`, async ({ page }) => {
      if (!SHOTS_DIR) throw new Error("AUTH_SHOTS_DIR is not set");
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });

      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Email me a code" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(SHOTS_DIR, `login--${width}-${theme}.png`) });

      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Email me a code" }).click();
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
      // The code field autofocuses; hide the caret so shots don't depend on its blink.
      await page.addStyleTag({ content: "* { caret-color: transparent !important; }" });
      await page.screenshot({ path: path.join(SHOTS_DIR, `code--${width}-${theme}.png`) });
    });
  }
}
