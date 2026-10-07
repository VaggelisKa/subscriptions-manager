"use client";

import { useState } from "react";
import { loginWithMagicLinkAction } from "@/lib/actions";
import { LoginButton } from "@/components/features/LoginButton";
import { cn } from "@/lib/utils";

/** Filled, borderless email field and a full-width button, as on native. */
export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setError(null);

        const res = await loginWithMagicLinkAction(formData);

        if (res?.error) {
          setError(res.error);
        }
      }}
      className="mt-8 flex flex-col gap-2.5"
    >
      <label htmlFor="login-page-email" className="sr-only">
        Email
      </label>
      <input
        className={cn(
          "h-[52px] rounded-lg border-[1.5px] bg-surface px-3.5 text-[16px] outline-none placeholder:text-faint focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0",
          error ? "border-destructive" : "border-transparent",
        )}
        id="login-page-email"
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        aria-invalid={!!error}
        aria-describedby={error ? "login-error" : undefined}
        autoFocus
        required
      />
      {error && (
        <p id="login-error" role="alert" className="px-1 text-[14px] font-semibold leading-[19px] text-destructive">
          {error}
        </p>
      )}
      <LoginButton />
    </form>
  );
}
