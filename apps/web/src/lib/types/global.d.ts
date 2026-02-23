import type {
  Database as DB,
  Subscription as Sub,
  SubscriptionWithCategory as SubWithCat,
  Category as Cat,
} from "@subscriptions-manager/shared";

declare global {
  type Database = DB;
  type Subscription = Sub;
  type SubscriptionWithCategory = SubWithCat;
  type Category = Cat;

  type NextURLSearchParams = { [key: string]: string | string[] | undefined };
}
