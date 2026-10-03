import { DestroyRef, Service, computed, inject, signal } from "@angular/core";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase.ts";

type Result = { error?: string };

/** The Supabase session as signals. Replaces apps/native's `AuthProvider` context. */
@Service()
export class Auth {
  private readonly current = signal<Session | null>(null);
  private readonly settled = signal(false);
  private readonly restoring: Promise<void>;

  readonly session = this.current.asReadonly();
  readonly user = computed(() => this.session()?.user ?? null);
  /** True once the stored session has been read back, successfully or not. */
  readonly ready = this.settled.asReadonly();
  readonly bootstrapError = signal<string | null>(null);
  readonly configured = supabaseConfigured;

  constructor() {
    this.restoring = this.restore();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      this.current.set(session);
      this.settled.set(true);
    });
    inject(DestroyRef).onDestroy(() => data.subscription.unsubscribe());
  }

  /** What the route guards await before deciding where the app starts. */
  whenReady(): Promise<void> {
    return this.restoring;
  }

  async signIn(email: string, password: string): Promise<Result> {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: error.message } : {};
  }

  async signUp(email: string, password: string): Promise<Result> {
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    return error ? { error: error.message } : {};
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /** Deletes the account through the web app's API, which holds the service role, then signs out. */
  async deleteAccount(): Promise<Result> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: "Not signed in" };
    const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!apiUrl) return { error: "EXPO_PUBLIC_API_URL is required for account deletion." };

    try {
      const response = await fetch(`${apiUrl}/api/account/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) return { error: body.error || `Request failed (${response.status})` };
      await supabase.auth.signOut();
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to delete account" };
    }
  }

  private async restore(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession();
      this.current.set(data.session);
    } catch (error) {
      this.current.set(null);
      this.bootstrapError.set(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Could not reconnect to Supabase. Check your connection and try again.",
      );
    } finally {
      this.settled.set(true);
    }
  }
}
