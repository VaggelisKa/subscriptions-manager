import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeScreen } from "@/components/home/home-screen";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Your subscriptions",
  description: "What's due next, and what it adds up to each month",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: subscriptions, error: subscriptionsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, name, price, billed_at, interval, created_at, description, user_id, categories(*)")
        .order("billed_at", { ascending: true }),
      supabase.from("categories").select("*").order("name"),
    ]);

  // A failed load must not look like an empty account: let error.tsx offer a retry.
  const loadError = subscriptionsError ?? categoriesError;
  if (loadError) {
    throw new Error(`Couldn't load subscriptions: ${loadError.message}`);
  }

  return (
    <HomeScreen
      subscriptions={(subscriptions ?? []) as SubscriptionWithCategory[]}
      categories={categories ?? []}
      email={user.email}
    />
  );
}
