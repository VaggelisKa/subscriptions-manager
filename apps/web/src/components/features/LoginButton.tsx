"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending} type="submit" className="mt-2">
      {pending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : null}
      {pending ? "Sending link…" : "Email me a sign-in link"}
    </Button>
  );
}
