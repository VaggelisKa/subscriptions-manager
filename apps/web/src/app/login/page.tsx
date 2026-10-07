import LoginForm from "@/components/features/LoginForm";
import { AppMark } from "@/components/ui/app-mark";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to register and track your subscriptions",
};

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-[22px] pb-6 pt-[max(2.5rem,calc(env(safe-area-inset-top)+2.125rem))] sm:justify-center sm:pt-6">
      <AppMark />
      <div className="mt-[22px] flex flex-col gap-2">
        <h1 className="text-[30px] font-black leading-[33px] tracking-[-0.75px]">
          Subscriptions
          <br />
          Manager
        </h1>
        <p className="text-[16px] leading-[22px] text-muted-foreground">
          Sign in to see what&apos;s due next. We&apos;ll email you a link, no password needed.
        </p>
      </div>
      <LoginForm />
    </section>
  );
}
