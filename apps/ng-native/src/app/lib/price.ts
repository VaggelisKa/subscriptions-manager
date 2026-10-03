import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

/**
 * Accepts "79", "79,50", "79.50", "1.250" and "1.250,50". The decimal pad shows "," in Danish;
 * "." followed by exactly three digits is a thousands separator, as the app itself formats
 * amounts that way. Negative prices are rejected and values are rounded to øre.
 */
export function parsePrice(text: string): number | null {
  let t = text.trim().replace(/\s/g, "");
  if (!t) return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const grouping = decimal === "," ? "." : ",";
    t = t.split(grouping).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    t = t.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.split(".").join("");
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Math.round(Number(t) * 100) / 100;
}

/** A stored price as the form shows it: a decimal comma, like the rest of the app. */
export function priceToInput(price: number): string {
  return String(price).replace(".", ",");
}

/** The calendar day picked, stored as noon in Copenhagen so the day cannot shift with the device's time zone. */
export function toBilledAt(date: Date): string {
  const day = format(date, "yyyy-MM-dd");
  return zonedTimeToUtc(`${day}T12:00:00`, "Europe/Copenhagen").toISOString();
}
