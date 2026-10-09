import { z } from "zod";
import { parsePrice, toBilledAt } from "../price";
import type { IntervalEnum } from "../types";

const INTERVALS = [
  "week",
  "month",
  "year",
] as const satisfies readonly IntervalEnum[];

const NAME_REQUIRED = "Give the subscription a name.";
const PRICE_INVALID = "Enter a price, like 79 or 79,50.";
const DATE_REQUIRED = "Pick the date of the next charge.";

/**
 * The add/edit form as both apps submit it: the price as typed, the next
 * charge as a calendar day ("2026-10-09"). Messages are the ones the forms
 * show.
 */
export const subscriptionFormSchema = z.object({
  name: z
    .string({ error: NAME_REQUIRED })
    .trim()
    .min(1, NAME_REQUIRED)
    .max(120, "Keep the name to 120 characters or fewer."),
  price: z.string({ error: PRICE_INVALID }).transform((value, ctx) => {
    const price = parsePrice(value);
    if (price === null) {
      ctx.addIssue({ code: "custom", message: PRICE_INVALID });
      return z.NEVER;
    }
    return price;
  }),
  interval: z.enum(INTERVALS, { error: "Choose how often it's billed." }),
  /** Set only when the user picked a date (always on add). */
  billedAtDay: z.string().optional(),
  categoryId: z.guid().optional().or(z.literal("")),
});

export type SubscriptionFormInput = z.input<typeof subscriptionFormSchema>;
export type SubscriptionFormValues = z.output<typeof subscriptionFormSchema>;

export type SubscriptionWrite = {
  name: string;
  price: number;
  interval: IntervalEnum;
  billed_at?: string;
  category_id?: string;
};

/**
 * The row fields to insert or update. `billed_at` anchors the schedule, so an
 * edit only writes it when the user picked a new date; rewriting it would
 * shift the schedule. Throws with the form's message when an add has no
 * date, or the picked day doesn't exist. No category leaves the column alone
 * (null on add).
 */
export function toSubscriptionWrite(
  input: SubscriptionFormValues,
  isInsert: boolean,
): SubscriptionWrite {
  const billed_at = input.billedAtDay ? toBilledAt(input.billedAtDay) : null;
  if ((isInsert || input.billedAtDay) && !billed_at) {
    throw new Error(DATE_REQUIRED);
  }
  return {
    name: input.name,
    price: input.price,
    interval: input.interval,
    ...(billed_at ? { billed_at } : {}),
    ...(input.categoryId ? { category_id: input.categoryId } : {}),
  };
}
