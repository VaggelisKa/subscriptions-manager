import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { addDays, differenceInMilliseconds } from "date-fns";
import { today } from "@subscriptions-manager/shared/billing";

/**
 * A key for the current billing day ("2026-10-03"). It changes at midnight and
 * when the app returns to the foreground on a new day, so date-relative UI
 * (today's cell, "in 2 days", "still to pay") doesn't go stale.
 */
export function useTodayKey() {
  const [key, setKey] = useState(() => dayKey());

  useEffect(() => {
    function sync() {
      setKey(dayKey());
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    // `today()` is Copenhagen midnight expressed in device-local time.
    const timer = setTimeout(
      sync,
      differenceInMilliseconds(addDays(today(), 1), new Date()) + 1000,
    );
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [key]);

  return key;
}

function dayKey() {
  return today().toDateString();
}
