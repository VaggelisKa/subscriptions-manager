import { createClient } from "@supabase/supabase-js";

/** Env from run.sh: the local stack only (run.sh refuses anything else). */
export const APP_PORT = Number(process.env.AUTH_E2E_PORT ?? 3220);
export const BASE_URL = `http://127.0.0.1:${APP_PORT}`;
export const SUPABASE_URL = process.env.AUTH_E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const MAILPIT_URL = process.env.AUTH_E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
export const SHOTS_DIR = process.env.AUTH_SHOTS_DIR || undefined;
export const PASSWORD = "auth-e2e-password-local";
/** supabase-js's web session key for http://127.0.0.1:… (sb-<first host label>-auth-token). */
export const SESSION_KEY = "sb-127-auth-token";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; run the suite through e2e/auth/run.sh`);
  return value;
}

function assertLocal() {
  const host = new URL(SUPABASE_URL).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`refusing a non-local stack (${host})`);
}

/** Service-role client for test setup (creating, inspecting and deleting throwaway users). */
export function admin() {
  assertLocal();
  return createClient(SUPABASE_URL, env("AUTH_E2E_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client like the app's, to check credentials outside the browser. */
export function anon() {
  assertLocal();
  return createClient(SUPABASE_URL, env("AUTH_E2E_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let counter = 0;
/** A fresh address per test; `@parity.test` like the parity fixtures. */
export function throwawayEmail(label: string) {
  counter += 1;
  return `auth-${label}-${Date.now()}-${process.pid}-${counter}@parity.test`;
}

export async function createUser(email: string, { confirmed = true, password = PASSWORD } = {}) {
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: confirmed });
  if (error) throw error;
  return data.user;
}

/** Deletes the user with this email, if there is one (sign-up tests create theirs via the UI). */
export async function deleteUserByEmail(email: string) {
  const client = admin();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) {
      await client.auth.admin.deleteUser(user.id);
      return;
    }
    if (data.users.length < 200) return;
  }
}

type MailpitSummary = { ID: string; Subject: string };

async function messagesTo(email: string) {
  const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  if (!res.ok) throw new Error(`Mailpit search failed: ${res.status}`);
  return ((await res.json()) as { messages: MailpitSummary[] }).messages;
}

export async function emailCount(email: string) {
  return (await messagesTo(email)).length;
}

/** Waits for email number `count + 1` to `email` and returns its subject and text. */
export async function nextEmail(email: string, count: number) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const messages = await messagesTo(email);
    if (messages.length > count) {
      // Newest first.
      const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
      const message = (await res.json()) as { Subject: string; Text: string; HTML: string };
      return { subject: message.Subject, text: message.Text, html: message.HTML };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no new email to ${email} (had ${count})`);
}

export type CodeKind = "magiclink" | "recovery" | "signup";

/**
 * The one-time code the app asked for: from the email (supabase/templates/*.html put `{{ .Token }}`
 * in every email), or — when the running stack still has GoTrue's link-only default templates,
 * because config.toml changes need a stack restart — a fresh code from `generateLink`, which
 * replaces the emailed one. Either way the email must have arrived.
 */
export async function codeFor(email: string, kind: CodeKind, count: number) {
  const message = await nextEmail(email, count);
  const fromEmail = message.text.match(/(?:^|\s)(\d{6,10})(?:\s|$)/m)?.[1];
  if (fromEmail) return { code: fromEmail, source: "email" as const, message };

  const params =
    kind === "signup"
      ? { type: "signup" as const, email, password: PASSWORD }
      : { type: kind, email };
  const { data, error } = await admin().auth.admin.generateLink(params);
  if (error) throw error;
  return { code: data.properties.email_otp, source: "generateLink" as const, message };
}

/** A `token_hash` for /auth/confirm, as the transitional email link carries it. */
export async function tokenHashFor(email: string, type: "magiclink" | "recovery") {
  const { data, error } = await admin().auth.admin.generateLink({ type, email });
  if (error) throw error;
  return data.properties.hashed_token;
}
