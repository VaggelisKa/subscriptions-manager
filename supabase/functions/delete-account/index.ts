// Deletes the caller's account. Requires a password/OTP sign-in within the last
// 10 minutes; subscriptions are removed by the ON DELETE CASCADE FK on user_id.
import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders, preflight } from "../_shared/cors.ts";
import { hasRecentSignIn } from "../_shared/recent-auth.ts";
import { isAuthRejection } from "./auth-errors.ts";

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
  // A rejected token is a 401; an Auth outage (network, 5xx, unexpected throw) is a logged 500.
  const authFailure = (e: unknown) => {
    if (isAuthRejection(e)) return json({ code: "unauthorized" }, 401);
    console.error("delete-account: token verification failed", e);
    return json({ code: "delete_failed" }, 500);
  };
  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Parse and verify the token first. Anything malformed or unverifiable is a 401, never a 500.
  let claims: { sub?: string; amr?: unknown };
  try {
    const { data, error } = await admin.auth.getClaims(jwt); // JWKS for asymmetric keys, Auth otherwise
    if (error) return authFailure(error);
    if (!data?.claims?.sub) return json({ code: "unauthorized" }, 401);
    claims = data.claims;
  } catch (e) {
    return authFailure(e);
  }

  try {
    // Authoritative check: the user still exists and the session is valid.
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error) return authFailure(error);
    if (!user || user.id !== claims.sub) return json({ code: "unauthorized" }, 401);

    if (!hasRecentSignIn(claims.amr, Date.now() / 1000)) {
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
