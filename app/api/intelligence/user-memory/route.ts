import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ memory: {} });
  }

  const { data, error } = await supabaseAdmin
    .from("user_shopping_memory")
    .select("memory")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return jsonOk({ memory: {} });
  }

  return jsonOk({
    memory: typeof data.memory === "object" && data.memory !== null ? data.memory : {},
  });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonErr(503, "Database not configured");
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
      return jsonErr(500, error.message);
    }
    return jsonOk({ ok: true, memory: next });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}
