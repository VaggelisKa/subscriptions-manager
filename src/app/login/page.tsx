import LoginForm from "@/components/features/LoginForm";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to register and track your subscriptions",
};

export default async function LoginPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
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
