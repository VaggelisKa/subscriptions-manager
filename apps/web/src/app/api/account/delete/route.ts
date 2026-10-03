import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@subscriptions-manager/shared";

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
