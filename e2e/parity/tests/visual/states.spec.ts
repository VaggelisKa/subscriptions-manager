import { at, expect, ready, test } from "../../support/fixtures";
import { addFault } from "../../support/faults";

// Home loading skeleton and load error (spec §12A.1). Both come from the server render
// (app/(home)/loading.tsx streamed while the data loads, error.tsx when it fails), so the
// Supabase proxy holds or fails the `loading` / `failing` users' REST requests. Same layout at
// every width.
const ALL = at(375, 1024, 1440);

test("loading skeleton", ALL, async ({ login, page, shot }) => {
  await login("loading");
  const release = await addFault("loading", "hold");
  try {
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("status", { name: "Loading subscriptions" })).toBeVisible();
    await shot("states", "loading");
  } finally {
    await release();
  }
});

test("load error with retry", ALL, async ({ login, page, shot }) => {
  await login("failing");
  const release = await addFault("failing", "error");
  try {
    await page.goto("/");
    await ready(page);
    await expect(page.getByRole("heading", { name: "Couldn't load your subscriptions" })).toBeVisible();
    await shot("states", "error");
  } finally {
    await release();
  }
});
