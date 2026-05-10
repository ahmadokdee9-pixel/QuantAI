import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Foundation route for price-drop / availability alerts (persist when DB tables exist). */

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("shopping_watchlist")
    .select("id, product, target_price, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ items: [] });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Watchlist storage is not configured." }, { status: 503 });
  }

  try {
    const body = (await req.json()) as {
      product?: Record<string, unknown>;
      targetPrice?: number | null;
    };
    if (!body.product || typeof body.product !== "object") {
      return NextResponse.json({ error: "Missing product" }, { status: 400 });
    }
    const link = typeof body.product.link === "string" ? body.product.link : "";
    if (!link) {
      return NextResponse.json({ error: "Product link required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("shopping_watchlist").insert({
      user_id: userId,
      product: body.product,
      target_price: body.targetPrice ?? null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
