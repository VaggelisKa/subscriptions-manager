export function getRelativeDateFromTimestamp(timestamp: string) {
  const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {
    style: "narrow",
  });

  const dayDifference = Math.ceil(
    // subtract the current date from the billed_at date
    (new Date(timestamp).getTime() - new Date().getTime()) / 86400000,
  );

  if (dayDifference > 30) {
    return relativeTimeFormat.format(Math.ceil(dayDifference / 30), "months");
  }

  if (dayDifference > 365) {
    return relativeTimeFormat.format(Math.ceil(dayDifference / 365), "years");
  }

  if (dayDifference === 0) {
    return "in 1d";
  }

  return relativeTimeFormat.format(dayDifference, "days");
}

export function getShortDateFromTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-DK", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
