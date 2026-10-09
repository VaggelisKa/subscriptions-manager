"use server";

import { redirect } from "next/navigation";
import { getURL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "./supabase-server";
import { parsePrice, toBilledAt } from "./price";

export async function loginWithMagicLinkAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email address");

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getURL(),
      },
    });
  } catch (error: any) {
    return { error: error?.message || "Could not generate one time password" };
  }

  redirect("/login/confirmation");
}

type SubscriptionInputs = {
  name?: string;
  price?: string;
  interval?: string;
  /** Calendar day ("2026-10-09"); omitted on edits that keep the schedule. */
  billed_at?: string;
  id?: string;
  category?: string;
};

const INTERVALS = ["week", "month", "year"] as const;

/** Validates the form; returns the row fields or an error message. */
function parseSubscription(inputs: SubscriptionInputs, requireDate: boolean) {
  const name = inputs.name?.trim();
  if (!name) return { message: "Give the subscription a name." } as const;

  const price = parsePrice(inputs.price);
  if (price === null) {
    return { message: "Enter a price, like 79 or 79,50." } as const;
  }

  const interval = INTERVALS.find((i) => i === inputs.interval);
  if (!interval) return { message: "Choose how often it's billed." } as const;

  const billedAt = inputs.billed_at ? toBilledAt(inputs.billed_at) : null;
  if ((requireDate || inputs.billed_at) && !billedAt) {
    return { message: "Pick the date of the next charge." } as const;
  }

  return {
    data: {
      name,
      price,
      interval,
      ...(billedAt ? { billed_at: billedAt } : {}),
      ...(inputs.category ? { category_id: inputs.category } : {}),
    },
  } as const;
}

export async function addNewSubscription(formData: FormData) {
  const inputs = Object.fromEntries(formData) as SubscriptionInputs;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseSubscription(inputs, true);
  if (!parsed.data) return { message: parsed.message };

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      ...parsed.data,
      billed_at: parsed.data.billed_at!,
      user_id: user.id,
    })
    .select("id");

  if (error) {
    return { message: "Couldn't save the subscription. Try again." };
  }

  revalidatePath("/");

  // The new row's id, so the desktop layout can select it.
  return { success: true, id: data?.[0]?.id as string | undefined };
}

/**
 * Saves an edit. `billed_at` is the anchor every charge date is computed
 * from, so it's only written when the user picked a new date. Same rule as
 * the native form.
 */
export async function updateSubscription(formData: FormData) {
  const inputs = Object.fromEntries(formData) as SubscriptionInputs;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!inputs.id) return { message: "This subscription no longer exists." };

  const parsed = parseSubscription(inputs, false);
  if (!parsed.data) return { message: parsed.message };

  const { error } = await supabase
    .from("subscriptions")
    .update(parsed.data)
    .eq("id", inputs.id)
    .select();

  if (error) {
    return { message: "Couldn't save the subscription. Try again." };
  }

  revalidatePath("/");

  return { success: true };
}

export async function deleteSubscription(formData: FormData) {
  const subscriptionId = formData.get("id") as string;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subscriptionId);

  if (error) {
    return { message: "Couldn't delete the subscription. Try again." };
  }

  revalidatePath("/");

  return { success: true };
}
