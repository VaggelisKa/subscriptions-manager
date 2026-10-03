import { computed, signal, type Provider } from "@angular/core";
import type { Session } from "@supabase/supabase-js";
import type { Category, SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { toBilledAt } from "../lib/price.ts";
import { Auth } from "./auth.ts";
import { Subscriptions, type SubscriptionInput } from "./subscriptions.ts";

/**
 * Demo mode, switched on with `EXPO_PUBLIC_DEMO=1`: the same screens over an in-memory session and
 * a seeded list, so the app can be tried (and screenshotted) without an account or a backend.
 * Both classes have the public shape of the service they stand in for.
 */

const CATEGORIES: Category[] = [
  { id: "c-ent", name: "Entertainment", type: "entertainment", color_hex: "#e11d48" },
  { id: "c-prod", name: "Productivity", type: "productivity", color_hex: "#2563eb" },
  { id: "c-util", name: "Utilities", type: "utilities", color_hex: "#16a34a" },
  { id: "c-health", name: "Health & fitness", type: "health_and_fitness", color_hex: "#9333ea" },
  { id: "c-transport", name: "Transport", type: "transport", color_hex: "#f59e0b" },
];

function inDays(n: number): string {
  const d = new Date();
  return toBilledAt(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

function monthsAgo(n: number): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n, 1, 12).toISOString();
}

function seed(): SubscriptionWithCategory[] {
  const by = (id: string) => CATEGORIES.find((c) => c.id === id) ?? null;
  const rows: [string, number, SubscriptionWithCategory["interval"], number, string, number][] = [
    ["Rejsekort", 120, "week", 1, "c-transport", 8],
    ["Netflix", 129, "month", 2, "c-ent", 14],
    ["Spotify", 109, "month", 5, "c-ent", 20],
    ["GitHub Copilot", 70, "month", 9, "c-prod", 6],
    ["Claude", 180, "month", 12, "c-prod", 4],
    ["iCloud+", 29, "month", 20, "c-util", 30],
    ["Fitness World", 269, "month", 40, "c-health", 11],
    ["Apple TV+", 99, "year", 200, "c-ent", 2],
  ];
  return rows.map(([name, price, interval, days, category, since], i) => ({
    id: `demo-${i}`,
    name,
    price,
    interval,
    billed_at: inDays(days),
    created_at: monthsAgo(since),
    description: null,
    user_id: "demo",
    categories: by(category),
  }));
}

const SESSION = {
  user: { id: "demo", email: "demo@example.com" },
} as unknown as Session;

export class DemoAuth {
  private readonly current = signal<Session | null>(SESSION);
  readonly session = this.current.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  readonly ready = signal(true).asReadonly();
  readonly bootstrapError = signal<string | null>(null);
  readonly configured = true;

  whenReady(): Promise<void> {
    return Promise.resolve();
  }
  async signIn(): Promise<{ error?: string }> {
    this.current.set(SESSION);
    return {};
  }
  async signUp(): Promise<{ error?: string }> {
    this.current.set(SESSION);
    return {};
  }
  async signOut(): Promise<void> {
    this.current.set(null);
  }
  async deleteAccount(): Promise<{ error?: string }> {
    this.current.set(null);
    return {};
  }
}

export class DemoSubscriptions {
  private readonly all = signal<SubscriptionWithCategory[]>(seed());
  private readonly cats = signal<Category[]>(CATEGORIES);
  readonly subscriptions = this.all.asReadonly();
  readonly categories = this.cats.asReadonly();
  readonly loading = signal(false);
  readonly loaded = signal(true);
  readonly error = signal<string | null>(null);

  find(id: string): SubscriptionWithCategory | undefined {
    return this.all().find((s) => s.id === id);
  }
  async load(): Promise<void> {}
  async add(data: SubscriptionInput): Promise<{ error?: string }> {
    this.all.update((all) => [...all, this.row(`demo-${Date.now()}`, data, new Date().toISOString())]);
    return {};
  }
  async update(id: string, data: SubscriptionInput): Promise<{ error?: string }> {
    this.all.update((all) =>
      all.map((s) => (s.id === id ? this.row(id, data, s.created_at) : s)),
    );
    return {};
  }
  async remove(id: string): Promise<{ error?: string }> {
    this.all.update((all) => all.filter((s) => s.id !== id));
    return {};
  }

  private row(id: string, data: SubscriptionInput, createdAt: string): SubscriptionWithCategory {
    const { category_id, ...rest } = data;
    return {
      id,
      ...rest,
      created_at: createdAt,
      description: null,
      user_id: "demo",
      categories: this.cats().find((c) => c.id === category_id) ?? null,
    };
  }
}

export const demoProviders: Provider[] = [
  { provide: Auth, useClass: DemoAuth },
  { provide: Subscriptions, useClass: DemoSubscriptions },
];
