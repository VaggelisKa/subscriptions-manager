/**
 * `value` moved to the given "yyyy-MM-dd" day, keeping its time of day, or
 * `null` when that isn't a real day.
 */
export function withDay(value: Date, day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const [year, month, date] = match.slice(1).map(Number);
  const next = new Date(value);
  next.setFullYear(year, month - 1, date);
  return next.getMonth() === month - 1 && next.getDate() === date ? next : null;
}
