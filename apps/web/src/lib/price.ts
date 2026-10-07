import { format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

/**
 * Accepts "79", "79,50", "79.50", "1.250" and "1.250,50". "." followed by
 * exactly three digits is a thousands separator, as the app itself formats
 * amounts that way. Negative prices are rejected and values are rounded to
 * øre. Same rules as the native form (`apps/native/src/app/subscription-form.tsx`).
 */
export function parsePrice(text: string | null | undefined) {
  let t = (text ?? "").trim().replace(/\s/g, "");
  if (!t) return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Whichever comes last is the decimal separator.
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

/** A price as it's typed back into the field: "79,5" → "79,50", no grouping. */
export function priceInputValue(price: number | null | undefined) {
  if (price == null) return "";
  const cents = Math.round(price * 100);
  return cents % 100 === 0
    ? String(cents / 100)
    : (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * A calendar day ("2026-10-09", or a Date's local day) stored as noon in
 * Copenhagen, so the day can't shift with the browser's or server's time zone.
 */
export function toBilledAt(day: string | Date) {
  const value = typeof day === "string" ? day : format(day, "yyyy-MM-dd");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  // Reject days that don't exist ("2026-02-31") instead of rolling them over or throwing.
  const [year, month, dayOfMonth] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== dayOfMonth) {
    return null;
  }
  return zonedTimeToUtc(`${value}T12:00:00`, "Europe/Copenhagen").toISOString();
}
