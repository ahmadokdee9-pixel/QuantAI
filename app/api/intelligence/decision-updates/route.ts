import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { listDecisionUpdatesForUser } from "@/lib/decisionMemory/server";
import { supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return jsonErr(401, "Unauthorized");

  const result = await listDecisionUpdatesForUser(userId);
  return jsonOk({
    items: result.items,
    configured: result.configured && supabaseAdminConfigured,
    ...(result.error ? { storageError: result.error } : {}),
  });
}
