import { test } from "@playwright/test";
import { PROXY_URL, USERS, type UserKey } from "./env";

/**
 * Tells support/supabase-proxy.mjs to hold (`hold`: the request waits until the rule is
 * removed) or fail (`error`: HTTP 500 in PostgREST's error shape) one user's requests whose
 * path contains `path`. Other users are unaffected, so parallel tests don't see it.
 * Returns a function that removes the rule (held requests then continue). If the test has
 * already failed, a failure to remove the rule is logged instead of thrown, so it doesn't hide
 * the original error.
 */
export async function addFault(user: UserKey, mode: "hold" | "error", path = "/rest/v1/subscriptions") {
  const res = await fetch(`${PROXY_URL}/__parity/faults`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: USERS[user].id, path, mode }),
  });
  if (!res.ok) throw new Error(`proxy rejected fault: ${res.status} ${await res.text()}`);
  const { id } = (await res.json()) as { id: number };
  return async () => {
    try {
      const del = await fetch(`${PROXY_URL}/__parity/faults?id=${id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(10_000),
      });
      if (!del.ok) throw new Error(`proxy failed to clear fault ${id}: ${del.status} ${await del.text()}`);
    } catch (err) {
      if (test.info().errors.length === 0) throw err;
      console.warn(`[parity] ${err instanceof Error ? err.message : String(err)}`);
    }
  };
}
