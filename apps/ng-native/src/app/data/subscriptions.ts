import { Service, effect, inject, signal } from "@angular/core";
import type { Category, IntervalEnum, SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { Auth } from "./auth.ts";
import { supabase } from "./supabase.ts";

export type SubscriptionInput = {
  name: string;
  price: number;
  interval: IntervalEnum;
  billed_at: string;
  category_id?: string;
};

type Result = { error?: string };

/**
 * Every subscription of the signed-in user, with its category, plus the categories themselves.
 * Replaces apps/native's `useSubscriptions` hook: one instance for the whole app rather than a
 * fetch per screen, kept fresh by a realtime channel on the `subscriptions` table.
 */
@Service()
export class Subscriptions {
  private readonly auth = inject(Auth);
  private readonly all = signal<SubscriptionWithCategory[]>([]);
  private readonly cats = signal<Category[]>([]);

  readonly subscriptions = this.all.asReadonly();
  readonly categories = this.cats.asReadonly();
  readonly loading = signal(false);
  /** True once the first fetch for the current user has returned. */
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const userId = this.auth.user()?.id;
      if (!userId) {
        this.all.set([]);
        this.cats.set([]);
        this.loaded.set(false);
        return;
      }

      void this.load();

      // Changes made while the channel was down are never delivered, so refetch once it rejoins.
      let missedChanges = false;
      const channel = supabase
        .channel(`subscriptions-changes-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions" },
          () => void this.load(),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            if (missedChanges) void this.load();
            missedChanges = false;
          } else {
            missedChanges = true;
          }
        });

      onCleanup(() => {
        void supabase.removeChannel(channel);
      });
    });
  }

  find(id: string): SubscriptionWithCategory | undefined {
    return this.all().find((s) => s.id === id);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const [subs, cats] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, name, price, billed_at, interval, user_id, created_at, categories(*)")
        .order("billed_at", { ascending: true }),
      supabase.from("categories").select("*"),
    ]);

    this.error.set(subs.error?.message ?? null);
    if (subs.data) this.all.set(subs.data as unknown as SubscriptionWithCategory[]);
    if (cats.data) this.cats.set(cats.data);
    this.loading.set(false);
    this.loaded.set(true);
  }

  async add(data: SubscriptionInput): Promise<Result> {
    const userId = this.auth.user()?.id;
    if (!userId) return { error: "Not authenticated" };
    const { error } = await supabase.from("subscriptions").insert({ ...data, user_id: userId });
    if (error) return { error: error.message };
    await this.load();
    return {};
  }

  async update(id: string, data: SubscriptionInput): Promise<Result> {
    const { error } = await supabase.from("subscriptions").update(data).eq("id", id);
    if (error) return { error: error.message };
    await this.load();
    return {};
  }

  async remove(id: string): Promise<Result> {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) return { error: error.message };
    await this.load();
    return {};
  }
}
