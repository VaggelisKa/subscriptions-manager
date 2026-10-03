import { useState, useEffect, useId } from "react";
import { supabase } from "@/lib/supabase";
import type {
  SubscriptionWithCategory,
  Category,
} from "@subscriptions-manager/shared";

export function useSubscriptions(userId: string | undefined) {
  const channelId = useId();
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithCategory[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  async function fetchData() {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [subsResult, catsResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "id, name, price, billed_at, interval, user_id, created_at, categories(*)",
        )
        .order("billed_at", { ascending: true }),

      supabase.from("categories").select("*"),
    ]);

    setError(subsResult.error?.message ?? null);
    if (subsResult.data) {
      setSubscriptions(
        subsResult.data as unknown as SubscriptionWithCategory[],
      );
    }
    if (catsResult.data) {
      setCategories(catsResult.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [userId, refreshTrigger]);

  useEffect(() => {
    if (!userId) return;

    let missedChanges = false;

    const channel = supabase
      .channel(`subscriptions-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => setRefreshTrigger((t) => t + 1),
      )
      .subscribe((status) => {
        // Changes made while the channel was timed out or errored are never
        // delivered, so refetch once it rejoins.
        if (status === "SUBSCRIBED") {
          if (missedChanges) setRefreshTrigger((t) => t + 1);
          missedChanges = false;
        } else {
          missedChanges = true;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, channelId]);

  async function addSubscription(data: {
    name: string;
    price: number;
    interval: "week" | "month" | "year";
    billed_at: string;
    category_id?: string;
  }) {
    if (!userId) return { error: "Not authenticated" };

    const { error } = await supabase.from("subscriptions").insert({
      ...data,
      user_id: userId,
    });

    if (error) return { error: error.message };
    return {};
  }

  async function updateSubscription(
    id: string,
    data: {
      name: string;
      price: number;
      interval: "week" | "month" | "year";
      billed_at: string;
      category_id?: string;
    },
  ) {
    const { error } = await supabase
      .from("subscriptions")
      .update(data)
      .eq("id", id);

    if (error) return { error: error.message };
    return {};
  }

  async function deleteSubscription(id: string) {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };
    return {};
  }

  return {
    subscriptions,
    categories,
    loading,
    error,
    refresh: fetchData,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  };
}
