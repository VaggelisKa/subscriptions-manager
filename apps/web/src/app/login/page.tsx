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
    <section className="absolute bottom-[50%] left-[50%] w-full -translate-x-[50%] px-6">
      <LoginForm />
    </section>
  );
}
