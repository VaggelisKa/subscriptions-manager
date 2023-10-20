"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function handleLogout() {
    await supabase.auth.signOut({ scope: "global" });

    router.replace("/login");
  }

  return (
    <Button type="button" variant="outline" size="icon" onClick={handleLogout}>
      <span className="sr-only">Logout and redirect to login page</span>
      <LogOut className="h-6 w-6" />
    </Button>
  );
}
