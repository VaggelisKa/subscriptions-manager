import { differenceInCalendarDays, format, isSameYear } from "date-fns";
import type { IntervalEnum } from "./types";
import { today } from "./billing";

const LOCALE = "en-DK";

/** "149", "2.250", "79,50" — decimals only when they aren't zero. */
export function formatNumber(value: number) {
  // Round to øre first so float noise (1.005 → 100.4999…) can't disagree with
  // the decimals check.
  const cents = Math.round(value * 100);
  const hasDecimals = cents % 100 !== 0;
  return (cents / 100).toLocaleString(LOCALE, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

/** Rounded to whole kroner, for totals and normalised amounts. */
export function formatWholeNumber(value: number) {
  return Math.round(value).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

export function formatKr(value: number) {
  return `${formatNumber(value)} kr`;
}

export function formatWholeKr(value: number) {
  return `${formatWholeNumber(value)} kr`;
}

export const intervalSuffix: Record<IntervalEnum, string> = {
  week: "/wk",
  month: "/mo",
  year: "/yr",
};

export const intervalLabel: Record<IntervalEnum, string> = {
  week: "every week",
  month: "every month",
  year: "every year",
};

export const intervalName: Record<IntervalEnum, string> = {
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

/** "Today", "Tomorrow", "in 3 days" within a week; otherwise "14 Oct" (with year if not this year). */
export function formatDueLabel(date: Date, from = today()) {
  if (isNaN(date.getTime())) return "";
  const days = differenceInCalendarDays(date, from);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `in ${days} days`;
  return formatShortDate(date, from);
}

/** "14 Oct", or "14 Oct 2027" outside the current year. */
export function formatShortDate(date: Date, from = today()) {
  if (isNaN(date.getTime())) return "";
  return format(date, isSameYear(date, from) ? "d MMM" : "d MMM yyyy");
}

/** "Mon 5 Oct", or "Fri 12 Feb 2027" outside the current year. */
export function formatDayDate(date: Date, from = today()) {
  if (isNaN(date.getTime())) return "";
  return format(date, isSameYear(date, from) ? "EEE d MMM" : "EEE d MMM yyyy");
}

/** Charges within this many days are highlighted. */
export function isDueSoon(date: Date, from = today()) {
  return differenceInCalendarDays(date, from) <= 3;
}
