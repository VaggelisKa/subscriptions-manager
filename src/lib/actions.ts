"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getURL } from "@/lib/utils";

export async function loginWithMagicLinkAction(formData: FormData) {
  try {
    const supabase = createServerComponentClient({ cookies });
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
