import type { Database } from "./database.types";

export type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";
export { Constants } from "./database.types";

/**
 * A subscription row. `billed_at` is the anchor of its recurring schedule: a
 * calendar day stored as 12:00 Europe/Copenhagen (`toBilledAt`), written only
 * on insert or when the user picks a new date. The next charge is computed
 * from it (`nextChargeDate`), never stored.
 */
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionWithCategory = Omit<Subscription, "category_id"> & {
  categories: Category | null;
};
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type IntervalEnum = Database["public"]["Enums"]["interval_enum"];
