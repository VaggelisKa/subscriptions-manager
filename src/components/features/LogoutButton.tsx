"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabaseClient.auth.signOut({ scope: "global" });

    router.replace("/login");
  }

  return (
    <Button type="button" variant="outline" size="icon" onClick={handleLogout}>
      <span className="sr-only">Logout and redirect to login page</span>
      <LogOut className="h-6 w-6" />
    </Button>
  );
}
