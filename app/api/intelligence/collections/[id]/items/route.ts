import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id: collectionId } = await ctx.params;
  if (!collectionId) {
    return NextResponse.json({ error: "Missing collection id" }, { status: 400 });
  }

  const { data: col, error: colErr } = await supabaseAdmin
    .from("product_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (colErr || !col) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as { product?: Record<string, unknown> };
    if (!body.product || typeof body.product !== "object") {
      return NextResponse.json({ error: "Missing product" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("collection_products").insert({
      collection_id: collectionId,
      product: body.product,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
