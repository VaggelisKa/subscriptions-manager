"use client";

// @ts-expect-error
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const status = useFormStatus();

  return (
    <Button aria-disabled={status.pending} type="submit">
      {status.pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {status.pending ? "Sending..." : "Send magic link"}
    </Button>
  );
}
