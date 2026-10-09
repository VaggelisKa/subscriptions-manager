import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { DB_URL, PARITY_DIR, PASSWORD, USERS, type FixtureUser, type UserKey } from "./env";

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

/**
 * Creates `user` the way seed.sql creates the fixture users (if it doesn't exist yet) and
 * replaces its subscriptions with copies of `from`'s.
 */
export function seedCopy(user: FixtureUser, from: UserKey) {
  return withDb((db) =>
    db.begin(async (sql) => {
      await sql`
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change_token_new, email_change,
          email_change_token_current, phone_change, phone_change_token, reauthentication_token
        ) values (
          '00000000-0000-0000-0000-000000000000', ${user.id}, 'authenticated', 'authenticated', ${user.email},
          extensions.crypt(${PASSWORD}, extensions.gen_salt('bf')), '2026-01-01 09:00:00+01',
          '{"provider":"email","providers":["email"]}', '{}', '2026-01-01 09:00:00+01', '2026-01-01 09:00:00+01',
          '', '', '', '', '', '', '', ''
        ) on conflict (id) do nothing`;
      await sql`
        insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
        values (${user.id}, ${user.id},
                jsonb_build_object('sub', ${user.id}::text, 'email', ${user.email}::text, 'email_verified', true),
                'email', '2026-01-01 09:00:00+01', '2026-01-01 09:00:00+01')
        on conflict (provider_id, provider) do nothing`;
      await sql`delete from public.subscriptions where user_id = ${user.id}`;
      await sql`
        insert into public.subscriptions (id, user_id, name, price, "interval", billed_at, category_id, created_at, description)
        select gen_random_uuid(), ${user.id}, name, price, "interval", billed_at, category_id, created_at, description
          from public.subscriptions where user_id = ${USERS[from].id}`;
    }),
  );
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
