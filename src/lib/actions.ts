"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getURL } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function loginWithMagicLinkAction(formData: FormData) {
  try {
    const supabase = createServerActionClient({ cookies });
    const email = formData.get("email") as string;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email address");

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

export async function addNewSubscription(data: FormData) {
  const supabase = createServerActionClient<Database>({ cookies });
  const inputs = Object.fromEntries(data) as {
    name: string;
    description: string;
    price: string;
    interval: "week" | "month" | "year";
    billed_at: string;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  if (!inputs.name) {
    return { message: "Name of subscription is required" };
  }

  if (!inputs.price) {
    return { message: "Price of subscription should be given" };
  }

  if (!inputs.interval) {
    return { message: "Interval period should be passed" };
  }

  const { error } = await supabase.from("subscriptions").insert({
    name: inputs.name,
    description: inputs.description,
    price: parseFloat(inputs.price),
    interval: inputs.interval,
    billed_at: inputs.billed_at,
    user_id: user.id,
  });

  if (error) {
    return { message: "Server error" };
  }

  console.log(error);

  revalidatePath("/");
}
