"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SubscriptionGroupSwitchForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [toggled, setToggled] = useState(
    searchParams.get("group") === "category",
  );

  useEffect(() => {
    if (toggled) {
      router.replace(`?group=category`, { scroll: false });
    } else {
      router.replace(`?group=date`, { scroll: false });
    }
  }, [router, searchParams, pathname, toggled]);

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="group-switch">Group by category</Label>

      <Switch
        checked={toggled}
        onClick={() => {
          setToggled(!toggled);
        }}
        id="group-switch"
      />
    </div>
  );
}
