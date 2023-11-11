import type { Database as DB } from "@/lib/types/database.types";

declare global {
  type Database = DB;
  type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
  type SubscriptionWithCategory = Omit<Subscription, "category_id"> & {
    categories: Category | null;
  };
  type Category = Database["public"]["Tables"]["categories"]["Row"];

  type NextURLSearchParams = { [key: string]: string | string[] | undefined };
}
