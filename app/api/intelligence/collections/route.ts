import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ collections: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("product_collections")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ collections: [] });
  }
  return NextResponse.json({ collections: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Collections storage is not configured." }, { status: 503 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ collection: data });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
