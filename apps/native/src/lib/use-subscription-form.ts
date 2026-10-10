import { use, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { format, setHours, setMinutes } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import type { IntervalEnum } from "@subscriptions-manager/shared/types";
import { nextChargeDate } from "@subscriptions-manager/shared/billing";
import { parsePrice } from "@subscriptions-manager/shared/price";
import {
  subscriptionFormSchema,
  toSubscriptionWrite,
  type SubscriptionWrite,
} from "@subscriptions-manager/shared/schemas";
import { AuthContext } from "@/providers/auth-provider";
import { useSubscriptions } from "@/lib/use-subscriptions";
import { haptics } from "@/lib/haptics";

export const INTERVALS: IntervalEnum[] = ["week", "month", "year"];

/** What the detail screen passes when it opens the form for an edit. */
type Params = {
  id?: string | string[];
  name?: string | string[];
  price?: string | string[];
  interval?: string | string[];
  billed_at?: string | string[];
  category_id?: string | string[];
};

function isInterval(value: string | undefined): value is IntervalEnum {
  return INTERVALS.includes(value as IntervalEnum);
}

/**
 * State, validation and saving for the add/edit form (`/subscription-form`),
 * shared by the SwiftUI view on iOS and the RN view elsewhere. An edit is
 * prefilled from the route params. `save` and `remove` close the form when
 * they succeed; otherwise they return the message to show, which also stays
 * in `error`.
 */
export function useSubscriptionForm() {
  const params = useLocalSearchParams<Params>();

  const getParam = (key: keyof Params) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const id = getParam("id");
  const paramName = getParam("name");
  // Shown with a decimal comma to match the rest of the app; parsing accepts both.
  const paramPrice = getParam("price")?.replace(".", ",");
  const paramInterval = getParam("interval");
  const paramBilledAt = getParam("billed_at");
  const paramCategoryId = getParam("category_id");

  const { user } = use(AuthContext);
  const { categories, addSubscription, updateSubscription, deleteSubscription } =
    useSubscriptions(user?.id);

  const isEdit = !!id;
  // New subscriptions default to the first category; edits keep "none" as none.
  const defaultCategoryId = isEdit ? "" : (categories[0]?.id ?? "");

  const [name, setName] = useState(paramName ?? "");
  const [price, setPrice] = useState(paramPrice ?? "");
  const [interval, setInterval] = useState<IntervalEnum>(
    isInterval(paramInterval) ? paramInterval : "month",
  );
  // A stale `billed_at` is shown as its next charge (keeping the stored time
  // of day), but it's only written back if the user picks a date: it anchors
  // the schedule, so rewriting it on every save would shift it.
  const [billedAt, setBilledAt] = useState(() => {
    if (!paramBilledAt) return new Date();
    const stored = utcToZonedTime(paramBilledAt, "Europe/Copenhagen");
    const next = nextChargeDate(
      paramBilledAt,
      isInterval(paramInterval) ? paramInterval : "month",
    );
    return setMinutes(setHours(next, stored.getHours()), stored.getMinutes());
  });
  const [billedAtChanged, setBilledAtChanged] = useState(false);
  const [categoryId, setCategoryId] = useState(paramCategoryId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveCategoryId = categoryId || defaultCategoryId;
  const selectedCategory = categories.find((c) => c.id === effectiveCategoryId);

  /** Leaves the form; straight home when nothing is under it (a web deep link). */
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function fail(message: string) {
    setError(message);
    return message;
  }

  async function save(): Promise<string | null> {
    const parsed = subscriptionFormSchema.safeParse({
      name,
      price,
      interval,
      // The stored anchor is only rewritten when the user picks a date.
      billedAtDay:
        !isEdit || billedAtChanged ? format(billedAt, "yyyy-MM-dd") : undefined,
      categoryId: effectiveCategoryId,
    });
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    let data: SubscriptionWrite;
    try {
      data = toSubscriptionWrite(parsed.data, !isEdit);
    } catch (e) {
      return fail((e as Error).message);
    }

    setError(null);
    setSaving(true);
    const result = isEdit
      ? await updateSubscription(id!, data)
      : await addSubscription({ ...data, billed_at: data.billed_at! });
    setSaving(false);
    if (result.error) return fail(result.error);

    haptics.success();
    close();
    return null;
  }

  async function remove(): Promise<string | null> {
    setError(null);
    setSaving(true);
    const result = await deleteSubscription(id!);
    setSaving(false);
    if (result.error) return fail(result.error);

    haptics.success();
    // The form may sit on top of the detail sheet; close both.
    router.dismissTo("/");
    return null;
  }

  return {
    /** The subscription being edited; `undefined` when adding. */
    id,
    isEdit,
    categories,
    name,
    setName,
    price,
    setPrice,
    /** `price` parsed, or `null` while it's empty or invalid. */
    parsedPrice: parsePrice(price),
    interval,
    setInterval,
    billedAt,
    /** Picks the next charge; only a picked date is written on an edit. */
    setBilledAt: (date: Date) => {
      setBilledAt(date);
      setBilledAtChanged(true);
    },
    /** The chosen category, or the default for a new subscription. */
    categoryId: effectiveCategoryId,
    selectedCategory,
    setCategoryId,
    saving,
    error,
    save,
    remove,
    close,
  };
}

export type SubscriptionForm = ReturnType<typeof useSubscriptionForm>;
