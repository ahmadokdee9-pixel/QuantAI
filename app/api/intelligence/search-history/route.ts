import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ items: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("search_history")
    .select("id, query, result_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return jsonOk({ items: [], storageError: error.message });
  }

  return jsonOk({ items: data ?? [] });
}
