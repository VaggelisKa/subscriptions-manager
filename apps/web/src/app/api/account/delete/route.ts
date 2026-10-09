// TODO: delete this route together with apps/web in Phase 6 (tracking issue: TODO-ISSUE-LINK).
// Clients delete accounts through the delete-account Edge Function.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@subscriptions-manager/shared";
import { hasRecentSignIn } from "@supabase-functions/_shared/recent-auth";
import { isAuthRejection } from "@supabase-functions/delete-account/auth-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const supabaseAuth = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: authError?.message ?? "Invalid or expired token" },
      { status: 401 },
    );
  }

  // Same rule as the Edge Function: a password/OTP sign-in within the last 10 minutes.
  const { data: claimsData, error: claimsError } =
    await supabaseAuth.auth.getClaims(token);
  if (claimsError && !isAuthRejection(claimsError)) {
    console.error("Failed to read token claims:", claimsError);
    return NextResponse.json(
      { error: "Failed to delete account", code: "delete_failed" },
      { status: 500 },
    );
  }
  const claims = claimsData?.claims;
  if (
    !claims ||
    claims.sub !== user.id ||
    !hasRecentSignIn(claims.amr, Date.now() / 1000)
  ) {
    return NextResponse.json(
      {
        error: "Please sign in again or update the app to delete your account.",
        code: "reauth_required",
      },
      { status: 403 },
    );
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: deleteSubsError } = await supabaseAdmin
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (deleteSubsError) {
    console.error("Failed to delete user subscriptions:", deleteSubsError);
    return NextResponse.json(
      { error: "Failed to delete account data" },
      { status: 500 },
    );
  }

  const { error: deleteUserError } =
    await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    console.error("Failed to delete user:", deleteUserError);
    return NextResponse.json(
      { error: deleteUserError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
