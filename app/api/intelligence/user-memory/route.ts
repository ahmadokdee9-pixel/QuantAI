import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ memory: {} });
  }

  const { data, error } = await supabaseAdmin
    .from("user_shopping_memory")
    .select("memory")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ memory: {} });
  }

  return NextResponse.json({
    memory: typeof data.memory === "object" && data.memory !== null ? data.memory : {},
  });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as { memory?: Record<string, unknown> };
    const patch = body.memory && typeof body.memory === "object" ? body.memory : {};

    const { data: row } = await supabaseAdmin
      .from("user_shopping_memory")
      .select("memory")
      .eq("user_id", userId)
      .maybeSingle();

    const prev =
      row && typeof row.memory === "object" && row.memory !== null
        ? (row.memory as Record<string, unknown>)
        : {};

    const next = { ...prev, ...patch, clientUpdatedAt: new Date().toISOString() };

    const { error } = await supabaseAdmin.from("user_shopping_memory").upsert(
      {
        user_id: userId,
        memory: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, memory: next });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
