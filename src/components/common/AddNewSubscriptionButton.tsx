"use client";

import { Plus } from "lucide-react";
import { Button } from "../ui/button";

export function AddNewSubscriptionButton() {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        console.log("clicked");
      }}
    >
      <span className="sr-only">Add new subscription</span>
      <Plus className="h-6 w-6" />
    </Button>
  );
}
