import { formatDistanceToNow } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

export function getRelativeDateFromTimestamp(timestamp: string) {
  return formatDistanceToNow(
    utcToZonedTime(timestamp, "Europe/Copenhagen", {
      roundingMethod: "ceil",
    }),
  );
}

export function getShortDateFromTimestamp(timestamp: string) {
  return utcToZonedTime(timestamp, "Europe/Copenhagen").toLocaleDateString(
    "en-DK",
    {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    },
  );
}
