import Link from "next/link";
import { Metadata } from "next";
import { SuccessBadge } from "@/components/ui/app-mark";

export const metadata: Metadata = {
  title: "Check your email",
  description: "Open the sign-in link we emailed you",
};

export default function LoginConfirmationPage() {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-[22px] pb-6 pt-[max(2.5rem,calc(env(safe-area-inset-top)+2.125rem))] sm:justify-center sm:pt-6">
      <SuccessBadge />
      <div className="mt-[22px] flex flex-col gap-2">
        <h1 className="text-[30px] font-black leading-[33px] tracking-[-0.75px]">Check your email</h1>
        <p className="text-[16px] leading-[22px] text-muted-foreground">
          We sent you a sign-in link. Open it on this device to see your subscriptions.
        </p>
      </div>
      <Link
        href="/login"
        className="mt-8 self-start rounded-sm px-1 text-[15px] font-bold text-primary-text hover:opacity-70"
      >
        Use a different email
      </Link>
    </section>
  );
}
