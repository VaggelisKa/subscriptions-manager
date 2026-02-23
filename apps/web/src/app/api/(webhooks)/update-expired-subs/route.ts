import { createClient } from "@supabase/supabase-js";
import { add } from "date-fns";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "No credentials", success: false },
      { status: 401 },
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error, data } = await supabase
    .from("subscriptions")
    .select("billed_at, id, interval")
    .lte("billed_at", new Date().toUTCString());

  if (error) {
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 },
    );
  }

  if (!data?.length) {
    return NextResponse.json(
      { message: "No subscriptions to update", success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache no-store must-revalidate",
        },
      },
    );
  }

  for (let row of data) {
    const { billed_at, id, interval } = row;

    const newDate = add(new Date(billed_at), {
      weeks: interval === "week" ? 1 : 0,
      months: interval === "month" ? 1 : 0,
      years: interval === "year" ? 1 : 0,
    }).toUTCString();

    await supabase
      .from("subscriptions")
      .update({ billed_at: newDate })
      .eq("id", id);
  }

  return NextResponse.json(
    { success: true },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-cache no-store must-revalidate",
      },
    },
  );
}
