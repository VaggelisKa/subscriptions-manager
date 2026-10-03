import { expect, test } from "vitest";
import { parsePrice, priceToInput } from "./price.ts";

test("a price is read with a decimal comma or point, and Danish thousands separators", () => {
  expect(parsePrice("79")).toBe(79);
  expect(parsePrice("79,50")).toBe(79.5);
  expect(parsePrice("79.50")).toBe(79.5);
  expect(parsePrice("1.250")).toBe(1250);
  expect(parsePrice("1.250,50")).toBe(1250.5);
});

test("anything that is not a positive amount is rejected", () => {
  expect(parsePrice("")).toBeNull();
  expect(parsePrice("abc")).toBeNull();
  expect(parsePrice("-5")).toBeNull();
});

test("a stored price is shown with a decimal comma", () => {
  expect(priceToInput(79.5)).toBe("79,5");
});
