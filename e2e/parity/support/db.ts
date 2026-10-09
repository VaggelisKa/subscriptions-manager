import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { DB_URL, PARITY_DIR, USERS, type UserKey } from "./env";

const SEED = path.join(PARITY_DIR, "seed.sql");

/** A short-lived connection to the local database (as `postgres`, so RLS doesn't apply). */
export async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>) {
  // seed.sql is destructive and this bypasses RLS: never against anything but the local stack.
  const host = new URL(DB_URL).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error(`refusing a non-local database (${host})`);
  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

/** Applies seed.sql: every fixture user, or just `only` (the write flows reseed their own user). */
export function seed(only?: UserKey) {
  return withDb(async (sql) => {
    if (only) await sql`select set_config('parity.only_user', ${USERS[only].email}, false)`;
    await sql.unsafe(fs.readFileSync(SEED, "utf8"));
  });
}

export type SubscriptionRow = {
  id: string;
  name: string;
  price: string;
  interval: string;
  billed_at: Date;
  category_id: string | null;
};

export function subscriptionsOf(user: UserKey) {
  return withDb((sql) =>
    sql<SubscriptionRow[]>`
      select id, name, price::text as price, interval::text as interval, billed_at, category_id
        from public.subscriptions where user_id = ${USERS[user].id} order by name`.then((rows) => [...rows]),
  );
}
