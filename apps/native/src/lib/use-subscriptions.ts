import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { SubscriptionWithCategory, Category } from "@subscriptions-manager/shared";

export function useSubscriptions(userId: string | undefined) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [subsResult, catsResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, name, price, billed_at, interval, description, user_id, created_at, categories(*)")
        .order("billed_at", { ascending: true }),
      supabase.from("categories").select("*"),
    ]);

    if (subsResult.data) {
      setSubscriptions(subsResult.data as unknown as SubscriptionWithCategory[]);
    }
    if (catsResult.data) {
      setCategories(catsResult.data);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addSubscription = useCallback(
    async (data: {
      name: string;
      description?: string;
      price: number;
      interval: "week" | "month" | "year";
      billed_at: string;
      category_id?: string;
    }) => {
      if (!userId) return { error: "Not authenticated" };

      const { error } = await supabase.from("subscriptions").insert({
        ...data,
        user_id: userId,
      });

      if (error) return { error: error.message };

      await fetchData();
      return {};
    },
    [userId, fetchData],
  );

  const updateSubscription = useCallback(
    async (
      id: string,
      data: {
        name: string;
        description?: string;
        price: number;
        interval: "week" | "month" | "year";
        billed_at: string;
        category_id?: string;
      },
    ) => {
      const { error } = await supabase
        .from("subscriptions")
        .update(data)
        .eq("id", id);

      if (error) return { error: error.message };

      await fetchData();
      return {};
    },
    [fetchData],
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) return { error: error.message };

      await fetchData();
      return {};
    },
    [fetchData],
  );

  return {
    subscriptions,
    categories,
    loading,
    refresh: fetchData,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  };
}
