import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ collections: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("product_collections")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonOk({ collections: [], storageError: error.message });
  }
  return jsonOk({ collections: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonErr(503, "Collections storage is not configured.");
  }

  try {
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim().slice(0, 120) || "Saved";
    const { data, error } = await supabaseAdmin
      .from("product_collections")
      .insert({ user_id: userId, name })
      .select("id, name, created_at")
      .single();

    if (error) {
      return jsonErr(500, error.message);
    }
    return jsonOk({ collection: data });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}
