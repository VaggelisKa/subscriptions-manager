import { expect, test, type Page } from "@playwright/test";
import {
  PASSWORD,
  SESSION_KEY,
  anon,
  codeFor,
  createUser,
  deleteUserByEmail,
  emailCount,
  throwawayEmail,
  tokenHashFor,
  type CodeKind,
} from "../support";

// Auth flows on Expo web (spec §9.2–9.5): password + emailed codes, sign-up confirmation, the
// code-based password reset and the transitional /auth/confirm link. Each test makes its own user.

const emails: string[] = [];
function newEmail(label: string) {
  const email = throwawayEmail(label);
  emails.push(email);
  return email;
}

test.afterEach(async () => {
  for (const email of emails.splice(0)) await deleteUserByEmail(email);
});

async function expectHome(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle("Your subscriptions");
}

async function hasSession(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key) !== null, SESSION_KEY);
}

/** Reads the emailed code (or its generateLink stand-in, see codeFor) and notes which. */
async function code(email: string, kind: CodeKind, count: number) {
  const result = await codeFor(email, kind, count);
  test.info().annotations.push({ type: "code source", description: `${kind}: ${result.source}` });
  return result;
}

test.describe("sign in with an emailed code", () => {
  test("an existing account gets a code and signs in with it", async ({ page }) => {
    const email = newEmail("code");
    await createUser(email);
    const before = await emailCount(email);

    await page.goto("/login");
    await expect(page).toHaveTitle("Sign in");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();

    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page).toHaveTitle("Check your email");
    await expect(page.getByText(`We sent a sign-in code to ${email}.`, { exact: false })).toBeVisible();

    const { code: otp } = await code(email, "magiclink", before);
    await page.getByLabel("Code", { exact: true }).fill(otp);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expectHome(page);
    expect(await hasSession(page)).toBe(true);
  });

  test("a wrong code shows an error and stays on the code step", async ({ page }) => {
    const email = newEmail("wrong-code");
    await createUser(email);
    const before = await emailCount(email);

    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    const { code: otp } = await code(email, "magiclink", before);
    const wrong = otp === "000000" ? "111111" : "000000";

    await page.getByLabel("Code", { exact: true }).fill(wrong);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(/wrong or has expired/);
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(await hasSession(page)).toBe(false);

    await page.getByRole("link", { name: "Use a different email" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("an address without an account gets an error, and no account is created", async ({ page }) => {
    const email = newEmail("nobody");

    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByRole("alert")).toHaveText("There's no account for this email. Create one first.");
    await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);

    // shouldCreateUser: false — the code request didn't sign the address up.
    const { error } = await anon().auth.signInWithPassword({ email, password: PASSWORD });
    expect(error?.code).toBe("invalid_credentials");
  });
});

test.describe("sign up", () => {
  test("creates the account; with confirmations on, a code confirms it", async ({ page }) => {
    const email = newEmail("signup");
    const before = await emailCount(email);

    await page.goto("/login");
    await page.getByRole("button", { name: "New here? Create an account" }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();

    // The local stack auto-confirms (enable_confirmations = false), so sign-up signs in straight
    // away; hosted projects with confirmations on show the code step first.
    const confirm = page.getByRole("heading", { name: "Confirm your email" });
    await expect(confirm.or(page.getByText("Subscriptions", { exact: true }).first())).toBeVisible();
    if (await confirm.isVisible()) {
      const { code: otp } = await code(email, "signup", before);
      await page.getByLabel("Code", { exact: true }).fill(otp);
      await page.getByRole("button", { name: "Confirm email" }).click();
    }
    await expectHome(page);
  });

  test("an unconfirmed account gets a confirmation code when signing in with its password", async ({ page }) => {
    const email = newEmail("unconfirmed");
    await createUser(email, { confirmed: false });
    const before = await emailCount(email);

    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
    const { code: otp } = await code(email, "signup", before);
    await page.getByLabel("Code", { exact: true }).fill(otp);
    await page.getByRole("button", { name: "Confirm email" }).click();
    await expectHome(page);
  });
});

test.describe("password reset by code", () => {
  test("email → code → new password; a reload mid-reset returns to the new-password step", async ({ page }) => {
    const email = newEmail("reset");
    await createUser(email);
    const before = await emailCount(email);
    const newPassword = "auth-e2e-new-password";

    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();
    // The login stays mounted under the pushed screen on web; only the visible field counts.
    await expect(page.getByLabel("Email", { exact: true }).filter({ visible: true })).toHaveValue(email);
    await page.getByRole("button", { name: "Send code" }).click();

    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    const { code: otp, message } = await code(email, "recovery", before);
    expect(message.subject).toMatch(/reset/i);
    await page.getByLabel("Code", { exact: true }).fill(otp);
    await page.getByRole("button", { name: "Continue" }).click();

    // Signed in by the code, but held on the reset until the new password is set.
    await expect(page.getByRole("heading", { name: "Create new password" })).toBeVisible();
    expect(await hasSession(page)).toBe(true);
    await page.goto("/");
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Create new password" })).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expectHome(page);
    // The reset is over: a reload stays home.
    await page.reload();
    await expectHome(page);

    expect((await anon().auth.signInWithPassword({ email, password: newPassword })).error).toBeNull();
    expect((await anon().auth.signInWithPassword({ email, password: PASSWORD })).error?.code).toBe(
      "invalid_credentials",
    );
  });

  test("cancel signs out on this device and keeps the old password", async ({ page }) => {
    const email = newEmail("reset-cancel");
    await createUser(email);
    const before = await emailCount(email);

    await page.goto("/reset-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    const { code: otp } = await code(email, "recovery", before);
    await page.getByLabel("Code", { exact: true }).fill(otp);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Create new password" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await hasSession(page)).toBe(false);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    expect((await anon().auth.signInWithPassword({ email, password: PASSWORD })).error).toBeNull();
  });
});

test.describe("/auth/confirm (transitional email link)", () => {
  test("a magic-link token_hash signs in and goes home", async ({ page }) => {
    const email = newEmail("link");
    await createUser(email);
    const tokenHash = await tokenHashFor(email, "magiclink");

    await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=email`);
    await expectHome(page);
    expect(await hasSession(page)).toBe(true);
  });

  test("a recovery token_hash continues at the new-password step", async ({ page }) => {
    const email = newEmail("link-recovery");
    await createUser(email);
    const tokenHash = await tokenHashFor(email, "recovery");

    await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=recovery`);
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByRole("heading", { name: "Create new password" })).toBeVisible();
  });

  test("a used link shows link expired and offers a code", async ({ page }) => {
    const email = newEmail("link-used");
    await createUser(email);
    const tokenHash = await tokenHashFor(email, "magiclink");
    expect((await anon().auth.verifyOtp({ token_hash: tokenHash, type: "email" })).error).toBeNull();

    await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=email`);
    await expect(page.getByRole("heading", { name: "Link expired" })).toBeVisible();
    expect(await hasSession(page)).toBe(false);
    await page.getByRole("button", { name: "Sign in with a code" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a link without a token_hash shows link expired", async ({ page }) => {
    await page.goto("/auth/confirm?type=email");
    await expect(page.getByRole("heading", { name: "Link expired" })).toBeVisible();
  });
});
