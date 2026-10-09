import { describe, expect, test } from "vitest";
import { subscriptionFormSchema, toSubscriptionWrite, type SubscriptionFormInput } from "./subscription";

const CATEGORY = "c9a35299-a72b-4f3d-87f1-ea93cd4b1a33";

const valid: SubscriptionFormInput = {
  name: " Netflix ",
  price: "79,50",
  interval: "month",
  billedAtDay: "2026-10-14",
  categoryId: CATEGORY,
};

/** The message the form would show, or `null` when the input is valid. */
function message(input: Record<string, unknown>) {
  const parsed = subscriptionFormSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0].message;
}

function values(input: Partial<SubscriptionFormInput> = {}) {
  return subscriptionFormSchema.parse({ ...valid, ...input });
}

describe("subscriptionFormSchema", () => {
  test("trims the name and parses the price", () => {
    expect(values()).toEqual({
      name: "Netflix",
      price: 79.5,
      interval: "month",
      billedAtDay: "2026-10-14",
      categoryId: CATEGORY,
    });
    expect(values({ price: "1.250,50" }).price).toBe(1250.5);
  });

  test("a missing or blank name", () => {
    expect(message({ ...valid, name: "" })).toBe("Give the subscription a name.");
    expect(message({ ...valid, name: "   " })).toBe("Give the subscription a name.");
    expect(message({ ...valid, name: undefined })).toBe("Give the subscription a name.");
  });

  test("a name longer than the database allows", () => {
    expect(message({ ...valid, name: "x".repeat(120) })).toBeNull();
    expect(message({ ...valid, name: "x".repeat(121) })).toBe("Keep the name to 120 characters or fewer.");
  });

  test("a missing or unreadable price", () => {
    for (const price of ["", "abc", "-5", "79 kr", undefined]) {
      expect(message({ ...valid, price }), String(price)).toBe("Enter a price, like 79 or 79,50.");
    }
  });

  test("an unknown interval", () => {
    expect(message({ ...valid, interval: "day" })).toBe("Choose how often it's billed.");
    expect(message({ ...valid, interval: undefined })).toBe("Choose how often it's billed.");
  });

  test("the first problem wins, in form order", () => {
    expect(message({ name: "", price: "", interval: "" })).toBe("Give the subscription a name.");
    expect(message({ name: "Netflix", price: "", interval: "" })).toBe("Enter a price, like 79 or 79,50.");
  });

  test("the date and category are optional; a category must be an id", () => {
    expect(message({ ...valid, billedAtDay: undefined, categoryId: undefined })).toBeNull();
    expect(message({ ...valid, categoryId: "" })).toBeNull();
    expect(message({ ...valid, categoryId: "Transport" })).not.toBeNull();
  });
});

describe("toSubscriptionWrite", () => {
  test("an insert writes the picked day as noon in Copenhagen", () => {
    expect(toSubscriptionWrite(values(), true)).toEqual({
      name: "Netflix",
      price: 79.5,
      interval: "month",
      billed_at: "2026-10-14T10:00:00.000Z",
      category_id: CATEGORY,
    });
  });

  test("an insert requires a date", () => {
    expect(() => toSubscriptionWrite(values({ billedAtDay: undefined }), true)).toThrow(
      "Pick the date of the next charge.",
    );
    expect(() => toSubscriptionWrite(values({ billedAtDay: "" }), true)).toThrow("Pick the date of the next charge.");
  });

  test("an impossible date is rejected, on insert and on edit", () => {
    expect(() => toSubscriptionWrite(values({ billedAtDay: "2026-02-31" }), true)).toThrow(
      "Pick the date of the next charge.",
    );
    expect(() => toSubscriptionWrite(values({ billedAtDay: "2026-02-31" }), false)).toThrow(
      "Pick the date of the next charge.",
    );
  });

  test("an edit without a picked date leaves the anchor alone", () => {
    const write = toSubscriptionWrite(values({ billedAtDay: undefined }), false);
    expect(write).not.toHaveProperty("billed_at");
    expect(write).toEqual({ name: "Netflix", price: 79.5, interval: "month", category_id: CATEGORY });
  });

  test("an edit with a picked date moves the anchor", () => {
    expect(toSubscriptionWrite(values({ billedAtDay: "2026-01-31" }), false).billed_at).toBe(
      "2026-01-31T11:00:00.000Z",
    );
  });

  test("no category leaves the column alone", () => {
    expect(toSubscriptionWrite(values({ categoryId: "" }), true)).not.toHaveProperty("category_id");
    expect(toSubscriptionWrite(values({ categoryId: undefined }), false)).not.toHaveProperty("category_id");
  });
});
