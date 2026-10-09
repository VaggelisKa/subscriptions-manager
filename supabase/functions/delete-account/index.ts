// Deletes the caller's account. Requires a password/OTP sign-in within the last
// 10 minutes; subscriptions are removed by the ON DELETE CASCADE FK on user_id.
import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const RECENT_AUTH_SECONDS = 10 * 60;

type AmrEntry = { method?: unknown; timestamp?: unknown };

/** Latest sign-in time (unix seconds) from the `amr` claim, or 0 if there is none. */
function lastSignInAt(amr: unknown): number {
  if (!Array.isArray(amr)) return 0;
  const timestamps = (amr as AmrEntry[])
    .map((entry) => entry?.timestamp)
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  return Math.max(0, ...timestamps);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const cors = corsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ code: "unauthorized" }, 401);

  // The `sb_secret_…` key, set with `supabase secrets set SB_SECRET_KEY=…`.
  // The legacy service_role key is never used here.
  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SB_SECRET_KEY");
  if (!url || !secretKey) {
    console.error("delete-account: SUPABASE_URL or SB_SECRET_KEY is not set");
    return json({ code: "delete_failed" }, 500);
  }
  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Parse and verify the token first. Anything malformed or unverifiable is a 401, never a 500.
  let claims: { sub?: string; amr?: unknown };
  try {
    const { data, error } = await admin.auth.getClaims(jwt); // JWKS for asymmetric keys, Auth otherwise
    if (error || !data?.claims?.sub) return json({ code: "unauthorized" }, 401);
    claims = data.claims;
  } catch {
    return json({ code: "unauthorized" }, 401);
  }

  try {
    // Authoritative check: the user still exists and the session is valid.
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error || !user || user.id !== claims.sub) return json({ code: "unauthorized" }, 401);

    if (Date.now() / 1000 - lastSignInAt(claims.amr) > RECENT_AUTH_SECONDS) {
      return json({ code: "reauth_required" }, 401);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return json({ success: true }, 200);
  } catch (e) {
    console.error("delete-account failed", e);
    return json({ code: "delete_failed" }, 500);
  }
});
