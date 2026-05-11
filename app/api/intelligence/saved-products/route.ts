import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SavedProductRow = {
  id?: string;
  product_id?: string | null;
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
  created_at?: string;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ items: [] as SavedProductRow[] });
  }

  const { data, error } = await supabaseAdmin
    .from("saved_products")
    .select("id, product_id, title, price, image, link, ai_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ items: [] as SavedProductRow[], error: error.message });
  }
  return NextResponse.json({ items: (data ?? []) as SavedProductRow[] });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get("link")?.trim();
    if (!link) {
      return NextResponse.json({ error: "Missing link" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("saved_products").delete().eq("user_id", userId).eq("link", link);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
