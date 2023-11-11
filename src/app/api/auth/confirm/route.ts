import { getSupabaseServerClient } from "@/lib/supabase-server";
import { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const supabase = getSupabaseServerClient(cookies());

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(new URL(`/${next.slice(1)}`, req.url));
    }
  }

  return NextResponse.redirect(new URL("/login", req.url));
}
