import { Service, computed, effect, inject, linkedSignal, resource, untracked } from "@angular/core";
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
type Rows = { subscriptions: SubscriptionWithCategory[]; categories: Category[] };

/**
 * Every subscription of the signed-in user, with its category, plus the categories themselves.
 * Replaces apps/native's `useSubscriptions` hook: one instance for the whole app rather than a
 * fetch per screen, kept fresh by a realtime channel on the `subscriptions` table.
 */
@Service()
export class Subscriptions {
  private readonly auth = inject(Auth);
  // The id, not the user: a token refresh hands back a new user object for the same account.
  private readonly userId = computed(() => this.auth.user()?.id ?? undefined);

  /** Resolvers for `reload()` callers, settled when the next fetch finishes. */
  private waiting: (() => void)[] = [];
  /**
   * A refetch asked for while one was in flight. `resource.reload()` refuses while loading, and a
   * change that lands mid-fetch may not be in its result, so it runs once the current one is done.
   */
  private queued = false;

  /**
   * The fetch, keyed by user. A new user (or none) starts a new request and aborts the one in
   * flight, and `resource` applies only the latest request's response, so a slow one cannot show
   * one account's rows to the next. Refetches for the same user run one at a time (`refetch`).
   */
  private readonly rows = resource({
    params: () => this.userId(),
    loader: async ({ abortSignal }): Promise<Rows> => {
      try {
        const [subs, cats] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("id, name, price, billed_at, interval, user_id, created_at, categories(*)")
            .order("billed_at", { ascending: true })
            .abortSignal(abortSignal),
          supabase.from("categories").select("*").abortSignal(abortSignal),
        ]);
        const error = subs.error ?? cats.error;
        if (error) throw new Error(error.message);
        return {
          subscriptions: (subs.data ?? []) as unknown as SubscriptionWithCategory[],
          categories: cats.data ?? [],
        };
      } finally {
        // A superseded or queued-behind fetch leaves its callers to the one that follows it.
        if (!abortSignal.aborted && !this.queued) this.settle();
      }
    },
  });

  /**
   * The last rows fetched for the current user. A failed refresh leaves the resource without a
   * value; the rows already on screen stay, and `error` says why they may be stale. A different
   * user starts from nothing.
   */
  private readonly current = linkedSignal<{ user: string | undefined; rows?: Rows }, Rows | null>({
    source: () => ({
      user: this.userId(),
      rows: this.rows.hasValue() ? this.rows.value() : undefined,
    }),
    computation: (source, previous) =>
      source.rows ?? (previous && previous.source.user === source.user ? previous.value : null),
  });

  readonly subscriptions = computed(() => this.current()?.subscriptions ?? []);
  readonly categories = computed(() => this.current()?.categories ?? []);
  readonly loading = this.rows.isLoading;
  /** True once a fetch for the current user has succeeded. */
  readonly loaded = computed(() => this.current() !== null);
  readonly error = computed(() => this.rows.error()?.message ?? null);
  /** What a list screen shows: the rows, why there are none, or that they are on their way. */
  readonly status = computed(() =>
    this.subscriptions().length > 0
      ? "ready"
      : this.error()
        ? "error"
        : this.loaded()
          ? "empty"
          : "loading",
  );

  constructor() {
    // Run a queued refetch as soon as the one in flight has finished.
    effect(() => {
      if (this.rows.isLoading() || !this.queued) return;
      this.queued = false;
      untracked(() => this.rows.reload());
    });

    effect((onCleanup) => {
      const userId = this.userId();
      this.queued = false;
      if (!userId) {
        // No fetch is coming to settle anyone still waiting.
        this.settle();
        return;
      }

      // Changes made while the channel was down are never delivered, so refetch once it rejoins.
      let missedChanges = false;
      const channel = supabase
        .channel(`subscriptions-changes-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () =>
          this.refetch(),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            if (missedChanges) this.refetch();
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
    return this.subscriptions().find((s) => s.id === id);
  }

  /** Refetch, resolving once the fetch has finished (successfully or not). */
  reload(): Promise<void> {
    if (!this.userId()) return Promise.resolve();
    const done = new Promise<void>((resolve) => this.waiting.push(resolve));
    this.refetch();
    return done;
  }

  async add(data: SubscriptionInput): Promise<Result> {
    const userId = this.userId();
    if (!userId) return { error: "Not authenticated" };
    const { error } = await supabase.from("subscriptions").insert({ ...data, user_id: userId });
    if (error) return { error: error.message };
    await this.reload();
    return {};
  }

  async update(id: string, data: SubscriptionInput): Promise<Result> {
    const { error } = await supabase.from("subscriptions").update(data).eq("id", id);
    if (error) return { error: error.message };
    await this.reload();
    return {};
  }

  async remove(id: string): Promise<Result> {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) return { error: error.message };
    await this.reload();
    return {};
  }

  private refetch(): void {
    if (!this.rows.reload() && this.rows.isLoading()) this.queued = true;
  }

  private settle(): void {
    const waiting = this.waiting;
    this.waiting = [];
    for (const resolve of waiting) resolve();
  }
}
