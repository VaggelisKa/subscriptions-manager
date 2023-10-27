import { createClient } from "@supabase/supabase-js";

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
    .select("*")
    .lte("billed_at", new Date().toISOString());

  console.log(data);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({}, { status: 201 });
}
