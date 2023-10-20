"use client";

import { useState } from "react";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { loginWithMagicLinkAction } from "@/lib/actions";
import { LoginButton } from "@/components/common/LoginButton";

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
      className="mx-auto flex max-w-[300px] flex-col gap-4"
    >
      <fieldset>
        <Label
          className={error ? "text-red-500" : ""}
          htmlFor="login-page-email"
        >
          email
        </Label>
        <Input
          className={error ? "border-red-500" : ""}
          id="login-page-email"
          type="email"
          name="email"
          placeholder="your-email@some.com"
          autoFocus
          required
        />
        {error && (
          <p aria-live="polite" className="text-red-500">
            {error}
          </p>
        )}
      </fieldset>
      <LoginButton />
    </form>
  );
}
