import { at, expect, open, ready, test } from "../../support/fixtures";

// Auth (spec §12A.1): login empty / filled / submitting / error, and "Check your email".
// Signed out, at every width.
const ALL = at(375, 1024, 1440);

test.describe("auth", () => {
  test("login: empty", ALL, async ({ page, shot }) => {
    await open(page, "/login");
    await shot("auth", "login-empty");
  });

  test("login: filled", ALL, async ({ page, shot }) => {
    await open(page, "/login");
    await page.getByPlaceholder("Email").fill("populated@parity.test");
    await shot("auth", "login-filled");
  });

  test("login: submitting", ALL, async ({ page, shot }) => {
    await open(page, "/login");
    // Hold the server action so the pending state stays up (no email is sent).
    await page.route("**/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await new Promise(() => {});
    });
    await page.getByPlaceholder("Email").fill("populated@parity.test");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("button", { name: "Sending link…" })).toBeDisabled();
    await shot("auth", "login-submitting");
  });

  test("login: error", ALL, async ({ page, shot }) => {
    await open(page, "/login");
    // Valid for the browser's type=email check, rejected by the server action's regex.
    await page.getByPlaceholder("Email").fill("someone@localhost");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await shot("auth", "login-error");
  });

  test("check your email", ALL, async ({ page, shot }) => {
    await page.goto("/login/confirmation");
    await ready(page);
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await shot("auth", "check-email");
  });
});
