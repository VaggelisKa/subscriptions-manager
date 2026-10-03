import { Service, computed, effect, inject, signal } from "@angular/core";
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
  // The id, not the user: a token refresh hands back a new user object for the same account.
  private readonly userId = computed(() => this.auth.user()?.id ?? null);

  readonly subscriptions = this.all.asReadonly();
  readonly categories = this.cats.asReadonly();
  readonly loading = signal(false);
  /** True once a fetch for the current user has succeeded. */
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  /** Bumped by every fetch and every change of user; only the latest fetch may write. */
  private generation = 0;

  constructor() {
    effect((onCleanup) => {
      const userId = this.userId();
      // A new account (or none) starts from nothing, and whatever is in flight for the previous
      // one is discarded when it lands.
      this.generation++;
      this.all.set([]);
      this.cats.set([]);
      this.loaded.set(false);
      this.loading.set(false);
      this.error.set(null);
      if (!userId) return;

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

  /**
   * Fetches the current user's rows. A response is applied only if no newer fetch has started and
   * the user is still the one it was made for: a slow response must not overwrite a newer one, or
   * show one account's subscriptions to the next. A failed refresh keeps the rows already shown.
   */
  async load(): Promise<void> {
    const userId = this.userId();
    if (!userId) return;
    const generation = ++this.generation;
    this.loading.set(true);

    let error: string | null = null;
    let subs: SubscriptionWithCategory[] | null = null;
    let cats: Category[] | null = null;
    try {
      const [subsResult, catsResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, name, price, billed_at, interval, user_id, created_at, categories(*)")
          .order("billed_at", { ascending: true }),
        supabase.from("categories").select("*"),
      ]);
      error = subsResult.error?.message ?? catsResult.error?.message ?? null;
      subs = subsResult.data as unknown as SubscriptionWithCategory[] | null;
      cats = catsResult.data;
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn't load subscriptions";
    }

    if (generation !== this.generation || this.userId() !== userId) return;
    this.error.set(error);
    if (!error) {
      if (subs) this.all.set(subs);
      if (cats) this.cats.set(cats);
      this.loaded.set(true);
    }
    this.loading.set(false);
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
