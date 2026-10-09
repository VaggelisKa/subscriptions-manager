import { PROXY_URL, USERS, type UserKey } from "./env";

/**
 * Tells support/supabase-proxy.mjs to hold (`hold`: the request waits until the rule is
 * removed) or fail (`error`: HTTP 500 in PostgREST's error shape) one user's requests whose
 * path contains `path`. Other users are unaffected, so parallel tests don't see it.
 * Returns a function that removes the rule (held requests then continue).
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
    await fetch(`${PROXY_URL}/__parity/faults?id=${id}`, { method: "DELETE" });
  };
}
