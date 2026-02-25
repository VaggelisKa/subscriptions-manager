import LoginForm from "@/components/features/LoginForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to register and track your subscriptions",
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
    <section className="grid min-h-[calc(100vh-6rem)] w-full place-items-center">
      <LoginForm />
    </section>
  );
}
