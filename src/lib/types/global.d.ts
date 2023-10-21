import type { Database as DB } from "@/lib/types/database.types";

declare global {
  type Database = DB;
  type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
}
