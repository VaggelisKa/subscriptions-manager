"use client";

import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

/** Signs out everywhere and goes to the login page. */
export function useSignOut() {
  const router = useRouter();

  return async function signOut() {
    await supabaseClient.auth.signOut({ scope: "global" });
    router.replace("/login");
  };
}
