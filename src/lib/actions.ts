"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getURL } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const cookiesStore = cookies();

export async function loginWithMagicLinkAction(formData: FormData) {
  try {
    const supabase = createServerActionClient({ cookies: () => cookiesStore });
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
  const supabase = createServerActionClient<Database>({
    cookies: () => cookiesStore,
  });
  const inputs = Object.fromEntries(data) as {
    name: string;
    description: string;
    price: string;
    interval: "week" | "month" | "year";
    billed_at: string;
    category?: string;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
    billed_at: new Date(inputs.billed_at).toUTCString(),
    user_id: user.id,
    ...(!!inputs.category?.length && { category_id: inputs.category }),
  });

  if (error) {
    return { message: "Server error" };
  }

  revalidatePath("/");

  return { success: true };
}

export async function updateSubscription(data: FormData) {
  const supabase = createServerActionClient<Database>({
    cookies: () => cookiesStore,
  });
  const inputs = Object.fromEntries(data) as {
    name: string;
    description: string;
    price: string;
    interval: "week" | "month" | "year";
    billed_at: string;
    id?: string;
    category?: string;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  console.log(inputs);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      name: inputs.name,
      description: inputs.description,
      price: parseFloat(inputs.price),
      interval: inputs.interval,
      billed_at: new Date(inputs.billed_at).toUTCString(),
      category_id: inputs.category,
    })
    .eq("id", inputs.id ?? "")
    .select();

  if (error) {
    return { message: "Server error" };
  }

  revalidatePath("/");

  return { success: true };
}

export async function deleteSubscription(formData: FormData) {
  const supabase = createServerActionClient<Database>({
    cookies: () => cookiesStore,
  });

  const subscriptionId = formData.get("id") as string;

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
    return { message: "Server error" };
  }

  revalidatePath("/");

  return { success: true };
}
