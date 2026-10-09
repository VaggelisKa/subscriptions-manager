import { describe, expect, test } from "vitest";
import { parsePrice, priceInputValue, toBilledAt } from "./price";

describe("parsePrice", () => {
  test.each([
    ["79", 79],
    ["79,50", 79.5],
    ["79.50", 79.5],
    ["79,5", 79.5],
    ["1.25", 1.25],
    ["1.250", 1250],
    ["1.250.000", 1250000],
    ["1.250,50", 1250.5],
    ["1,250.50", 1250.5],
    [" 1 250 ", 1250],
    ["0", 0],
    ["79,999", 80],
  ])("%j is %d", (text, price) => {
    expect(parsePrice(text)).toBe(price);
  });

  test.each([
    "",
    "   ",
    null,
    undefined,
    "abc",
    "79 kr",
    "-5",
    "+5",
    "1e3",
    "Infinity",
    "79,5,0",
    "12.50.00",
    ".5",
    "5.",
  ])("%j is rejected", (text) => {
    expect(parsePrice(text)).toBeNull();
  });
});

describe("priceInputValue", () => {
  test("whole amounts stay whole, others get two decimals with a comma", () => {
    expect(priceInputValue(79)).toBe("79");
    expect(priceInputValue(79.5)).toBe("79,50");
    expect(priceInputValue(1250.5)).toBe("1250,50");
    expect(priceInputValue(0.1 + 0.2)).toBe("0,30");
  });

  test("no price is an empty field", () => {
    expect(priceInputValue(null)).toBe("");
    expect(priceInputValue(undefined)).toBe("");
  });

  test("round-trips through parsePrice", () => {
    for (const price of [0, 79, 79.5, 1250.5, 9999999.99]) {
      expect(parsePrice(priceInputValue(price))).toBe(price);
    }
  });
});

describe("toBilledAt", () => {
  test("a day is stored as noon in Copenhagen, in summer and in winter time", () => {
    expect(toBilledAt("2026-10-09")).toBe("2026-10-09T10:00:00.000Z");
    expect(toBilledAt("2026-01-15")).toBe("2026-01-15T11:00:00.000Z");
  });

  test("a Date uses its local calendar day", () => {
    expect(toBilledAt(new Date(2026, 9, 9, 23, 59))).toBe("2026-10-09T10:00:00.000Z");
    expect(toBilledAt(new Date(2026, 9, 9, 0, 0))).toBe("2026-10-09T10:00:00.000Z");
  });

  test("29 February only exists in leap years", () => {
    expect(toBilledAt("2028-02-29")).toBe("2028-02-29T11:00:00.000Z");
    expect(toBilledAt("2026-02-29")).toBeNull();
  });

  test.each([
    "2026-02-31",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-10-00",
    "2026-10-32",
    "2026-1-5",
    "09-10-2026",
    "2026-10-09T12:00",
    "",
    "tomorrow",
  ])("%j is rejected", (day) => {
    expect(toBilledAt(day)).toBeNull();
  });
});
