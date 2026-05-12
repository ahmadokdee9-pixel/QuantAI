import { auth } from "@clerk/nextjs/server";
import { jsonErr, jsonOk } from "@/lib/api/jsonResponse";
import { isBenignStorageSchemaError } from "@/lib/supabase/benignStorageError";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonOk({ memory: {}, configured: supabaseAdminConfigured });
  }

  const { data, error } = await supabaseAdmin
    .from("user_shopping_memory")
    .select("memory")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return jsonOk({ memory: {}, configured: true });
  }

  return jsonOk({
    memory: typeof data.memory === "object" && data.memory !== null ? data.memory : {},
    configured: true,
  });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return jsonErr(401, "Unauthorized");
  }
  if (!supabaseAdmin) {
    return jsonErr(503, "Database not configured", { code: "STORAGE_UNAVAILABLE" });
  }

  try {
    const body = (await req.json()) as { memory?: Record<string, unknown> };
    const patch = body.memory && typeof body.memory === "object" ? body.memory : {};

    const { data: row, error: readErr } = await supabaseAdmin
      .from("user_shopping_memory")
      .select("memory")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      if (isBenignStorageSchemaError(readErr.message)) {
        return jsonErr(503, "User memory storage is not available.", {
          code: "STORAGE_UNAVAILABLE",
        });
      }
      return jsonErr(500, readErr.message);
    }

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
      if (isBenignStorageSchemaError(error.message)) {
        return jsonErr(503, "User memory storage is not available.", {
          code: "STORAGE_UNAVAILABLE",
        });
      }
      return jsonErr(500, error.message);
    }
    return jsonOk({ ok: true, memory: next });
  } catch {
    return jsonErr(400, "Invalid JSON");
  }
}
