import { DestroyRef, Service, inject, signal } from "@angular/core";
import { AppState } from "react-native";
import { addDays, differenceInMilliseconds } from "date-fns";
import { today } from "../lib/billing.ts";

/**
 * The current billing day as a signal, apps/native's `useTodayKey`. It changes at Copenhagen
 * midnight and when the app returns to the foreground on a new day, so a `computed` that reads it
 * re-runs its date-relative work (today's cell, "in 2 days", "still to pay in October").
 */
@Service()
export class Today {
  private readonly current = signal(today());
  /** Start of today in the billing time zone. */
  readonly date = this.current.asReadonly();

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      const now = today();
      if (now.getTime() !== this.current().getTime()) this.current.set(now);
      clearTimeout(timer);
      // `today()` is Copenhagen midnight expressed in device-local time.
      timer = setTimeout(sync, differenceInMilliseconds(addDays(now, 1), new Date()) + 1000);
    };
    sync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    inject(DestroyRef).onDestroy(() => {
      subscription.remove();
      clearTimeout(timer);
    });
  }
}
