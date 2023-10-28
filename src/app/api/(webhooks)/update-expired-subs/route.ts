import { createClient } from "@supabase/supabase-js";
import { add } from "date-fns";

export async function PUT() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: "No credentials" }, { status: 401 });
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
    .lte("billed_at", new Date().toISOString());

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return Response.json(
      { message: "No subscriptions to update" },
      { status: 200 },
    );
  }

  for (let row of data) {
    const { billed_at, id, interval } = row;

    const newDate = add(new Date(billed_at), {
      weeks: interval === "week" ? 1 : 0,
      months: interval === "month" ? 1 : 0,
      years: interval === "year" ? 1 : 0,
    }).toISOString();

    await supabase
      .from("subscriptions")
      .update({ billed_at: newDate })
      .eq("id", id);
  }

  return Response.json({}, { status: 201 });
}
