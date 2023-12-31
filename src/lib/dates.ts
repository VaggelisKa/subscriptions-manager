import { format, formatDistanceToNowStrict } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

export function getRelativeDateFromTimestamp(timestamp: string) {
  return formatDistanceToNowStrict(
    utcToZonedTime(timestamp, "Europe/Copenhagen", {
      roundingMethod: "ceil",
    }),
  );
}

export function getShortDateFromTimestamp(timestamp: string) {
  return format(utcToZonedTime(timestamp, "Europe/Copenhagen"), "dd/MM/yy");
}
