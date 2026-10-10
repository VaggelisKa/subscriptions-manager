// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { format } from "date-fns";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { nextChargeDate } from "@subscriptions-manager/shared/billing";
import { toBilledAt } from "@subscriptions-manager/shared/price";
import { useSubscriptionForm, type SubscriptionForm } from "./use-subscription-form";

const CATEGORY = "c9a35299-a72b-4f3d-87f1-ea93cd4b1a33";
const OTHER_CATEGORY = "0b5c7a1e-3f7e-4f5e-9a51-5d3c2b1a0f9e";
const ANCHOR = "2025-12-14T11:00:00.000Z";

const mocks = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  router: {
    back: vi.fn(),
    replace: vi.fn(),
    dismissTo: vi.fn(),
    canGoBack: vi.fn(() => true),
  },
  addSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: mocks.router,
  useLocalSearchParams: () => mocks.params,
}));
vi.mock("@/providers/auth-provider", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({ user: { id: "user-1" } }) };
});
vi.mock("@/lib/use-subscriptions", () => ({
  useSubscriptions: () => ({
    categories: [
      { id: CATEGORY, name: "Transport", color_hex: "#0ea5e9" },
      { id: OTHER_CATEGORY, name: "Entertainment", color_hex: "#ef4444" },
    ],
    addSubscription: mocks.addSubscription,
    updateSubscription: mocks.updateSubscription,
    deleteSubscription: mocks.deleteSubscription,
  }),
}));
vi.mock("@/lib/haptics", () => ({ haptics: { success: vi.fn() } }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let form: SubscriptionForm;

function render(params: Record<string, string> = {}) {
  mocks.params = params;
  function Probe() {
    form = useSubscriptionForm();
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
}

/** Runs a change and lets the form re-render. */
function update(change: (current: SubscriptionForm) => void) {
  act(() => change(form));
}

async function save() {
  let error: string | null = null;
  await act(async () => {
    error = await form.save();
  });
  return error;
}

const netflix = {
  id: "sub-1",
  name: "Netflix",
  price: "129",
  interval: "month",
  billed_at: ANCHOR,
  category_id: OTHER_CATEGORY,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.addSubscription.mockResolvedValue({});
  mocks.updateSubscription.mockResolvedValue({});
  mocks.deleteSubscription.mockResolvedValue({});
});

afterEach(() => {
  act(() => root.unmount());
});

test("validates with the shared schema's messages and writes nothing until it passes", async () => {
  render();

  expect(await save()).toBe("Give the subscription a name.");
  expect(form.error).toBe("Give the subscription a name.");

  update((f) => {
    f.setName("Parity price 79");
    f.setPrice("79 kroner");
  });
  expect(await save()).toBe("Enter a price, like 79 or 79,50.");
  expect(form.error).toBe("Enter a price, like 79 or 79,50.");

  expect(mocks.addSubscription).not.toHaveBeenCalled();
  expect(mocks.router.back).not.toHaveBeenCalled();
});

test("adds with the parsed price, the first category and the picked day at noon in Copenhagen", async () => {
  render();
  expect(form.isEdit).toBe(false);
  expect(form.categoryId).toBe(CATEGORY);

  update((f) => {
    f.setName("Parity price 1.250,50");
    f.setPrice("1.250,50");
    f.setInterval("year");
    f.setBilledAt(new Date(2026, 9, 20, 9, 30));
  });
  expect(form.parsedPrice).toBe(1250.5);
  expect(await save()).toBeNull();

  expect(mocks.addSubscription).toHaveBeenCalledWith({
    name: "Parity price 1.250,50",
    price: 1250.5,
    interval: "year",
    billed_at: "2026-10-20T10:00:00.000Z",
    category_id: CATEGORY,
  });
  expect(form.error).toBeNull();
  expect(mocks.router.back).toHaveBeenCalledOnce();
});

test("a new subscription is first charged today unless another day is picked", async () => {
  render();
  update((f) => {
    f.setName("Parity price 79");
    f.setPrice("79");
  });
  await save();

  expect(mocks.addSubscription.mock.calls[0][0].billed_at).toBe(toBilledAt(new Date()));
});

test("an edit is prefilled from the route and shows the stored anchor's next charge", () => {
  render(netflix);

  expect(form.isEdit).toBe(true);
  expect(form.name).toBe("Netflix");
  expect(form.price).toBe("129");
  expect(form.interval).toBe("month");
  expect(form.categoryId).toBe(OTHER_CATEGORY);
  expect(format(form.billedAt, "yyyy-MM-dd")).toBe(
    format(nextChargeDate(ANCHOR, "month"), "yyyy-MM-dd"),
  );
});

test("an edit leaves billed_at alone when the date wasn't changed", async () => {
  render(netflix);
  update((f) => {
    f.setName("Netflix Premium");
    f.setPrice("149,50");
    f.setInterval("year");
  });
  expect(await save()).toBeNull();

  expect(mocks.updateSubscription).toHaveBeenCalledOnce();
  const [id, data] = mocks.updateSubscription.mock.calls[0];
  expect(id).toBe("sub-1");
  expect(data).toEqual({
    name: "Netflix Premium",
    price: 149.5,
    interval: "year",
    category_id: OTHER_CATEGORY,
  });
  expect(data).not.toHaveProperty("billed_at");
});

test("an edit writes billed_at once a date is picked", async () => {
  render(netflix);
  update((f) => f.setBilledAt(new Date(2026, 9, 20)));
  await save();

  const [, data] = mocks.updateSubscription.mock.calls[0];
  expect(data.billed_at).toBe("2026-10-20T10:00:00.000Z");
  expect(data.price).toBe(129);
});

test("an edit without a category keeps none", async () => {
  render({ ...netflix, category_id: "" });
  expect(form.categoryId).toBe("");
  await save();

  expect(mocks.updateSubscription.mock.calls[0][1]).not.toHaveProperty("category_id");
});

test("a failed save keeps the form open with the error", async () => {
  mocks.updateSubscription.mockResolvedValue({ error: "Network request failed" });
  render(netflix);

  expect(await save()).toBe("Network request failed");
  expect(form.error).toBe("Network request failed");
  expect(form.saving).toBe(false);
  expect(mocks.router.back).not.toHaveBeenCalled();
});

test("saving a form opened directly (nothing to go back to) goes home", async () => {
  mocks.router.canGoBack.mockReturnValueOnce(false);
  render(netflix);
  await save();

  expect(mocks.router.back).not.toHaveBeenCalled();
  expect(mocks.router.replace).toHaveBeenCalledWith("/");
});

test("remove deletes the subscription and closes the form and the detail under it", async () => {
  render(netflix);
  let error: string | null = "unset";
  await act(async () => {
    error = await form.remove();
  });

  expect(error).toBeNull();
  expect(mocks.deleteSubscription).toHaveBeenCalledWith("sub-1");
  expect(mocks.router.dismissTo).toHaveBeenCalledWith("/");
});
