import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export type CompareHistoryRow = {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ items: [] as CompareHistoryRow[], configured: supabaseAdminConfigured });
  }

  const { data, error } = await supabaseAdmin
    .from("compare_sessions")
    .select("id, payload, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    const extras =
      !isBenignStorageSchemaError(error.message) && process.env.NODE_ENV === "development"
        ? { storageError: error.message }
        : {};
    return jsonOk({
      items: [] as CompareHistoryRow[],
      configured: true,
      ...extras,
    });
  }

  return jsonOk({
    items: (data ?? []) as CompareHistoryRow[],
    configured: true,
  });
}
