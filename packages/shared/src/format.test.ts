import { describe, expect, test } from "vitest";
import {
  formatDayDate,
  formatDueLabel,
  formatKr,
  formatNumber,
  formatShortDate,
  formatWholeKr,
  formatWholeNumber,
  intervalLabel,
  intervalName,
  intervalSuffix,
  isDueSoon,
} from "./format";

const from = new Date(2026, 9, 14);

function inDays(n: number) {
  return new Date(2026, 9, 14 + n);
}

describe("amounts", () => {
  test("decimals only when they aren't zero, Danish separators", () => {
    expect(formatNumber(149)).toBe("149");
    expect(formatNumber(2250)).toBe("2.250");
    expect(formatNumber(79.5)).toBe("79,50");
    expect(formatNumber(1250.5)).toBe("1.250,50");
    expect(formatNumber(0)).toBe("0");
  });

  test("float noise is rounded to øre first", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0,30");
    expect(formatNumber(79.999)).toBe("80");
  });

  test("whole numbers and kroner", () => {
    expect(formatWholeNumber(1249.6)).toBe("1.250");
    expect(formatKr(79.5)).toBe("79,50 kr");
    expect(formatWholeKr(1249.4)).toBe("1.249 kr");
  });
});

describe("intervals", () => {
  test("suffix, label and name for each interval", () => {
    expect(intervalSuffix).toEqual({ week: "/wk", month: "/mo", year: "/yr" });
    expect(intervalLabel.month).toBe("every month");
    expect(intervalName.year).toBe("Yearly");
  });
});

describe("dates", () => {
  test("due labels: today, tomorrow, within a week, then the date", () => {
    expect(formatDueLabel(inDays(-3), from)).toBe("Today");
    expect(formatDueLabel(inDays(0), from)).toBe("Today");
    expect(formatDueLabel(inDays(1), from)).toBe("Tomorrow");
    expect(formatDueLabel(inDays(3), from)).toBe("in 3 days");
    expect(formatDueLabel(inDays(7), from)).toBe("in 7 days");
    expect(formatDueLabel(inDays(8), from)).toBe("22 Oct");
    expect(formatDueLabel(new Date(2027, 0, 5), from)).toBe("5 Jan 2027");
  });

  test("short and day dates add the year outside the current one", () => {
    expect(formatShortDate(inDays(0), from)).toBe("14 Oct");
    expect(formatShortDate(new Date(2027, 9, 14), from)).toBe("14 Oct 2027");
    expect(formatDayDate(new Date(2026, 9, 5), from)).toBe("Mon 5 Oct");
    expect(formatDayDate(new Date(2027, 1, 12), from)).toBe("Fri 12 Feb 2027");
  });

  test("an invalid date formats as nothing instead of throwing", () => {
    const invalid = new Date(NaN);
    expect(formatDueLabel(invalid, from)).toBe("");
    expect(formatShortDate(invalid, from)).toBe("");
    expect(formatDayDate(invalid, from)).toBe("");
  });

  test("due soon means within three days", () => {
    expect(isDueSoon(inDays(0), from)).toBe(true);
    expect(isDueSoon(inDays(3), from)).toBe(true);
    expect(isDueSoon(inDays(4), from)).toBe(false);
  });
});
