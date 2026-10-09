import { DestroyRef, Service, computed, inject, signal } from "@angular/core";
import { type Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase.ts";

type Result = { error?: string };
export type DeleteResult = Result & { cancelled?: boolean };

/** True if `invoke` couldn't reach the function at all. Checked by shape, like `functionErrorCode`. */
export function isFunctionsFetchError(error: unknown): boolean {
  return !!error && typeof error === "object" && "name" in error && error.name === "FunctionsFetchError";
}

/** The `code` from an Edge Function's JSON error body, if there is one. */
export async function functionErrorCode(error: unknown): Promise<string | undefined> {
  // Checked by shape, not `instanceof`: a second copy of supabase-js (or a polyfilled `Response`)
  // makes the class checks fail even for a real `reauth_required` reply.
  if (!error || typeof error !== "object") return undefined;
  if (!("name" in error) || error.name !== "FunctionsHttpError") return undefined;
  const context: unknown = "context" in error ? error.context : undefined;
  if (!context || typeof context !== "object" || !("json" in context)) return undefined;
  if (typeof context.json !== "function") return undefined;
  type Body = { json: () => Promise<unknown> };
  const response = context as Body & { clone: () => Body };
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    // No `clone`, or the clone couldn't be read: read the original response instead.
    try {
      body = await response.json();
    } catch {
      return undefined; // Not JSON (e.g. a gateway error page).
    }
  }
  if (body && typeof body === "object" && "code" in body) {
    return typeof body.code === "string" ? body.code : undefined;
  }
  return undefined;
}

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

  /**
   * Signs out everywhere if the server can be reached, and always on this device: a global sign-out
   * that fails (offline, say) returns before clearing the stored session, which would leave the
   * app signed in after the user asked to leave.
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" });
  }

  /** Confirms the current user's password, which also counts as a fresh sign-in. */
  async reauthenticate(password: string): Promise<Result> {
    const email = this.user()?.email;
    if (!email) return { error: "Not signed in" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }

  /**
   * Deletes the account through the `delete-account` Edge Function. It needs a sign-in from the
   * last 10 minutes; if the session is older, `confirmIdentity` asks for the password (resolving
   * false when the user cancels) and the request is retried once. On success only this device is
   * signed out: the server has already removed the user and every session.
   */
  async deleteAccount(confirmIdentity: () => Promise<boolean>): Promise<DeleteResult> {
    let { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    if (error && (await functionErrorCode(error)) === "reauth_required") {
      if (!(await confirmIdentity())) return { cancelled: true };
      ({ error } = await supabase.functions.invoke("delete-account", { method: "POST" }));
    }
    if (error) {
      console.warn("Account deletion failed:", error);
      return {
        error:
          isFunctionsFetchError(error)
            ? "Couldn't reach the server. Check your connection and try again."
            : "Couldn't delete your account. Try again.",
      };
    }
    await supabase.auth.signOut({ scope: "local" });
    return {};
  }

  private async restore(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession();
      this.current.set(data.session);
    } catch {
      // Unreadable storage: start signed out. (apps/native also offers a retry; see README.)
      this.current.set(null);
    } finally {
      this.settled.set(true);
    }
  }
}
