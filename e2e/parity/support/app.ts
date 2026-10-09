import type { Page } from "@playwright/test";

/**
 * Locators and actions shared by the visual and functional specs, written against roles and
 * accessible names so the same specs can drive the Expo port (spec §12A.4).
 */

/** Escapes a name for use at the start of an accessible-name regex. */
export function startsWith(name: string) {
  return new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
}

// ── mobile (< 1024) ──

export const mobile = {
  /** A row in the home timeline ("Netflix, Today, 129 kr every month"). */
  row: (page: Page, name: string) => page.getByRole("main").getByRole("button", { name: startsWith(name) }).first(),
  menuButton: (page: Page) => page.getByRole("button", { name: "More options" }),
  addButton: (page: Page) => page.getByRole("button", { name: "Add subscription", exact: true }),
  insightsButton: (page: Page) => page.getByRole("button", { name: "Insights", exact: true }),
  sheet: (page: Page) => page.getByRole("dialog"),
};

// ── desktop (≥ 1024) ──

export const desktop = {
  ledger: (page: Page) => page.getByRole("region", { name: "Subscriptions" }),
  /** A ledger row ("Netflix, Entertainment, Today, 129 kr every month"). */
  row: (page: Page, name: string) => desktop.ledger(page).getByRole("button", { name: startsWith(name) }),
  selectedRow: (page: Page) => desktop.ledger(page).locator('[aria-current="true"]'),
  /** The docked inspector, labelled by what it shows (a name, "Insights", "New subscription", …). */
  inspector: (page: Page, label: string | RegExp) => page.getByRole("complementary", { name: label }),
  addButton: (page: Page) => page.getByRole("button", { name: /^Add subscription/ }).first(),
  insightsButton: (page: Page) => page.getByRole("button", { name: "Insights" }),
  accountButton: (page: Page) => page.getByRole("button", { name: "Account", exact: true }),
  sortButton: (page: Page) => page.getByRole("button", { name: /^Sort/ }),
  /** A month-calendar day with charges ("Thu 15 Oct, 2 charges: …"). */
  calendarDay: (page: Page, day: string) =>
    page.getByRole("complementary", { name: "Overview" }).getByRole("button", { name: new RegExp(`^${day},`) }),
};

/** Picks a segmented-control option (a radio inside a radiogroup) by clicking its label. */
export async function pickSegment(page: Page, group: string, option: string) {
  await page.getByRole("radiogroup", { name: group }).getByText(option, { exact: true }).click();
}

/**
 * The form can't submit without a date (it always sends one), so "Pick the date of the next
 * charge." is reached by blanking `billed_at` in the server action's request on its way out.
 * Returns a function that stops doing so.
 */
export async function blankBilledAtOnSave(page: Page) {
  const handler = async (route: import("@playwright/test").Route) => {
    const request = route.request();
    const body = request.postData();
    if (request.method() !== "POST" || !request.headers()["next-action"] || !body) return route.continue();
    await route.continue({ postData: body.replace(/(name="[^"]*billed_at"\r\n\r\n)[^\r]*/, "$1") });
  };
  await page.route("**/*", handler);
  return () => page.unroute("**/*", handler);
}
