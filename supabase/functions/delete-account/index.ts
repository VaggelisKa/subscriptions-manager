// Deletes the caller's account. Requires a password/OTP sign-in within the last
// 10 minutes; subscriptions are removed by the ON DELETE CASCADE FK on user_id.
import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders, preflight } from "../_shared/cors.ts";
import { hasRecentSignIn } from "../_shared/recent-auth.ts";
import { isAuthRejection, isGetClaimsThrowRejection } from "./auth-errors.ts";

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

  // The caller is verified with the publishable key (an optional `SB_PUBLISHABLE_KEY` secret, else
  // the platform's SUPABASE_ANON_KEY), so a broken secret key surfaces as delete_failed, not a 401.
  // The `sb_secret_…` key, set with `supabase secrets set SB_SECRET_KEY=…`, is only used for the
  // delete itself. The legacy service_role key is never used here.
  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SB_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SB_SECRET_KEY");
  if (!url || !publishableKey || !secretKey) {
    console.error("delete-account: SUPABASE_URL, SUPABASE_ANON_KEY or SB_SECRET_KEY is not set");
    return json({ code: "delete_failed" }, 500);
  }
  // A rejected token is a 401; an Auth outage (network, 5xx, unexpected throw) is a logged 500.
  const authFailure = (e: unknown, rejected = isAuthRejection(e)) => {
    if (rejected) return json({ code: "unauthorized" }, 401);
    console.error("delete-account: token verification failed", e);
    return json({ code: "delete_failed" }, 500);
  };
  const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const verifier = createClient(url, publishableKey, clientOptions);

  // Parse and verify the token first. Anything malformed or unverifiable is a 401, never a 500.
  let claims: { sub?: string; amr?: unknown };
  try {
    const { data, error } = await verifier.auth.getClaims(jwt); // JWKS for asymmetric keys, Auth otherwise
    if (error) return authFailure(error);
    if (!data?.claims?.sub) return json({ code: "unauthorized" }, 401);
    claims = data.claims;
  } catch (e) {
    return authFailure(e, isGetClaimsThrowRejection(e));
  }

  // Authoritative check: the user still exists and the session is valid.
  let userId: string;
  try {
    const { data, error } = await verifier.auth.getUser(jwt);
    if (error) return authFailure(error);
    const user = data?.user;
    if (!user || user.id !== claims.sub) return json({ code: "unauthorized" }, 401);
    userId = user.id;
  } catch (e) {
    return authFailure(e);
  }

  if (!hasRecentSignIn(claims.amr, Date.now() / 1000)) {
    return json({ code: "reauth_required" }, 401);
  }

  try {
    const admin = createClient(url, secretKey, clientOptions);
    const { error } = await admin.auth.admin.deleteUser(userId);
    // 404: a concurrent request already deleted this user, which is the outcome asked for.
    if (error && error.status !== 404) throw error;
    return json({ success: true }, 200);
  } catch (e) {
    console.error("delete-account failed", e);
    return json({ code: "delete_failed" }, 500);
  }
});
