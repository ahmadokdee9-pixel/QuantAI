import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonErr(503, "Database not configured");
  }

  const { id: collectionId } = await ctx.params;
  if (!collectionId) {
    return jsonErr(400, "Missing collection id");
  }

  const { data: col, error: colErr } = await supabaseAdmin
    .from("product_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (colErr || !col) {
    return jsonErr(404, "Collection not found");
  }

  try {
    const body = (await req.json()) as { product?: Record<string, unknown> };
    if (!body.product || typeof body.product !== "object") {
      return jsonErr(400, "Missing product");
    }

    const { error } = await supabaseAdmin.from("collection_products").insert({
      collection_id: collectionId,
      product: body.product,
    });

    if (error) {
      return jsonErr(500, error.message);
    }
    return jsonOk({ ok: true });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}
